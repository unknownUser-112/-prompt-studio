import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, normalize, resolve } from "node:path";

const V600_APP_VERSION = "V600.0.0-Phase1-Foundation";
const V600_ARTIFACT = "dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html";
const BASELINE_ARTIFACT =
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html";
const BASELINE_REPORT = "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json";
const BASELINE_CODES = [
  "REFERENCE_VERSION_METADATA_STALE",
  "REFERENCE_EXPORT_FILENAME_STALE",
  "REFERENCE_DUPLICATE_RENDERED_IDS",
  "REFERENCE_REAL_MOBILE_COVERAGE_MISSING",
];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const OPEN_MARKER_PATTERN = /\b(?:FIXME|HACK|TODO|XXX)\b/g;

const options = parseArguments(process.argv.slice(2));

try {
  if (options.baseline) {
    await verifyBaseline();
  } else {
    await verifyV600(options);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`SOURCE_INTEGRITY_FATAL: ${message}\n`);
  process.exitCode = 1;
}

async function verifyBaseline() {
  const [artifact, report] = await Promise.all([
    readFile(resolve(BASELINE_ARTIFACT), "utf8"),
    readJson(BASELINE_REPORT),
  ]);
  const detected = new Map();

  if (/Prompt Studio V500\.6\.10\b/.test(artifact)) {
    detected.set(
      "REFERENCE_VERSION_METADATA_STALE",
      "visible V500.6.10 metadata remains in the V500.6.11 HTML",
    );
  }
  if (
    reportCheckIsFalse(report, "exportFilename") &&
    /prompt-studio-v500-6-10[^"']*\.json/i.test(artifact)
  ) {
    detected.set(
      "REFERENCE_EXPORT_FILENAME_STALE",
      "the approved report and source identify a V500.6.10 export filename",
    );
  }
  if (
    reportCheckIsFalse(report, "noDuplicateStaticIds") &&
    findDuplicateIds(artifact).length > 0
  ) {
    detected.set(
      "REFERENCE_DUPLICATE_RENDERED_IDS",
      "the approved report and source identify repeated rendered IDs",
    );
  }
  if (!hasRealMobileCoverage(report)) {
    detected.set(
      "REFERENCE_REAL_MOBILE_COVERAGE_MISSING",
      "the approved report states that a real iPhone HTML Viewer interaction was not executed",
    );
  }

  const missing = BASELINE_CODES.filter((code) => !detected.has(code));
  const unexpected = [...detected.keys()].filter((code) => !BASELINE_CODES.includes(code));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `REFERENCE_DEBT_SET_MISMATCH missing=[${missing.join(",")}] unexpected=[${unexpected.join(",")}]`,
    );
  }

  for (const code of BASELINE_CODES) {
    process.stdout.write(`KNOWN_REFERENCE_DEBT ${code}: ${detected.get(code)}\n`);
  }
  process.stdout.write(`SOURCE_INTEGRITY_BASELINE_OK ${detected.size} approved debts\n`);
}

