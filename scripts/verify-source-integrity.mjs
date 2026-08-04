import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import {
  createScanner,
  LanguageVariant,
  ModifierFlags,
  SyntaxKind,
} from "typescript/unstable/ast";
import { API as TypeScriptApi } from "typescript/unstable/sync";

const V600_APP_VERSION = "V600.0.0-Phase1-Foundation";
const V600_DATABASE_SCHEMA_VERSION = 1;
const V600_PLUGIN_API_VERSION = 1;
const V600_ARTIFACT = "dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html";
const V600_IPHONE_EVIDENCE = "docs/reports/phase1-iphone-viewer.md";
const BASELINE_ARTIFACT =
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html";
const BASELINE_REPORT = "reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json";
const BASELINE_CODES = [
  "REFERENCE_VERSION_METADATA_STALE",
  "REFERENCE_EXPORT_FILENAME_STALE",
  "REFERENCE_DUPLICATE_RENDERED_IDS",
  "REFERENCE_REAL_MOBILE_COVERAGE_MISSING",
];
const BASELINE_DUPLICATE_IDS = ["copy", "prompt"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const OPEN_MARKER_PATTERN = /\b(?:FIXME|HACK|TODO|XXX)\b/g;

try {
  const options = parseArguments(process.argv.slice(2));
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
  const duplicateIds = findDuplicateIds(artifact);

  if (JSON.stringify(duplicateIds) !== JSON.stringify(BASELINE_DUPLICATE_IDS)) {
    throw new Error(
      `REFERENCE_DEBT_ID_SET_MISMATCH expected=[${BASELINE_DUPLICATE_IDS.join(",")}] actual=[${duplicateIds.join(",")}]`,
    );
  }

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
    duplicateIds.length > 0
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
  const evidencePath = configuration.report ??
    (configuration.release ? V600_IPHONE_EVIDENCE : undefined);
  const artifact = await readFile(resolvePath(artifactPath), "utf8");
  const issues = [];
  const metadata = readBuildMetadata(artifact);

  if (metadata === null || metadata.appVersion !== V600_APP_VERSION) {
    issues.push({
      code: "V600_VERSION_METADATA_STALE",
      detail: `expected build metadata appVersion ${V600_APP_VERSION}`,
    });
  }
  if (metadata === null || metadata.databaseSchemaVersion !== V600_DATABASE_SCHEMA_VERSION) {
    issues.push({
      code: "V600_DATABASE_SCHEMA_VERSION_INVALID",
      detail: `expected build metadata databaseSchemaVersion ${V600_DATABASE_SCHEMA_VERSION}`,
    });
  }
  if (metadata === null || metadata.pluginApiVersion !== V600_PLUGIN_API_VERSION) {
    issues.push({
      code: "V600_PLUGIN_API_VERSION_INVALID",
      detail: `expected build metadata pluginApiVersion ${V600_PLUGIN_API_VERSION}`,
    });
  }
  if (/\bV500(?:\.\d+)+(?:[-\w]*)?/i.test(readVisibleText(artifact))) {
    issues.push({
      code: "V600_VERSION_METADATA_STALE",
      detail: "visible V500 version text is forbidden",
    });
  }
  const staleDomSinkValues = findStaticVisibleScriptValues(artifact).filter((value) =>
    /\bPrompt Studio V500(?:\.\d+)+\b/i.test(value),
  );
  if (staleDomSinkValues.length > 0) {
    issues.push({
      code: "V600_VERSION_METADATA_STALE",
      detail: "a visible DOM sink contains static Prompt Studio V500 version text",
    });
  }

  const invalidExportNames = findExportFilenames(artifact).filter(
    (fileName) => !/^prompt-studio-v600(?:-[a-z0-9]+)*\.json$/.test(fileName),
  );
  if (invalidExportNames.length > 0) {
    issues.push({
      code: "V600_EXPORT_FILENAME_INVALID",
      detail: invalidExportNames.join(", "),
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

  if (evidencePath === undefined) {
    issues.push({
      code: "V600_IPHONE_EVIDENCE_INVALID",
      detail: "iPhone evidence path is required",
    });
  } else {
    try {
      const evidence = await readFile(resolvePath(evidencePath), "utf8");
      for (const detail of validateIphoneEvidence(evidence)) {
        issues.push({ code: "V600_IPHONE_EVIDENCE_INVALID", detail });
      }
    } catch {
      issues.push({
        code: "V600_IPHONE_EVIDENCE_INVALID",
        detail: `cannot read ${evidencePath}`,
      });
    }
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

  const successCode = configuration.release
    ? "SOURCE_INTEGRITY_RELEASE_OK"
    : "SOURCE_INTEGRITY_OK";
  process.stdout.write(`${successCode} ${displayPath(resolvePath(artifactPath))}\n`);
}

function parseArguments(arguments_) {
  const configuration = {
    artifact: undefined,
    baseline: false,
    release: false,
    report: undefined,
    sourceRoot: undefined,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--baseline") {
      configuration.baseline = true;
      continue;
    }
    if (argument === "--release") {
      configuration.release = true;
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

  const hasPathOverride =
    configuration.artifact !== undefined ||
    configuration.report !== undefined ||
    configuration.sourceRoot !== undefined;
  if (configuration.release && (configuration.baseline || hasPathOverride)) {
    throw new Error("SOURCE_INTEGRITY_USAGE_INVALID --release is exclusive");
  }
  if (configuration.baseline && hasPathOverride) {
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
  const fileNames = [];
  for (const scriptMatch of artifact.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = scriptMatch[1];
    if (script === undefined) continue;
    const tokens = scanScript(script);
    const bindings = collectStaticBindings(tokens);

    for (const [name] of bindings) {
      if (!isDocumentedExportName(name)) continue;
      const value = resolveStaticBinding(name, bindings);
      if (value !== null) fileNames.push(value);
    }

    for (let index = 0; index < tokens.length; index += 1) {
      if (
        tokens[index]?.kind === SyntaxKind.Identifier &&
        tokens[index]?.value === "download" &&
        tokens[index - 1]?.kind === SyntaxKind.DotToken &&
        tokens[index + 1]?.kind === SyntaxKind.EqualsToken
      ) {
        const value = resolveStaticToken(tokens[index + 2], bindings);
        if (value !== null) fileNames.push(value);
        continue;
      }
      if (
        tokens[index]?.kind === SyntaxKind.StringLiteral &&
        tokens[index]?.value.toLowerCase() === "download" &&
        tokens[index - 1]?.kind === SyntaxKind.OpenBracketToken &&
        tokens[index + 1]?.kind === SyntaxKind.CloseBracketToken &&
        tokens[index + 2]?.kind === SyntaxKind.EqualsToken
      ) {
        const value = resolveStaticToken(tokens[index + 3], bindings);
        if (value !== null) fileNames.push(value);
        continue;
      }
      if (
        tokens[index]?.kind === SyntaxKind.Identifier &&
        tokens[index]?.value === "setAttribute" &&
        tokens[index - 1]?.kind === SyntaxKind.DotToken &&
        tokens[index + 1]?.kind === SyntaxKind.OpenParenToken &&
        tokens[index + 2]?.kind === SyntaxKind.StringLiteral &&
        tokens[index + 2]?.value.toLowerCase() === "download" &&
        tokens[index + 3]?.kind === SyntaxKind.CommaToken
      ) {
        const value = resolveStaticToken(tokens[index + 4], bindings);
        if (value !== null) fileNames.push(value);
      }
    }
  }
  return [...new Set(fileNames)];
}

function scanScript(script) {
  const scanner = createScanner(true, LanguageVariant.Standard, script);
  const tokens = [];
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    tokens.push({ kind, value: scanner.getTokenValue() });
  }
  return tokens;
}

function collectStaticBindings(tokens) {
  const bindings = new Map();
  for (let index = 0; index < tokens.length - 3; index += 1) {
    if (
      tokens[index]?.kind !== SyntaxKind.ConstKeyword ||
      tokens[index + 1]?.kind !== SyntaxKind.Identifier ||
      tokens[index + 2]?.kind !== SyntaxKind.EqualsToken
    ) {
      continue;
    }
    const value = tokens[index + 3];
    if (isStaticStringToken(value) || value?.kind === SyntaxKind.Identifier) {
      bindings.set(tokens[index + 1].value, value);
    }
  }
  return bindings;
}

function resolveStaticToken(token, bindings, visited = new Set()) {
  if (isStaticStringToken(token)) return token.value;
  if (token?.kind !== SyntaxKind.Identifier) return null;
  return resolveStaticBinding(token.value, bindings, visited);
}

function resolveStaticBinding(name, bindings, visited = new Set()) {
  if (visited.has(name)) return null;
  const value = bindings.get(name);
  if (value === undefined) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(name);
  return resolveStaticToken(value, bindings, nextVisited);
}

function isDocumentedExportName(name) {
  return /^(?:export|download)(?:_?file)?_?name$/i.test(name);
}

function isStaticStringToken(token) {
  return (
    token?.kind === SyntaxKind.StringLiteral ||
    token?.kind === SyntaxKind.NoSubstitutionTemplateLiteral
  );
}

function findStaticVisibleScriptValues(artifact) {
  const values = [];
  const propertySinks = new Set(["innerHTML", "innerText", "textContent"]);
  for (const scriptMatch of artifact.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = scriptMatch[1];
    if (script === undefined) continue;
    const tokens = scanScript(script);
    const bindings = collectStaticBindings(tokens);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (
        token?.kind === SyntaxKind.Identifier &&
        propertySinks.has(token.value) &&
        tokens[index - 1]?.kind === SyntaxKind.DotToken &&
        tokens[index + 1]?.kind === SyntaxKind.EqualsToken
      ) {
        const value = resolveStaticToken(tokens[index + 2], bindings);
        if (value !== null) values.push(value);
        continue;
      }
      if (
        token?.kind === SyntaxKind.Identifier &&
        token.value === "insertAdjacentHTML" &&
        tokens[index - 1]?.kind === SyntaxKind.DotToken &&
        tokens[index + 1]?.kind === SyntaxKind.OpenParenToken &&
        isStaticStringToken(tokens[index + 2]) &&
        tokens[index + 3]?.kind === SyntaxKind.CommaToken
      ) {
        const value = resolveStaticToken(tokens[index + 4], bindings);
        if (value !== null) values.push(value);
        continue;
      }
      if (
        token?.kind === SyntaxKind.Identifier &&
        (token.value === "write" || token.value === "writeln") &&
        tokens[index - 1]?.kind === SyntaxKind.DotToken &&
        tokens[index - 2]?.kind === SyntaxKind.Identifier &&
        tokens[index - 2]?.value === "document" &&
        tokens[index + 1]?.kind === SyntaxKind.OpenParenToken
      ) {
        const value = resolveStaticToken(tokens[index + 2], bindings);
        if (value !== null) values.push(value);
      }
    }
  }
  return values;
}

function readVisibleText(artifact) {
  return artifact
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

function validateIphoneEvidence(evidence) {
  const issues = [];
  const requiredHeadings = [
    "# Phase 1 iPhone Viewer Verification",
    "## Environment Results",
    "## Interaction Results",
    "## Screenshot Evidence",
  ];
  for (const heading of requiredHeadings) {
    if (countExactLines(evidence, heading) !== 1) issues.push(`missing unique heading: ${heading}`);
  }

  const status = readUniqueField(evidence, "Status", issues);
  const deviceModel = readUniqueField(evidence, "Device Model", issues);
  const iosVersion = readUniqueField(evidence, "iOS Version", issues);
  const viewerName = readUniqueField(evidence, "HTML Viewer Name", issues);
  const viewerVersion = readUniqueField(evidence, "HTML Viewer Version", issues);

  if (status !== null && status !== "PASS") issues.push("Status must equal PASS");
  if (
    deviceModel !== null &&
    !/^iPhone (?!Simulator\b|Unknown\b|Test\b|N\/A\b)[A-Za-z0-9][A-Za-z0-9 .+()/-]{1,60}$/i
      .test(deviceModel)
  ) {
    issues.push("Device Model must identify a physical iPhone model");
  }
  if (iosVersion !== null && !/^\d{1,2}(?:\.\d{1,2}){1,2}$/.test(iosVersion)) {
    issues.push("iOS Version must be a dotted numeric version");
  }
  if (
    viewerName !== null &&
    !/^(?!Unknown$|Test$|Viewer$|HTML Viewer$)[A-Za-z0-9][A-Za-z0-9 .+()/-]{2,80}$/i
      .test(viewerName)
  ) {
    issues.push("HTML Viewer Name must name the installed viewer");
  }
  if (viewerVersion !== null && !/^\d+(?:\.[0-9A-Za-z-]+)+$/.test(viewerVersion)) {
    issues.push("HTML Viewer Version must be a dotted version");
  }

  const passChecks = [
    "Safari",
    "HTML Viewer",
    "App Start",
    "Wizard Steps 1-10",
    "New Project Dialog",
    "Profiles",
    "Prompt Output",
    "Import",
    "Export",
    "Focus After Dialog Close",
  ];
  for (const check of passChecks) {
    if (countExactLines(evidence, `- ${check}: PASS`) !== 1) {
      issues.push(`${check} must have exactly one PASS result`);
    }
  }

  const screenshotHashes = [];
  for (const label of ["Safari", "HTML Viewer"]) {
    const screenshotHash = validateEmbeddedScreenshot(evidence, label, issues);
    if (screenshotHash !== null) screenshotHashes.push(screenshotHash);
  }
  if (screenshotHashes.length === 2 && screenshotHashes[0] === screenshotHashes[1]) {
    issues.push("Safari and HTML Viewer screenshot payloads must be different");
  }
  return issues;
}

function validateEmbeddedScreenshot(evidence, label, issues) {
  const escapedLabel = escapeRegExp(label);
  const pattern = new RegExp(
    `^- ${escapedLabel}: !\\[[^\\]\\n]+\\]\\(data:image\\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})\\)$`,
    "gim",
  );
  const matches = [...evidence.matchAll(pattern)];
  if (matches.length !== 1 || matches[0]?.[1] === undefined || matches[0]?.[2] === undefined) {
    issues.push(`${label} screenshot must be exactly one embedded image data URI`);
    return null;
  }

  const mimeSubtype = matches[0][1].toLowerCase();
  const payload = matches[0][2];
  if (payload.length % 4 !== 0) {
    issues.push(`${label} screenshot must contain strict base64 data`);
    return null;
  }
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length < 16 || bytes.toString("base64") !== payload) {
    issues.push(`${label} screenshot must contain non-empty strict base64 data`);
    return null;
  }
  if (!hasImageMagicBytes(bytes, mimeSubtype)) {
    issues.push(`${label} screenshot MIME type does not match its magic bytes`);
    return null;
  }
  return createHash("sha256").update(bytes).digest("hex");
}

function hasImageMagicBytes(bytes, mimeSubtype) {
  if (mimeSubtype === "png") {
    return (
      bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
      bytes.subarray(12, 16).toString("ascii") === "IHDR"
    );
  }
  if (mimeSubtype === "jpeg") {
    return (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9
    );
  }
  return (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function readUniqueField(evidence, label, issues) {
  const pattern = new RegExp(`^${escapeRegExp(label)}: (.+)$`, "gm");
  const matches = [...evidence.matchAll(pattern)];
  if (matches.length !== 1 || matches[0]?.[1] === undefined) {
    issues.push(`${label} must occur exactly once`);
    return null;
  }
  return matches[0][1].trim();
}

function countExactLines(evidence, line) {
  return [...evidence.matchAll(new RegExp(`^${escapeRegExp(line)}$`, "gm"))].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findDuplicateIds(artifact) {
  const counts = new Map();
  for (const match of artifact.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    if (id !== undefined && !id.includes("${")) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
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
  if (sourceFiles.length === 0) return [];
  const modules = new Map();
  const api = new TypeScriptApi({ cwd: dirname(sourceFiles[0]) });
  let snapshot;
  try {
    snapshot = api.updateSnapshot({ openFiles: sourceFiles });
    for (const sourceFilePath of sourceFiles) {
      const project = snapshot.getDefaultProjectForFile(sourceFilePath);
      const sourceFile = project?.program.getSourceFile(sourceFilePath);
      if (sourceFile === undefined) {
        throw new Error(`SOURCE_INTEGRITY_TYPESCRIPT_AST_MISSING ${sourceFilePath}`);
      }
      modules.set(normalize(sourceFilePath), analyzeSourceFile(sourceFile, sourceFiles));
    }
  } finally {
    snapshot?.dispose();
    api.close();
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

function analyzeSourceFile(sourceFile, sourceFiles) {
  const exported = new Set();
  const imports = [];
  for (const statement of sourceFile.statements) {
    if (statement.kind === SyntaxKind.ImportDeclaration) {
      collectImportDeclaration(statement, sourceFile.fileName, sourceFiles, imports);
      continue;
    }
    if (statement.kind === SyntaxKind.ExportDeclaration) {
      collectExportDeclaration(
        statement,
        sourceFile.fileName,
        sourceFiles,
        imports,
        exported,
      );
      continue;
    }
    if (statement.kind === SyntaxKind.ExportAssignment) {
      exported.add("default");
      continue;
    }
    if ((statement.modifierFlags & ModifierFlags.Export) === 0) continue;
    if ((statement.modifierFlags & ModifierFlags.Default) !== 0) {
      exported.add("default");
      continue;
    }
    if (statement.kind === SyntaxKind.VariableStatement) {
      for (const declaration of statement.declarationList.declarations) {
        collectBindingNames(declaration.name, exported);
      }
      continue;
    }
    const name = readNodeName(statement.name);
    if (name !== null) exported.add(name);
  }

  visitAst(sourceFile, (node) => {
    if (
      node.kind !== SyntaxKind.CallExpression ||
      node.expression?.kind !== SyntaxKind.ImportKeyword
    ) {
      return;
    }
    const moduleSpecifier = readStringLiteral(node.arguments?.[0]);
    if (moduleSpecifier === null) return;
    const target = resolveModule(sourceFile.fileName, moduleSpecifier, sourceFiles);
    if (target !== null) imports.push({ target, names: new Set(["*"]) });
  });

  return { exports: exported, imports };
}

function collectImportDeclaration(statement, sourceFilePath, sourceFiles, imports) {
  const moduleSpecifier = readStringLiteral(statement.moduleSpecifier);
  if (moduleSpecifier === null) return;
  const target = resolveModule(sourceFilePath, moduleSpecifier, sourceFiles);
  if (target === null) return;
  const names = new Set();
  const clause = statement.importClause;
  if (clause?.name !== undefined) names.add("default");
  const bindings = clause?.namedBindings;
  if (bindings?.kind === SyntaxKind.NamespaceImport) names.add("*");
  if (bindings?.kind === SyntaxKind.NamedImports) {
    for (const element of bindings.elements) {
      const name = readNodeName(element.propertyName ?? element.name);
      if (name !== null) names.add(name);
    }
  }
  imports.push({ target, names });
}

function collectExportDeclaration(
  statement,
  sourceFilePath,
  sourceFiles,
  imports,
  exported,
) {
  const clause = statement.exportClause;
  if (clause?.kind === SyntaxKind.NamespaceExport) {
    const name = readNodeName(clause.name);
    if (name !== null) exported.add(name);
  }
  if (clause?.kind === SyntaxKind.NamedExports) {
    for (const element of clause.elements) {
      const name = readNodeName(element.name);
      if (name !== null) exported.add(name);
    }
  }

  const moduleSpecifier = readStringLiteral(statement.moduleSpecifier);
  if (moduleSpecifier === null) return;
  const target = resolveModule(sourceFilePath, moduleSpecifier, sourceFiles);
  if (target === null) return;
  if (clause === undefined || clause.kind === SyntaxKind.NamespaceExport) {
    imports.push({ target, names: new Set(["*"]) });
    return;
  }
  const names = new Set();
  if (clause.kind === SyntaxKind.NamedExports) {
    for (const element of clause.elements) {
      const name = readNodeName(element.propertyName ?? element.name);
      if (name !== null) names.add(name);
    }
  }
  imports.push({ target, names });
}

function collectBindingNames(name, target) {
  const identifier = readNodeName(name);
  if (identifier !== null) {
    target.add(identifier);
    return;
  }
  for (const element of name?.elements ?? []) {
    if (element.name !== undefined) collectBindingNames(element.name, target);
  }
}

function visitAst(node, visitor) {
  visitor(node);
  node.forEachChild((child) => visitAst(child, visitor));
}

function readStringLiteral(node) {
  return node?.kind === SyntaxKind.StringLiteral && typeof node.text === "string"
    ? node.text
    : null;
}

function readNodeName(node) {
  return node?.kind === SyntaxKind.Identifier && typeof node.text === "string"
    ? node.text
    : null;
}

function resolveModule(sourceFilePath, moduleSpecifier, sourceFiles) {
  if (!moduleSpecifier.startsWith(".")) return null;
  const base = resolve(dirname(sourceFilePath), moduleSpecifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
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
  const projectRelativePath = relative(resolve(), absolute);
  return projectRelativePath.startsWith("..") ? absolute : projectRelativePath;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
