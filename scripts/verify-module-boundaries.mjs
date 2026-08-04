import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const BOOTSTRAP_ENTRY = resolve("src/bootstrap/index.ts");

try {
  const options = parseArguments(process.argv.slice(2));
  const metafile = options.metafile === undefined
    ? await buildMetafile()
    : JSON.parse(await readFile(resolvePath(options.metafile), "utf8"));
  const graph = readGraph(metafile);
  const issues = [
    ...findBoundaryViolations(graph),
    ...findCycles(graph),
    ...findBootstrapViolations(metafile, options.bootstrapOnly),
  ];

  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue.code}: ${issue.detail}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`MODULE_BOUNDARIES_OK ${graph.size} modules\n`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`MODULE_BOUNDARIES_FATAL: ${message}\n`);
  process.exitCode = 1;
}

async function buildMetafile() {
  const result = await build({
    bundle: true,
    entryPoints: [BOOTSTRAP_ENTRY],
    format: "iife",
    metafile: true,
    minify: false,
    platform: "browser",
    sourcemap: false,
    target: "es2022",
    treeShaking: false,
    write: false,
  });
  return result.metafile;
}

function parseArguments(arguments_) {
  const options = { bootstrapOnly: false, metafile: undefined };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--bootstrap-only") {
      options.bootstrapOnly = true;
      continue;
    }
    if (argument === "--metafile") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("MODULE_BOUNDARIES_USAGE_INVALID missing --metafile value");
      }
      options.metafile = value;
      index += 1;
      continue;
    }
    throw new Error(`MODULE_BOUNDARIES_USAGE_INVALID unknown argument ${argument}`);
  }
  return options;
}

function readGraph(metafile) {
  if (!isRecord(metafile) || !isRecord(metafile.inputs)) {
    throw new Error("MODULE_METAFILE_INVALID inputs must be an object");
  }

  const sourceInputs = Object.keys(metafile.inputs)
    .map(normalizeGraphPath)
    .filter((inputPath) => inputPath.startsWith("src/"));
  const sourceSet = new Set(sourceInputs);
  const graph = new Map(sourceInputs.sort().map((inputPath) => [inputPath, []]));

  for (const [rawInputPath, input] of Object.entries(metafile.inputs)) {
    const inputPath = normalizeGraphPath(rawInputPath);
    if (!sourceSet.has(inputPath)) continue;
    if (!isRecord(input) || !Array.isArray(input.imports)) {
      throw new Error(`MODULE_METAFILE_INVALID imports missing for ${inputPath}`);
    }
    const dependencies = [];
    for (const imported of input.imports) {
      if (!isRecord(imported) || typeof imported.path !== "string") {
        throw new Error(`MODULE_METAFILE_INVALID import missing path for ${inputPath}`);
      }
      if (imported.external === true) continue;
      const target = normalizeGraphPath(imported.path);
      if (sourceSet.has(target)) dependencies.push(target);
    }
    graph.set(inputPath, [...new Set(dependencies)].sort());
  }

  return graph;
}

function findBoundaryViolations(graph) {
  const issues = [];
  for (const [source, targets] of graph) {
    const sourceLayer = classifyLayer(source);
    for (const target of targets) {
      const targetLayer = classifyLayer(target);
      if (!isAllowedEdge(sourceLayer, targetLayer)) {
        issues.push({
          code: "MODULE_BOUNDARY_FORBIDDEN_IMPORT",
          detail: `${source} (${sourceLayer}) -> ${target} (${targetLayer})`,
        });
      }
    }
  }
  return issues;
}

function classifyLayer(filePath) {
  const segments = filePath.split("/");
  if (segments[0] !== "src" || segments.length < 2) return "unknown";
  if (segments[1] === "contracts") return `contracts/${segments[2] ?? "unknown"}`;
  if (segments[1] === "domain") return `domain/${segments[2] ?? "unknown"}`;
  if (segments[1] === "application" && segments[2] === "mappers") {
    return "application/mappers";
  }
  if (segments[1] === "application" && segments[2] === "view-models") {
    return "application/view-models";
  }
  return segments[1];
}

function isAllowedEdge(source, target) {
  if (source === "bootstrap") return target !== "unknown";
  if (source === target) return source !== "domain/engines";

  const contracts = new Set([
    "contracts/core",
    "contracts/plugins",
    "contracts/runtime",
    "contracts/storage",
  ]);
  const allowed = {
    "contracts/core": new Set(),
    "contracts/storage": new Set(["contracts/core"]),
    "contracts/runtime": new Set(["contracts/core"]),
    "contracts/plugins": new Set(["contracts/core"]),
    core: contracts,
    "domain/contracts": new Set(["contracts/core"]),
    "domain/entities": new Set(["contracts/core", "domain/contracts"]),
    "domain/engines": new Set(["contracts/core", "domain/contracts", "domain/entities"]),
    application: new Set([...contracts, "domain/contracts", "domain/entities"]),
    "application/mappers": new Set(["contracts/storage", "domain/entities"]),
    "application/view-models": new Set(["contracts/core", "domain/contracts", "domain/entities"]),
    infrastructure: new Set(["contracts/storage", "contracts/runtime", "contracts/core"]),
    plugins: new Set(["contracts/core", "contracts/plugins"]),
    profiles: new Set(["contracts/core"]),
    renderers: new Set(["contracts/core"]),
    diagnostics: new Set(["contracts/core"]),
    ui: new Set(["contracts/core", "application/view-models"]),
  };
  return allowed[source]?.has(target) ?? false;
}

function findCycles(graph) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = new Set();

  function visit(node) {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      cycles.add(canonicalCycle([...stack.slice(start), node]));
      return;
    }
    if (visited.has(node)) return;

    active.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    active.delete(node);
    visited.add(node);
  }

  for (const node of [...graph.keys()].sort()) visit(node);
  return [...cycles]
    .sort()
    .map((cycle) => ({ code: "MODULE_CYCLE_DETECTED", detail: cycle }));
}

function canonicalCycle(cycle) {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)]);
  rotations.sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  return [...rotations[0], rotations[0][0]].join(" -> ");
}

function findBootstrapViolations(metafile, bootstrapOnly) {
  if (!bootstrapOnly || !isRecord(metafile.outputs)) return [];
  const entryPoints = Object.values(metafile.outputs)
    .filter(isRecord)
    .map((output) => output.entryPoint)
    .filter((entryPoint) => typeof entryPoint === "string")
    .map(normalizeGraphPath);
  const invalid = entryPoints.filter((entryPoint) => !entryPoint.startsWith("src/bootstrap/"));
  return invalid.map((entryPoint) => ({
    code: "MODULE_COMPOSITION_ROOT_INVALID",
    detail: entryPoint,
  }));
}

function normalizeGraphPath(filePath) {
  if (isAbsolute(filePath)) {
    return relative(resolve(), filePath).split(sep).join("/");
  }
  return filePath.split("\\").join("/").replace(/^\.\//, "");
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(filePath);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