async function verifyV600(configuration) {
  const artifactPath = configuration.artifact ?? V600_ARTIFACT;
  const sourceRoot = configuration.sourceRoot ?? "src";
  const artifact = await readFile(resolvePath(artifactPath), "utf8");
  const issues = [];
  const metadata = readBuildMetadata(artifact);

  if (
    metadata === null ||
    metadata.appVersion !== V600_APP_VERSION ||
    /Prompt Studio V500\.6\.10\b/.test(artifact)
  ) {
    issues.push({
      code: "V600_VERSION_METADATA_STALE",
      detail: `expected build metadata appVersion ${V600_APP_VERSION}`,
    });
  }

  const staleExportNames = findExportFilenames(artifact).filter((fileName) =>
    /v500(?:[.-]|$)|v500-/i.test(fileName),
  );
  if (staleExportNames.length > 0) {
    issues.push({
      code: "V600_EXPORT_FILENAME_STALE",
      detail: staleExportNames.join(", "),
    });
  }

  const duplicateIds = findDuplicateIds(artifact);
  if (duplicateIds.length > 0) {
    issues.push({
      code: "V600_DUPLICATE_RENDERED_IDS",
      detail: duplicateIds.join(", "),
    });
  }

  if (basename(artifactPath) !== "Prompt-Studio-V600.0.0-Phase1-Foundation.html") {
    issues.push({
      code: "V600_ARTIFACT_FILENAME_INVALID",
      detail: basename(artifactPath),
    });
  }

  const report = configuration.report === undefined
    ? null
    : await readJson(configuration.report);
  if (report === null || !hasRealMobileCoverage(report)) {
    issues.push({
      code: "V600_REAL_MOBILE_COVERAGE_MISSING",
      detail: "a positive real iPhone HTML Viewer execution result is required",
    });
  }

  const sourceFiles = await listSourceFiles(resolvePath(sourceRoot));
  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    const markers = [...source.matchAll(OPEN_MARKER_PATTERN)].map((match) => match[0]);
    if (markers.length > 0) {
      issues.push({
        code: "V600_OPEN_MARKER",
        detail: `${displayPath(sourceFile)}: ${[...new Set(markers)].join(", ")}`,
      });
    }
  }

  for (const unusedExport of await findUnusedExports(sourceFiles)) {
    issues.push({ code: "V600_UNUSED_EXPORT", detail: unusedExport });
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      process.stderr.write(`${issue.code}: ${issue.detail}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`SOURCE_INTEGRITY_OK ${displayPath(resolvePath(artifactPath))}\n`);
}

function parseArguments(arguments_) {
  const configuration = {
    artifact: undefined,
    baseline: false,
    report: undefined,
    sourceRoot: undefined,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--baseline") {
      configuration.baseline = true;
      continue;
    }
    if (argument === "--artifact" || argument === "--report" || argument === "--source-root") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`SOURCE_INTEGRITY_USAGE_INVALID missing value for ${argument}`);
      }
      index += 1;
      if (argument === "--artifact") configuration.artifact = value;
      if (argument === "--report") configuration.report = value;
      if (argument === "--source-root") configuration.sourceRoot = value;
      continue;
    }
    throw new Error(`SOURCE_INTEGRITY_USAGE_INVALID unknown argument ${argument}`);
  }

  if (
    configuration.baseline &&
    (configuration.artifact !== undefined ||
      configuration.report !== undefined ||
      configuration.sourceRoot !== undefined)
  ) {
    throw new Error("SOURCE_INTEGRITY_USAGE_INVALID --baseline cannot be combined with paths");
  }

  return configuration;
}

function readBuildMetadata(artifact) {
  const match = artifact.match(
    /<script\b(?=[^>]*\bid=["']prompt-studio-build-metadata["'])[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (match === null || match[1] === undefined) return null;

  try {
    const value = JSON.parse(match[1]);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function findExportFilenames(artifact) {
  return [
    ...artifact.matchAll(
      /(?:\bdownload|\bfileName|\bfilename)\s*(?:=|:)\s*["']([^"']+)["']/gi,
    ),
  ]
    .map((match) => match[1])
    .filter((value) => value !== undefined);
}

function findDuplicateIds(artifact) {
  const counts = new Map();
  for (const match of artifact.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    if (id !== undefined) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
}

function reportCheckIsFalse(report, checkName) {
  return (
    isRecord(report) &&
    isRecord(report.staticIntegrity) &&
    isRecord(report.staticIntegrity.checks) &&
    report.staticIntegrity.checks[checkName] === false
  );
}

function hasRealMobileCoverage(report) {
  const strings = collectStrings(report);
  return strings.some(
    (value) =>
      /real iPhone HTML Viewer interaction was executed/i.test(value) &&
      !/was not executed/i.test(value),
  );
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

async function listSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const entryPath = join(root, entry.name);
        if (entry.isDirectory()) return listSourceFiles(entryPath);
        return entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)) ? [entryPath] : [];
      }),
  );
  return nested.flat();
}

async function findUnusedExports(sourceFiles) {
  const modules = new Map();

  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    modules.set(normalize(sourceFile), {
      exports: collectExports(source),
      imports: collectImports(source, sourceFile, sourceFiles),
    });
  }

  const used = new Map();
  for (const module of modules.values()) {
    for (const imported of module.imports) {
      const names = used.get(imported.target) ?? new Set();
      for (const name of imported.names) names.add(name);
      used.set(imported.target, names);
    }
  }

  const unused = [];
  for (const [sourceFile, module] of modules) {
    const usedNames = used.get(sourceFile) ?? new Set();
    for (const exportedName of module.exports) {
      if (!usedNames.has("*") && !usedNames.has(exportedName)) {
        unused.push(`${displayPath(sourceFile)}#${exportedName}`);
      }
    }
  }
  return unused.sort();
}

function collectExports(source) {
  const exported = new Set();
  for (const match of source.matchAll(
    /^\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
  )) {
    if (match[1] !== undefined) exported.add(match[1]);
  }
  if (/^\s*export\s+default\b/gm.test(source)) exported.add("default");
  for (const match of source.matchAll(/^\s*export\s*\{([^}]+)\}/gm)) {
    const clause = match[1];
    if (clause === undefined) continue;
    for (const specifier of clause.split(",")) {
      const normalizedSpecifier = specifier.trim().replace(/^type\s+/, "");
      if (normalizedSpecifier.length === 0) continue;
      const parts = normalizedSpecifier.split(/\s+as\s+/i);
      const exportedName = parts.at(-1)?.trim();
      if (exportedName !== undefined && /^[A-Za-z_$][\w$]*$/.test(exportedName)) {
        exported.add(exportedName);
      }
    }
  }
  return exported;
}

function collectImports(source, sourceFilePath, sourceFiles) {
  const imports = [];
  for (const match of source.matchAll(
    /^\s*import\s+(?:type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/gm,
  )) {
    const clause = match[1];
    const moduleSpecifier = match[2];
    if (clause === undefined || moduleSpecifier === undefined) continue;
    const target = resolveModule(sourceFilePath, moduleSpecifier, sourceFiles);
    if (target === null) continue;
    imports.push({ target, names: importedNames(clause) });
  }
  for (const match of source.matchAll(
    /^\s*export\s+(\*|\{[^}]+\})\s+from\s+["']([^"']+)["']/gm,
  )) {
    const clause = match[1];
    const moduleSpecifier = match[2];
    if (clause === undefined || moduleSpecifier === undefined) continue;
    const target = resolveModule(sourceFilePath, moduleSpecifier, sourceFiles);
    if (target === null) continue;
    imports.push({ target, names: clause === "*" ? new Set(["*"]) : importedNames(clause) });
  }
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    const moduleSpecifier = match[1];
    if (moduleSpecifier === undefined) continue;
    const target = resolveModule(sourceFilePath, moduleSpecifier, sourceFiles);
    if (target !== null) imports.push({ target, names: new Set(["*"]) });
  }
  return imports;
}

function importedNames(clause) {
  const names = new Set();
  const trimmed = clause.trim();
  if (/^\*\s+as\s+/.test(trimmed)) names.add("*");
  const namedMatch = trimmed.match(/\{([^}]+)\}/);
  if (namedMatch?.[1] !== undefined) {
    for (const specifier of namedMatch[1].split(",")) {
      const normalizedSpecifier = specifier.trim().replace(/^type\s+/, "");
      const importedName = normalizedSpecifier.split(/\s+as\s+/i)[0]?.trim();
      if (importedName !== undefined && /^[A-Za-z_$][\w$]*$/.test(importedName)) {
        names.add(importedName);
      }
    }
  }
  const defaultCandidate = trimmed.split(",", 1)[0]?.trim();
  if (
    defaultCandidate !== undefined &&
    /^[A-Za-z_$][\w$]*$/.test(defaultCandidate) &&
    !defaultCandidate.startsWith("{")
  ) {
    names.add("default");
  }
  return names;
}

function resolveModule(sourceFilePath, moduleSpecifier, sourceFiles) {
  if (!moduleSpecifier.startsWith(".")) return null;
  const base = resolve(dirname(sourceFilePath), moduleSpecifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  const sourceSet = new Set(sourceFiles.map((file) => normalize(file)));
  return candidates.map(normalize).find((candidate) => sourceSet.has(candidate)) ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(resolvePath(filePath), "utf8"));
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(filePath);
}

function displayPath(filePath) {
  const absolute = resolvePath(filePath);
  const relative = normalize(absolute).slice(`${normalize(resolve())}/`.length);
  return relative.startsWith("..") ? absolute : relative;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
