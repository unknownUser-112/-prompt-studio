import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
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
  ModifierFlags,
  NodeFlags,
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
const JAVASCRIPT_MIME_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);
const SCRIPT_ATTRIBUTE_NAMED_CHARACTER_REFERENCES = new Map([
  ["AMP", "&"],
  ["AMP;", "&"],
  ["GT", ">"],
  ["GT;", ">"],
  ["LT", "<"],
  ["LT;", "<"],
  ["NewLine;", "\n"],
  ["QUOT", '"'],
  ["QUOT;", '"'],
  ["Tab;", "\t"],
  ["amp", "&"],
  ["amp;", "&"],
  ["apos;", "'"],
  ["gt", ">"],
  ["gt;", ">"],
  ["lt", "<"],
  ["lt;", "<"],
  ["period;", "."],
  ["quot", '"'],
  ["quot;", '"'],
  ["semi;", ";"],
  ["sol;", "/"],
]);
const SCRIPT_ATTRIBUTE_NAMED_CHARACTER_REFERENCE_NAMES = [
  ...SCRIPT_ATTRIBUTE_NAMED_CHARACTER_REFERENCES.keys(),
].sort((left, right) => right.length - left.length);
const SCRIPT_EXTRACTION_TEXT_ELEMENTS = new Set([
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "style",
  "textarea",
  "title",
  "xmp",
]);
const SCRIPT_ELEMENT_NAMES = new Set(["script"]);
const NON_VISIBLE_TEXT_ELEMENT_NAMES = new Set(["script", "style"]);
const FOREIGN_CONTENT_ROOT_NAMES = new Set(["math", "svg"]);
const FOREIGN_CONTENT_INTEGRATION_POINT_NAMES = new Set([
  "annotation-xml",
  "desc",
  "foreignobject",
  "mi",
  "mn",
  "mo",
  "ms",
  "mtext",
  "title",
]);
const FOREIGN_CONTENT_HTML_BREAKOUT_START_TAGS = new Set([
  "b",
  "big",
  "blockquote",
  "body",
  "br",
  "center",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "font",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "hr",
  "i",
  "img",
  "li",
  "listing",
  "menu",
  "meta",
  "nobr",
  "ol",
  "p",
  "pre",
  "ruby",
  "s",
  "small",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "table",
  "tt",
  "u",
  "ul",
  "var",
]);
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 48 * 1024 * 1024;
const MAX_PNG_BASE64_CHARACTERS = 4 * Math.ceil(MAX_PNG_BYTES / 3);
const MAX_PNG_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_PNG_WIDTH = 4096;
const MAX_PNG_HEIGHT = 8192;
const MAX_PNG_PIXELS = 8_000_000;
const MAX_PNG_INFLATED_BYTES = 32 * 1024 * 1024;
const MAX_PNG_CHUNKS = 4096;
const MAX_ZERO_LENGTH_IDAT_CHUNKS = 64;

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
  const scriptAnalysis = await analyzeArtifactScripts(artifact);

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
  const staleDomSinkValues = scriptAnalysis.visibleValues.filter((value) =>
    /\bPrompt Studio V500(?:\.\d+)+\b/i.test(value),
  );
  if (staleDomSinkValues.length > 0) {
    issues.push({
      code: "V600_VERSION_METADATA_STALE",
      detail: "a visible DOM sink contains static Prompt Studio V500 version text",
    });
  }

  const invalidExportNames = scriptAnalysis.exportFilenames.filter(
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
      const resolvedEvidencePath = resolvePath(evidencePath);
      const evidenceStats = await stat(resolvedEvidencePath);
      if (evidenceStats.size > MAX_EVIDENCE_BYTES) {
        issues.push({
          code: "V600_IPHONE_EVIDENCE_INVALID",
          detail: "evidence file exceeds resource limit",
        });
      } else {
        const evidence = await readFile(resolvedEvidencePath, "utf8");
        for (const detail of validateIphoneEvidence(evidence)) {
          issues.push({ code: "V600_IPHONE_EVIDENCE_INVALID", detail });
        }
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
  const matches = extractScriptElements(artifact).filter((element) => {
    const parsed = parseScriptAttributes(element.attributes);
    const ids = parsed.values.get("id") ?? [];
    return !parsed.malformed && ids.length === 1 && ids[0] === "prompt-studio-build-metadata";
  });
  if (matches.length !== 1) return null;

  try {
    const value = JSON.parse(matches[0].source);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

async function analyzeArtifactScripts(artifact) {
  const classicScripts = [];
  const moduleScripts = [];
  for (const element of extractScriptElements(artifact)) {
    const kind = classifyScriptElement(element.attributes);
    if (kind === "classic") classicScripts.push(element.source);
    if (kind === "module") moduleScripts.push(element.source);
  }
  const analysisUnits = classicScripts.map((source, index) => ({
    kind: "classic",
    name: `artifact-classic-script-${index}.js`,
    scriptIndex: index,
    source,
  }));
  for (let index = 0; index < moduleScripts.length; index += 1) {
    analysisUnits.push({
      kind: "module",
      name: `artifact-module-script-${index}.mjs`,
      scriptIndex: 0,
      source: moduleScripts[index],
    });
  }
  if (analysisUnits.length === 0) return { exportFilenames: [], visibleValues: [] };

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "prompt-studio-script-ast-"));
  const scriptPaths = analysisUnits.map((unit) => join(temporaryDirectory, unit.name));
  let api;
  let snapshot;
  try {
    await Promise.all(
      analysisUnits.map((unit, index) => writeFile(scriptPaths[index], unit.source, "utf8")),
    );
    api = new TypeScriptApi({ cwd: temporaryDirectory });
    snapshot = api.updateSnapshot({ openFiles: scriptPaths });
    const exportFilenames = [];
    const visibleValues = [];
    const sourceFiles = scriptPaths.map((scriptPath) => {
      const project = snapshot.getDefaultProjectForFile(scriptPath);
      const sourceFile = project?.program.getSourceFile(scriptPath);
      if (sourceFile === undefined) {
        throw new Error("SOURCE_INTEGRITY_SCRIPT_AST_MISSING");
      }
      return sourceFile;
    });
    const classicModel = createLexicalModel();
    for (let index = 0; index < sourceFiles.length; index += 1) {
      const unit = analysisUnits[index];
      if (unit.kind === "classic") {
        extendLexicalModel(sourceFiles[index], classicModel, unit.scriptIndex);
      }
    }
    for (let index = 0; index < sourceFiles.length; index += 1) {
      const sourceFile = sourceFiles[index];
      const unit = analysisUnits[index];
      const model = unit.kind === "classic"
        ? classicModel
        : buildLexicalModel(sourceFile);
      const analysis = analyzeScriptAst(sourceFile, model);
      exportFilenames.push(...analysis.exportFilenames);
      visibleValues.push(...analysis.visibleValues);
    }
    return { exportFilenames: [...new Set(exportFilenames)], visibleValues };
  } finally {
    snapshot?.dispose();
    api?.close();
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function extractScriptElements(artifact) {
  return extractArtifactTextElements(artifact, SCRIPT_ELEMENT_NAMES);
}

function extractArtifactTextElements(artifact, targetNames) {
  const elements = [];
  const lowerArtifact = artifact.toLowerCase();
  const foreignContentRoots = [];
  let templateDepth = 0;
  let index = 0;
  while (index < artifact.length) {
    const tagStart = artifact.indexOf("<", index);
    if (tagStart === -1) break;
    if (artifact.startsWith("<!--", tagStart)) {
      index = skipArtifactHtmlComment(artifact, tagStart);
      continue;
    }
    if (
      foreignContentRoots.length > 0 &&
      artifact.startsWith("<![CDATA[", tagStart)
    ) {
      index = skipArtifactCdataSection(artifact, tagStart);
      continue;
    }
    if (artifact[tagStart + 1] === "!" || artifact[tagStart + 1] === "?") {
      index = skipArtifactBogusMarkup(artifact, tagStart + 2);
      continue;
    }
    const tag = readArtifactTag(artifact, tagStart);
    if (tag === null) {
      index = tagStart + 1;
      continue;
    }
    index = tag.end;

    if (foreignContentRoots.length > 0) {
      updateArtifactForeignContent(tag, foreignContentRoots);
      continue;
    }

    if (templateDepth > 0) {
      if (!tag.closing && FOREIGN_CONTENT_ROOT_NAMES.has(tag.name)) {
        if (!isUnambiguouslySelfClosingForeignTag(tag)) {
          foreignContentRoots.push(tag.name);
        }
      } else if (!tag.closing && tag.name === "template") {
        templateDepth += 1;
      } else if (tag.closing && tag.name === "template") {
        templateDepth -= 1;
      } else if (!tag.closing && SCRIPT_EXTRACTION_TEXT_ELEMENTS.has(tag.name)) {
        index = skipArtifactTextElement(artifact, lowerArtifact, index, tag.name);
      }
      continue;
    }

    if (tag.closing) continue;
    if (FOREIGN_CONTENT_ROOT_NAMES.has(tag.name)) {
      if (!isUnambiguouslySelfClosingForeignTag(tag)) {
        foreignContentRoots.push(tag.name);
      }
      continue;
    }
    if (tag.name === "template") {
      templateDepth = 1;
      continue;
    }
    if (tag.name === "plaintext") break;
    if (tag.name !== "script" && !SCRIPT_EXTRACTION_TEXT_ELEMENTS.has(tag.name)) continue;

    const closeStart = findRawElementClose(lowerArtifact, index, tag.name);
    const sourceEnd = closeStart === -1 ? artifact.length : closeStart;
    const elementEnd = closeStart === -1
      ? artifact.length
      : readArtifactTag(artifact, closeStart)?.end ?? artifact.length;
    if (targetNames.has(tag.name)) {
      elements.push({
        attributes: tag.attributes,
        end: elementEnd,
        name: tag.name,
        source: artifact.slice(index, sourceEnd),
        start: tagStart,
      });
    }
    index = elementEnd;
  }
  return elements;
}

function updateArtifactForeignContent(tag, foreignContentRoots) {
  if (tag.closing) {
    if (tag.name === "br" || tag.name === "p") {
      throw new Error(`SOURCE_INTEGRITY_FOREIGN_CONTENT_AMBIGUOUS closing ${tag.name}`);
    }
    const rootIndex = foreignContentRoots.lastIndexOf(tag.name);
    if (rootIndex !== -1) foreignContentRoots.length = rootIndex;
    return;
  }

  if (
    tag.name === "script" ||
    FOREIGN_CONTENT_INTEGRATION_POINT_NAMES.has(tag.name) ||
    FOREIGN_CONTENT_HTML_BREAKOUT_START_TAGS.has(tag.name)
  ) {
    throw new Error(`SOURCE_INTEGRITY_FOREIGN_CONTENT_AMBIGUOUS opening ${tag.name}`);
  }
  if (
    FOREIGN_CONTENT_ROOT_NAMES.has(tag.name) &&
    !isUnambiguouslySelfClosingForeignTag(tag)
  ) {
    foreignContentRoots.push(tag.name);
  }
}

function isUnambiguouslySelfClosingForeignTag(tag) {
  return tag.selfClosing;
}

function skipArtifactTextElement(artifact, lowerArtifact, start, name) {
  const closeStart = findRawElementClose(lowerArtifact, start, name);
  if (closeStart === -1) return artifact.length;
  return readArtifactTag(artifact, closeStart)?.end ?? artifact.length;
}

function skipArtifactCdataSection(artifact, start) {
  const end = artifact.indexOf("]]>", start + "<![CDATA[".length);
  return end === -1 ? artifact.length : end + "]]>".length;
}

function skipArtifactBogusMarkup(artifact, start) {
  const end = artifact.indexOf(">", start);
  return end === -1 ? artifact.length : end + 1;
}

function skipArtifactHtmlComment(artifact, start) {
  let index = start + 4;
  let state = "start";
  while (index < artifact.length) {
    const character = artifact[index];
    if (state === "start") {
      if (character === ">") return index + 1;
      if (character === "-") {
        state = "start-dash";
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (state === "start-dash") {
      if (character === ">") return index + 1;
      if (character === "-") {
        state = "end";
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (state === "comment") {
      if (character === "<") state = "less-than";
      if (character === "-") state = "end-dash";
      index += 1;
      continue;
    }
    if (state === "less-than") {
      if (character === "!") {
        state = "less-than-bang";
        index += 1;
      } else if (character === "<") {
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (state === "less-than-bang") {
      if (character === "-") {
        state = "less-than-bang-dash";
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (state === "less-than-bang-dash") {
      if (character === "-") {
        state = "less-than-bang-dash-dash";
        index += 1;
      } else {
        state = "end-dash";
      }
      continue;
    }
    if (state === "less-than-bang-dash-dash") {
      if (character === ">") return index + 1;
      state = "end";
      continue;
    }
    if (state === "end-dash") {
      if (character === "-") {
        state = "end";
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (state === "end") {
      if (character === ">") return index + 1;
      if (character === "!") {
        state = "end-bang";
        index += 1;
      } else if (character === "-") {
        index += 1;
      } else {
        state = "comment";
      }
      continue;
    }
    if (character === ">") return index + 1;
    if (character === "-") {
      state = "end-dash";
      index += 1;
    } else {
      state = "comment";
    }
  }
  return artifact.length;
}

function readArtifactTag(artifact, start) {
  let index = start + 1;
  const closing = artifact[index] === "/";
  if (closing) index += 1;
  const nameStart = index;
  if (!/[a-z]/i.test(artifact[index] ?? "")) return null;
  index += 1;
  while (
    index < artifact.length &&
    !isHtmlAttributeWhitespace(artifact[index]) &&
    artifact[index] !== "/" &&
    artifact[index] !== ">"
  ) {
    index += 1;
  }
  const name = artifact.slice(nameStart, index).toLowerCase();
  const attributesStart = index;
  const tail = readArtifactTagTail(artifact, index);
  return {
    attributes: artifact.slice(attributesStart, tail.contentEnd),
    closing,
    end: tail.end,
    name,
    selfClosing: !closing && tail.selfClosing,
  };
}

function readArtifactTagTail(artifact, start) {
  let index = start;
  let state = "before-attribute-name";
  while (index < artifact.length) {
    const character = artifact[index];
    if (state === "before-attribute-name") {
      if (isHtmlAttributeWhitespace(character)) {
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      } else {
        state = "attribute-name";
      }
      continue;
    }
    if (state === "attribute-name") {
      if (isHtmlAttributeWhitespace(character)) {
        state = "after-attribute-name";
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === "=") {
        state = "before-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      } else {
        index += 1;
      }
      continue;
    }
    if (state === "after-attribute-name") {
      if (isHtmlAttributeWhitespace(character)) {
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === "=") {
        state = "before-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      } else {
        state = "attribute-name";
      }
      continue;
    }
    if (state === "before-attribute-value") {
      if (isHtmlAttributeWhitespace(character)) {
        index += 1;
      } else if (character === '"') {
        state = "double-quoted-attribute-value";
        index += 1;
      } else if (character === "'") {
        state = "single-quoted-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      } else {
        state = "unquoted-attribute-value";
      }
      continue;
    }
    if (
      state === "double-quoted-attribute-value" ||
      state === "single-quoted-attribute-value"
    ) {
      const quote = state === "double-quoted-attribute-value" ? '"' : "'";
      if (character === quote) state = "after-quoted-attribute-value";
      index += 1;
      continue;
    }
    if (state === "after-quoted-attribute-value") {
      if (isHtmlAttributeWhitespace(character)) {
        state = "before-attribute-name";
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      } else {
        state = "before-attribute-name";
      }
      continue;
    }
    if (state === "unquoted-attribute-value") {
      if (isHtmlAttributeWhitespace(character)) {
        state = "before-attribute-name";
      } else if (character === ">") {
        return { contentEnd: index, end: index + 1, selfClosing: false };
      }
      index += 1;
      continue;
    }
    if (character === ">") {
      return { contentEnd: index, end: index + 1, selfClosing: true };
    }
    state = "before-attribute-name";
  }
  return { contentEnd: artifact.length, end: artifact.length, selfClosing: false };
}

function findRawElementClose(lowerArtifact, start, name) {
  if (name === "script") return findScriptDataEndTag(lowerArtifact, start);
  const needle = `</${name}`;
  let searchIndex = start;
  while (searchIndex < lowerArtifact.length) {
    const candidate = lowerArtifact.indexOf(needle, searchIndex);
    if (candidate === -1) return -1;
    const next = lowerArtifact[candidate + needle.length];
    if (next === ">" || next === "/" || isHtmlAttributeWhitespace(next)) return candidate;
    searchIndex = candidate + needle.length;
  }
  return -1;
}

function findScriptDataEndTag(lowerArtifact, start) {
  let index = start;
  let state = "data";
  while (index < lowerArtifact.length) {
    if (state === "data") {
      if (lowerArtifact.startsWith("<!--", index)) {
        state = "escaped";
        index += 4;
        continue;
      }
      if (isScriptEndTagAt(lowerArtifact, index)) return index;
      index += 1;
      continue;
    }

    if (state === "escaped-dash") {
      if (lowerArtifact[index] === "-") {
        state = "escaped-dash-dash";
        index += 1;
      } else {
        state = "escaped";
      }
      continue;
    }
    if (state === "escaped-dash-dash") {
      if (lowerArtifact[index] === "-") {
        index += 1;
      } else if (lowerArtifact[index] === ">") {
        state = "data";
        index += 1;
      } else {
        state = "escaped";
      }
      continue;
    }
    if (state === "escaped") {
      if (isScriptEndTagAt(lowerArtifact, index)) return index;
      if (isScriptDoubleEscapeStartAt(lowerArtifact, index)) {
        state = "double-escaped";
        index += "<script".length;
        continue;
      }
      if (lowerArtifact[index] === "-") {
        state = "escaped-dash";
      }
      index += 1;
      continue;
    }

    if (state === "double-escaped-dash") {
      if (lowerArtifact[index] === "-") {
        state = "double-escaped-dash-dash";
        index += 1;
      } else {
        state = "double-escaped";
      }
      continue;
    }
    if (state === "double-escaped-dash-dash") {
      if (lowerArtifact[index] === "-") {
        index += 1;
      } else if (lowerArtifact[index] === ">") {
        state = "double-escaped";
        index += 1;
      } else {
        state = "double-escaped";
      }
      continue;
    }
    if (isScriptEndTagAt(lowerArtifact, index)) {
      state = "escaped";
      index += "</script".length;
      continue;
    }
    if (lowerArtifact[index] === "-") state = "double-escaped-dash";
    index += 1;
  }
  return -1;
}

function isScriptDoubleEscapeStartAt(lowerArtifact, index) {
  if (!lowerArtifact.startsWith("<script", index)) return false;
  return isScriptTagNameDelimiter(lowerArtifact[index + "<script".length]);
}

function isScriptEndTagAt(lowerArtifact, index) {
  if (!lowerArtifact.startsWith("</script", index)) return false;
  return isScriptTagNameDelimiter(lowerArtifact[index + "</script".length]);
}

function isScriptTagNameDelimiter(character) {
  return character === ">" || character === "/" || isHtmlAttributeWhitespace(character);
}

function classifyScriptElement(attributeSource) {
  const parsed = parseScriptAttributes(attributeSource);
  const typeValues = parsed.values.get("type") ?? [];
  if (parsed.malformed || typeValues.length > 1) {
    return typeValues.some((value) => normalizeScriptType(value) === "module")
      ? "module"
      : "classic";
  }
  if (typeValues.length === 0) return "classic";
  const type = normalizeScriptType(typeValues[0]);
  if (type === "module") return "module";
  return isJavaScriptMimeType(type) ? "classic" : null;
}

function parseScriptAttributes(source) {
  const values = new Map();
  let malformed = false;
  let index = 0;
  while (index < source.length) {
    while (isHtmlAttributeWhitespace(source[index])) index += 1;
    if (index >= source.length || source[index] === "/") break;
    const nameStart = index;
    while (
      index < source.length &&
      !isHtmlAttributeWhitespace(source[index]) &&
      !/[=/>]/.test(source[index] ?? "")
    ) {
      index += 1;
    }
    if (index === nameStart) {
      malformed = true;
      index += 1;
      continue;
    }
    const name = source.slice(nameStart, index).toLowerCase();
    while (isHtmlAttributeWhitespace(source[index])) index += 1;
    let value = "";
    if (source[index] === "=") {
      index += 1;
      while (isHtmlAttributeWhitespace(source[index])) index += 1;
      const quote = source[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const valueStart = index;
        while (index < source.length && source[index] !== quote) index += 1;
        value = source.slice(valueStart, index);
        if (index >= source.length) malformed = true;
        else index += 1;
      } else {
        const valueStart = index;
        while (index < source.length && !isHtmlAttributeWhitespace(source[index])) index += 1;
        value = source.slice(valueStart, index);
        if (value.length === 0 || /["'<=`]/.test(value)) malformed = true;
      }
    }
    const entries = values.get(name) ?? [];
    entries.push(decodeHtmlScriptAttributeValue(value));
    values.set(name, entries);
  }
  return { malformed, values };
}

function normalizeScriptType(value) {
  return value.replace(/^[\u0009\u000a\u000c\u000d\u0020]+|[\u0009\u000a\u000c\u000d\u0020]+$/g, "")
    .toLowerCase();
}

function isJavaScriptMimeType(type) {
  if (type === "") return true;
  const essence = parseMimeTypeEssence(type);
  return essence !== null && JAVASCRIPT_MIME_TYPES.has(essence);
}

function parseMimeTypeEssence(type) {
  const parameterStart = type.indexOf(";");
  const essence = (parameterStart === -1 ? type : type.slice(0, parameterStart))
    .replace(/[\u0009\u000a\u000d\u0020]+$/g, "");
  const slash = essence.indexOf("/");
  if (slash <= 0 || slash === essence.length - 1) return null;
  const mimeToken = /^[!#$%&'*+.^_`|~0-9a-z-]+$/;
  const typeToken = essence.slice(0, slash);
  const subtypeToken = essence.slice(slash + 1);
  if (!mimeToken.test(typeToken) || !mimeToken.test(subtypeToken)) return null;
  return `${typeToken}/${subtypeToken}`;
}

function decodeHtmlScriptAttributeValue(value) {
  let decoded = "";
  let index = 0;
  while (index < value.length) {
    if (value[index] !== "&") {
      decoded += value[index];
      index += 1;
      continue;
    }
    const numeric = /^&#(?:x([\da-f]+);?|(\d+);?)/i.exec(value.slice(index));
    if (numeric !== null) {
      const codePoint = numeric[1] === undefined
        ? Number.parseInt(numeric[2], 10)
        : Number.parseInt(numeric[1], 16);
      try {
        decoded += String.fromCodePoint(codePoint);
      } catch {
        decoded += numeric[0];
      }
      index += numeric[0].length;
      continue;
    }
    const name = SCRIPT_ATTRIBUTE_NAMED_CHARACTER_REFERENCE_NAMES.find((candidate) =>
      value.startsWith(candidate, index + 1),
    );
    if (name === undefined) {
      decoded += "&";
      index += 1;
      continue;
    }
    const next = value[index + name.length + 1];
    if (!name.endsWith(";") && /[=a-z0-9]/i.test(next ?? "")) {
      decoded += "&";
      index += 1;
      continue;
    }
    decoded += SCRIPT_ATTRIBUTE_NAMED_CHARACTER_REFERENCES.get(name);
    index += name.length + 1;
  }
  return decoded;
}

function isHtmlAttributeWhitespace(character) {
  return (
    character === "\t" ||
    character === "\n" ||
    character === "\f" ||
    character === "\r" ||
    character === " "
  );
}

function analyzeScriptAst(sourceFile, model) {
  const exportFilenames = [];
  const visibleValues = [];
  const visiblePropertySinks = new Set(["innerHTML", "innerText", "textContent"]);

  visitAstIterative(sourceFile, (node) => {
    if (
      node.kind === SyntaxKind.BinaryExpression &&
      node.operatorToken?.kind === SyntaxKind.EqualsToken
    ) {
      const target = readMemberAccess(node.left, model);
      if (target !== null && visiblePropertySinks.has(target.name)) {
        const value = resolveStaticString(node.right, model);
        if (value !== null) visibleValues.push(value);
      }
      if (
        target !== null &&
        target.name === "download" &&
        isStaticAnchor(target.receiver, model)
      ) {
        const value = resolveStaticString(node.right, model);
        if (value !== null) exportFilenames.push(value);
      }
      return;
    }

    if (node.kind !== SyntaxKind.CallExpression || node.questionDotToken !== undefined) return;
    const target = readMemberAccess(node.expression, model);
    if (target === null) return;

    if (
      target.name === "setAttribute" &&
      node.arguments?.length >= 2 &&
      resolveStaticString(node.arguments[0], model)?.toLowerCase() === "download" &&
      isStaticAnchor(target.receiver, model)
    ) {
      const value = resolveStaticString(node.arguments[1], model);
      if (value !== null) exportFilenames.push(value);
      return;
    }

    if (
      target.name === "insertAdjacentHTML" &&
      node.arguments?.length >= 2 &&
      resolveStaticString(node.arguments[0], model) !== null
    ) {
      const value = resolveStaticString(node.arguments[1], model);
      if (value !== null) visibleValues.push(value);
      return;
    }

    if (
      (target.name === "write" || target.name === "writeln") &&
      isUnshadowedGlobalIdentifier(target.receiver, "document", model) &&
      node.arguments?.length >= 1
    ) {
      const value = resolveStaticString(node.arguments[0], model);
      if (value !== null) visibleValues.push(value);
    }
  });

  return {
    exportFilenames: [...new Set(exportFilenames)],
    visibleValues,
  };
}

function createLexicalModel() {
  const rootScope = createLexicalScope(null, "root");
  return {
    generatorResumeCounts: new Map(),
    rootScope,
    scopesByNode: new WeakMap(),
    scriptIndexesByNode: new WeakMap(),
  };
}

function buildLexicalModel(sourceFile) {
  return extendLexicalModel(sourceFile, createLexicalModel(), 0);
}

function extendLexicalModel(sourceFile, model, scriptIndex) {
  const { rootScope, scopesByNode, scriptIndexesByNode } = model;
  const work = [{ node: sourceFile, parentScope: rootScope, root: true }];

  while (work.length > 0) {
    const frame = work.pop();
    const node = frame.node;
    let scope = frame.parentScope;

    if (!frame.root && isFunctionLikeNode(node)) {
      scope = createLexicalScope(frame.parentScope, "function");
      scope.executionMode = node.asteriskToken === undefined
        ? (node.modifierFlags & ModifierFlags.Async) !== 0 ? "async" : "synchronous"
        : "generator";
      if (node.kind === SyntaxKind.FunctionDeclaration && node.name !== undefined) {
        addNamedBinding(
          frame.parentScope,
          node.name,
          null,
          "function",
          scriptIndex,
          scope.executionContext,
        );
      }
      if (node.kind === SyntaxKind.FunctionExpression && node.name !== undefined) {
        addNamedBinding(
          scope,
          node.name,
          null,
          "function",
          scriptIndex,
          scope.executionContext,
        );
      }
      for (const parameter of node.parameters ?? []) {
        addBindingNames(scope, parameter.name, null, "parameter", scriptIndex);
      }
    } else if (!frame.root && createsLexicalScope(node)) {
      scope = createLexicalScope(frame.parentScope, lexicalScopeKind(node));
    }

    scopesByNode.set(node, scope);
    scriptIndexesByNode.set(node, scriptIndex);

    const suspensionIndex = readSynchronousSuspensionIndex(
      node,
      scope.executionContext.executionMode,
    );
    if (suspensionIndex !== null) {
      if (
        node.kind === SyntaxKind.YieldExpression &&
        scope.executionContext.executionMode === "generator"
      ) {
        scope.executionContext.yieldSuspensions.push({
          delegated: node.asteriskToken !== undefined,
          expression: node.expression ?? null,
          index: suspensionIndex,
        });
      } else if (
        scope.executionContext.firstAsynchronousSuspensionIndex === null ||
        suspensionIndex < scope.executionContext.firstAsynchronousSuspensionIndex
      ) {
        scope.executionContext.firstAsynchronousSuspensionIndex = suspensionIndex;
      }
    }

    if (node.kind === SyntaxKind.VariableDeclarationList) {
      const declarationKind = readVariableDeclarationKind(node);
      const targetScope = declarationKind === "var"
        ? findFunctionScope(scope)
        : scope;
      for (const declaration of node.declarations ?? []) {
        const simpleInitializer = declaration.name?.kind === SyntaxKind.Identifier
          ? declaration.initializer ?? null
          : null;
        addBindingNames(
          targetScope,
          declaration.name,
          declarationKind === "const" || declarationKind === "let"
            ? simpleInitializer
            : null,
          declarationKind,
          scriptIndex,
        );
      }
    }

    if (node.kind === SyntaxKind.ImportDeclaration) {
      addImportBindings(scope, node.importClause, scriptIndex);
    }
    if (node.kind === SyntaxKind.ImportEqualsDeclaration) {
      addNamedBinding(scope, node.name, null, "import", scriptIndex);
    }

    if (node.kind === SyntaxKind.CatchClause && node.variableDeclaration?.name !== undefined) {
      addBindingNames(scope, node.variableDeclaration.name, null, "catch", scriptIndex);
    }
    if (node.kind === SyntaxKind.ClassDeclaration && node.name !== undefined) {
      addNamedBinding(frame.parentScope, node.name, null, "class", scriptIndex);
    }
    if (node.kind === SyntaxKind.ClassExpression && node.name !== undefined) {
      addNamedBinding(scope, node.name, null, "class", scriptIndex);
    }

    const children = [];
    node.forEachChild((child) => {
      children.push(child);
    });
    for (let index = children.length - 1; index >= 0; index -= 1) {
      work.push({ node: children[index], parentScope: scope, root: false });
    }
  }
  collectFunctionInvocations(sourceFile, model);
  collectBindingWrites(sourceFile, model);
  return model;
}

function createLexicalScope(parent, kind) {
  const scope = {
    bindings: new Map(),
    executionContext: null,
    executionMode: "synchronous",
    firstAsynchronousSuspensionIndex: null,
    invocations: [],
    kind,
    parent,
    yieldSuspensions: [],
  };
  if (kind === "root" || kind === "function") {
    scope.executionContext = scope;
  } else {
    scope.executionContext = parent.executionContext;
  }
  return scope;
}

function createsLexicalScope(node) {
  return (
    node.kind === SyntaxKind.Block ||
    node.kind === SyntaxKind.CaseBlock ||
    node.kind === SyntaxKind.CatchClause ||
    node.kind === SyntaxKind.ClassDeclaration ||
    node.kind === SyntaxKind.ClassExpression ||
    node.kind === SyntaxKind.ForStatement ||
    node.kind === SyntaxKind.ForInStatement ||
    node.kind === SyntaxKind.ForOfStatement ||
    node.kind === SyntaxKind.ModuleBlock
  );
}

function lexicalScopeKind(node) {
  if (
    node.kind === SyntaxKind.ForStatement ||
    node.kind === SyntaxKind.ForInStatement ||
    node.kind === SyntaxKind.ForOfStatement
  ) {
    return "loop";
  }
  if (node.kind === SyntaxKind.CatchClause) return "catch";
  if (node.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.ClassExpression) {
    return "class";
  }
  return "block";
}

function isFunctionLikeNode(node) {
  return (
    node.kind === SyntaxKind.ArrowFunction ||
    node.kind === SyntaxKind.Constructor ||
    node.kind === SyntaxKind.FunctionDeclaration ||
    node.kind === SyntaxKind.FunctionExpression ||
    node.kind === SyntaxKind.GetAccessor ||
    node.kind === SyntaxKind.MethodDeclaration ||
    node.kind === SyntaxKind.SetAccessor
  );
}

function readSynchronousSuspensionIndex(node, executionMode) {
  if (
    node.kind === SyntaxKind.AwaitExpression &&
    (executionMode === "async" || executionMode === "generator")
  ) {
    return node.expression?.end ?? node.end;
  }
  if (
    node.kind === SyntaxKind.ForOfStatement &&
    node.awaitModifier !== undefined &&
    (executionMode === "async" || executionMode === "generator")
  ) {
    return node.expression?.end ?? node.end;
  }
  if (node.kind === SyntaxKind.YieldExpression && executionMode === "generator") {
    return node.expression?.end ?? node.end;
  }
  return null;
}

function readVariableDeclarationKind(declarationList) {
  if ((declarationList.flags & NodeFlags.Const) !== 0) return "const";
  if ((declarationList.flags & NodeFlags.Let) !== 0) return "let";
  return "var";
}

function findFunctionScope(scope) {
  let current = scope;
  while (current.parent !== null && current.kind !== "function") current = current.parent;
  return current;
}

function addBindingNames(scope, name, initializer, kind, scriptIndex) {
  if (name === undefined) return;
  const work = [name];
  while (work.length > 0) {
    const current = work.pop();
    if (current.kind === SyntaxKind.Identifier) {
      addNamedBinding(scope, current, initializer, kind, scriptIndex);
      continue;
    }
    for (const element of current.elements ?? []) {
      if (element.name !== undefined) work.push(element.name);
    }
  }
}

function addNamedBinding(
  scope,
  nameNode,
  initializer,
  kind,
  scriptIndex,
  executionContext = null,
) {
  if (nameNode?.kind !== SyntaxKind.Identifier || typeof nameNode.text !== "string") return;
  const bindings = scope.bindings.get(nameNode.text) ?? [];
  bindings.push({
    declarationEnd: nameNode.end,
    executionContext,
    initializer,
    kind,
    name: nameNode.text,
    scriptIndex,
    scope,
    writes: [],
  });
  scope.bindings.set(nameNode.text, bindings);
}

function addImportBindings(scope, importClause, scriptIndex) {
  if (importClause === undefined) return;
  addNamedBinding(scope, importClause.name, null, "import", scriptIndex);
  const namedBindings = importClause.namedBindings;
  if (namedBindings?.kind === SyntaxKind.NamespaceImport) {
    addNamedBinding(scope, namedBindings.name, null, "import", scriptIndex);
    return;
  }
  if (namedBindings?.kind === SyntaxKind.NamedImports) {
    for (const element of namedBindings.elements ?? []) {
      addNamedBinding(scope, element.name, null, "import", scriptIndex);
    }
  }
}

function lookupLexicalBinding(identifier, model) {
  let scope = model.scopesByNode.get(identifier) ?? model.rootScope;
  while (scope !== null) {
    const bindings = scope.bindings.get(identifier.text);
    if (bindings !== undefined) {
      return {
        binding: bindings.length === 1 ? bindings[0] : null,
        found: true,
      };
    }
    scope = scope.parent;
  }
  return { binding: null, found: false };
}

function resolveStaticString(expression, model) {
  const parts = [];
  const activeBindings = new Set();
  const work = [{ expression, leaveBinding: null }];

  while (work.length > 0) {
    const frame = work.pop();
    if (frame.expression === null) {
      activeBindings.delete(frame.leaveBinding);
      continue;
    }
    const current = unwrapExpression(frame.expression);
    if (
      current.kind === SyntaxKind.StringLiteral ||
      current.kind === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      parts.push(current.text);
      continue;
    }
    if (
      current.kind === SyntaxKind.BinaryExpression &&
      current.operatorToken?.kind === SyntaxKind.PlusToken
    ) {
      work.push({ expression: current.right, leaveBinding: null });
      work.push({ expression: current.left, leaveBinding: null });
      continue;
    }
    if (current.kind !== SyntaxKind.Identifier) return null;

    const resolved = lookupLexicalBinding(current, model);
    const binding = resolved.binding;
    if (
      !resolved.found ||
      binding === null ||
      !bindingHasStableInitializerAtReference(binding, current, model) ||
      binding.initializer === null ||
      !bindingValueCanReachReference(binding, current, model) ||
      activeBindings.has(binding)
    ) {
      return null;
    }
    activeBindings.add(binding);
    work.push({ expression: null, leaveBinding: binding });
    work.push({ expression: binding.initializer, leaveBinding: null });
  }

  const value = parts.join("");
  return value.length <= 65536 ? value : null;
}

function isStaticAnchor(expression, model) {
  const visited = new Set();
  let current = expression;
  while (current !== null) {
    current = unwrapExpression(current);
    if (isDirectAnchorCreation(current, model)) return true;
    if (current.kind !== SyntaxKind.Identifier) return false;

    const resolved = lookupLexicalBinding(current, model);
    const binding = resolved.binding;
    if (
      !resolved.found ||
      binding === null ||
      !bindingHasStableInitializerAtReference(binding, current, model) ||
      binding.initializer === null ||
      !bindingValueCanReachReference(binding, current, model) ||
      visited.has(binding)
    ) {
      return false;
    }
    visited.add(binding);
    current = binding.initializer;
  }
  return false;
}

function collectFunctionInvocations(sourceFile, model) {
  visitAstIterative(sourceFile, (node) => {
    if (node.kind !== SyntaxKind.CallExpression || node.questionDotToken !== undefined) return;
    let invokedContext = resolveInvokedExecutionContext(node.expression, model);
    if (invokedContext?.executionMode === "generator") return;
    let generatorResumeCount = null;
    if (invokedContext === null) {
      const target = readMemberAccess(node.expression, model);
      if (target?.name === "next") {
        const iterator = resolveGeneratorIterator(target.receiver, model);
        if (iterator !== null) {
          invokedContext = iterator.context;
          const callerScope = model.scopesByNode.get(node) ?? model.rootScope;
          generatorResumeCount = incrementGeneratorResumeCount(
            model,
            iterator.identity,
            callerScope.executionContext,
          );
        }
      }
    }
    if (invokedContext === null) return;
    const callerScope = model.scopesByNode.get(node) ?? model.rootScope;
    invokedContext.invocations.push({
      context: callerScope.executionContext,
      generatorResumeCount,
      index: node.pos,
      scriptIndex: model.scriptIndexesByNode.get(node) ?? 0,
    });
  });
}

function resolveGeneratorIterator(expression, model) {
  const visited = new Set();
  let identity = null;
  let current = expression;
  while (current !== null) {
    current = unwrapExpression(current);
    if (current.kind === SyntaxKind.CallExpression && current.questionDotToken === undefined) {
      const invokedContext = resolveInvokedExecutionContext(current.expression, model);
      return invokedContext?.executionMode === "generator"
        ? { context: invokedContext, identity: identity ?? current }
        : null;
    }
    if (current.kind !== SyntaxKind.Identifier) return null;

    const resolved = lookupLexicalBinding(current, model);
    const binding = resolved.binding;
    if (
      !resolved.found ||
      binding === null ||
      binding.kind !== "const" ||
      binding.initializer === null ||
      !bindingValueCanReachReference(binding, current, model) ||
      visited.has(binding)
    ) {
      return null;
    }
    visited.add(binding);
    identity = binding;
    current = binding.initializer;
  }
  return null;
}

function incrementGeneratorResumeCount(model, identity, callerContext) {
  let countsByCaller = model.generatorResumeCounts.get(identity);
  if (countsByCaller === undefined) {
    countsByCaller = new Map();
    model.generatorResumeCounts.set(identity, countsByCaller);
  }
  const count = (countsByCaller.get(callerContext) ?? 0) + 1;
  countsByCaller.set(callerContext, count);
  return count;
}

function resolveInvokedExecutionContext(expression, model) {
  const current = unwrapExpression(expression);
  if (isFunctionLikeNode(current)) {
    return model.scopesByNode.get(current)?.executionContext ?? null;
  }
  if (current.kind !== SyntaxKind.Identifier) return null;
  const resolved = lookupLexicalBinding(current, model);
  const binding = resolved.binding;
  if (!resolved.found || binding === null) return null;
  if (binding.executionContext !== null) return binding.executionContext;
  if (binding.initializer === null) return null;
  const initializer = unwrapExpression(binding.initializer);
  if (!isFunctionLikeNode(initializer)) return null;
  return model.scopesByNode.get(initializer)?.executionContext ?? null;
}

function collectBindingWrites(sourceFile, model) {
  visitAstIterative(sourceFile, (node) => {
    if (
      node.kind === SyntaxKind.BinaryExpression &&
      node.operatorToken?.kind >= SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= SyntaxKind.LastAssignment
    ) {
      recordBindingPatternWrites(node.left, model, node.end);
      return;
    }
    if (
      (node.kind === SyntaxKind.PrefixUnaryExpression ||
        node.kind === SyntaxKind.PostfixUnaryExpression) &&
      (node.operator === SyntaxKind.PlusPlusToken ||
        node.operator === SyntaxKind.MinusMinusToken)
    ) {
      recordBindingPatternWrites(node.operand, model, node.end);
      return;
    }
    if (
      node.kind === SyntaxKind.ForInStatement || node.kind === SyntaxKind.ForOfStatement
    ) {
      if (node.initializer?.kind !== SyntaxKind.VariableDeclarationList) {
        recordBindingPatternWrites(node.initializer, model, node.statement?.pos ?? node.end);
      }
    }
  });
}

function recordBindingPatternWrites(expression, model, writeIndex) {
  if (expression === undefined) return;
  const work = [expression];
  while (work.length > 0) {
    const current = unwrapExpression(work.pop());
    if (current.kind === SyntaxKind.Identifier) {
      recordIdentifierWrite(current, model, writeIndex);
      continue;
    }
    if (current.kind === SyntaxKind.ArrayLiteralExpression) {
      for (const element of current.elements ?? []) work.push(element);
      continue;
    }
    if (current.kind === SyntaxKind.ObjectLiteralExpression) {
      for (const property of current.properties ?? []) {
        if (property.kind === SyntaxKind.ShorthandPropertyAssignment) {
          work.push(property.name);
        } else if (property.kind === SyntaxKind.PropertyAssignment) {
          work.push(property.initializer);
        } else if (property.kind === SyntaxKind.SpreadAssignment) {
          work.push(property.expression);
        }
      }
      continue;
    }
    if (current.kind === SyntaxKind.SpreadElement) work.push(current.expression);
  }
}

function recordIdentifierWrite(expression, model, writeIndex) {
  const current = unwrapExpression(expression);
  if (current.kind !== SyntaxKind.Identifier) return;
  const resolved = lookupLexicalBinding(current, model);
  if (resolved.binding !== null) {
    const scope = model.scopesByNode.get(current) ?? model.rootScope;
    resolved.binding.writes.push({
      context: scope.executionContext,
      index: writeIndex,
      scriptIndex: model.scriptIndexesByNode.get(current) ?? 0,
    });
  }
}

function bindingHasStableInitializerAtReference(binding, identifier, model) {
  return (
    binding.kind === "const" ||
    (binding.kind === "let" && binding.writes.every((write) =>
      !writeCanReachReference(write, identifier, model),
    ))
  );
}

function writeCanReachReference(write, identifier, model) {
  const referenceScope = model.scopesByNode.get(identifier) ?? model.rootScope;
  const referenceContext = referenceScope.executionContext;
  const referenceScriptIndex = model.scriptIndexesByNode.get(identifier) ?? 0;
  const visited = new Set();
  const work = [write];
  while (work.length > 0) {
    const event = work.pop();
    if (visited.has(event)) continue;
    visited.add(event);
    const context = event.context;
    if (
      context === referenceContext &&
      eventPrecedesReference(event, identifier.pos, referenceScriptIndex)
    ) {
      return true;
    }
    const resumeRequirement = readSynchronousResumeRequirement(event, context, model);
    if (resumeRequirement === null) continue;
    for (const invocation of context.invocations) {
      if (
        context.executionMode === "generator" &&
        (invocation.generatorResumeCount ?? 0) < resumeRequirement
      ) {
        continue;
      }
      if (
        invocation.context === referenceContext &&
        eventPrecedesReference(invocation, identifier.pos, referenceScriptIndex)
      ) {
        return true;
      }
      work.push(invocation);
    }
  }
  return false;
}

function readSynchronousResumeRequirement(event, context, model) {
  if (
    context.firstAsynchronousSuspensionIndex !== null &&
    event.index >= context.firstAsynchronousSuspensionIndex
  ) {
    return null;
  }
  if (context.executionMode !== "generator") return 0;
  let resumeCount = 1;
  for (const suspension of context.yieldSuspensions) {
    if (event.index <= suspension.index) break;
    if (!suspension.delegated) {
      resumeCount += 1;
      continue;
    }
    const delegatedYieldCount = readStaticDelegatedYieldCount(
      suspension.expression,
      model,
    );
    if (delegatedYieldCount === null) return null;
    resumeCount += delegatedYieldCount;
  }
  return resumeCount;
}

function readStaticDelegatedYieldCount(expression, model) {
  if (expression === null) return null;
  const work = [expression];
  let count = 0;

  while (work.length > 0) {
    const current = unwrapExpression(work.pop());
    if (
      current.kind === SyntaxKind.StringLiteral ||
      current.kind === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      count += [...current.text].length;
    } else if (current.kind === SyntaxKind.ArrayLiteralExpression) {
      const elements = current.elements ?? [];
      for (let index = elements.length - 1; index >= 0; index -= 1) {
        const element = elements[index];
        if (element.kind === SyntaxKind.SpreadElement) {
          work.push(element.expression);
        } else {
          count += 1;
        }
      }
    } else if (
      current.kind === SyntaxKind.BinaryExpression &&
      current.operatorToken?.kind === SyntaxKind.PlusToken
    ) {
      const staticString = resolveStaticString(current, model);
      if (staticString === null) return null;
      count += [...staticString].length;
    } else if (current.kind === SyntaxKind.Identifier) {
      const staticString = resolveStaticString(current, model);
      if (staticString === null) return null;
      count += [...staticString].length;
    } else {
      return null;
    }
    if (count > 65536) return null;
  }

  return count;
}

function eventPrecedesReference(event, referenceIndex, referenceScriptIndex) {
  return (
    event.scriptIndex < referenceScriptIndex ||
    (event.scriptIndex === referenceScriptIndex && event.index < referenceIndex)
  );
}

function bindingValueCanReachReference(binding, identifier, model) {
  const scriptIndex = model.scriptIndexesByNode.get(identifier) ?? 0;
  if (binding.scriptIndex < scriptIndex) return true;
  if (
    binding.scriptIndex === scriptIndex &&
    binding.declarationEnd <= identifier.pos
  ) {
    return true;
  }
  return referenceCanRunAfterBinding(identifier, binding, model);
}

function referenceCanRunAfterBinding(identifier, binding, model) {
  let scope = model.scopesByNode.get(identifier) ?? model.rootScope;
  while (scope !== null && scope !== binding.scope) {
    if (scope.kind === "function") {
      return executionContextCanRunAfterBinding(
        scope.executionContext,
        binding,
        model,
      );
    }
    scope = scope.parent;
  }
  return false;
}

function executionContextCanRunAfterBinding(context, binding, model) {
  const visited = new Set();
  const work = [context];
  while (work.length > 0) {
    const current = work.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const invocation of current.invocations) {
      if (invocation.context === model.rootScope) {
        if (
          invocation.scriptIndex > binding.scriptIndex ||
          (invocation.scriptIndex === binding.scriptIndex &&
            invocation.index >= binding.declarationEnd)
        ) {
          return true;
        }
      } else {
        work.push(invocation.context);
      }
    }
  }
  return false;
}

function isDirectAnchorCreation(expression, model) {
  if (
    expression.kind !== SyntaxKind.CallExpression ||
    expression.questionDotToken !== undefined ||
    expression.arguments?.length < 1 ||
    expression.arguments.length > 2
  ) {
    return false;
  }
  const target = readMemberAccess(expression.expression, model);
  return (
    target !== null &&
    target.name === "createElement" &&
    isUnshadowedGlobalIdentifier(target.receiver, "document", model) &&
    resolveStaticString(expression.arguments[0], model)?.toLowerCase() === "a"
  );
}

function readMemberAccess(expression, model) {
  const current = unwrapExpression(expression);
  if (
    current.kind === SyntaxKind.PropertyAccessExpression &&
    current.questionDotToken === undefined &&
    current.name?.kind === SyntaxKind.Identifier
  ) {
    return { name: current.name.text, receiver: current.expression };
  }
  if (
    current.kind === SyntaxKind.ElementAccessExpression &&
    current.questionDotToken === undefined
  ) {
    const name = resolveStaticString(current.argumentExpression, model);
    return name === null ? null : { name, receiver: current.expression };
  }
  return null;
}

function isUnshadowedGlobalIdentifier(expression, name, model) {
  const current = unwrapExpression(expression);
  if (current.kind !== SyntaxKind.Identifier || current.text !== name) return false;
  const resolved = lookupLexicalBinding(current, model);
  if (!resolved.found) return true;
  if (resolved.binding === null) return false;
  const scriptIndex = model.scriptIndexesByNode.get(current) ?? 0;
  if (resolved.binding.scriptIndex <= scriptIndex) return false;
  return !referenceCanRunAfterBinding(current, resolved.binding, model);
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current.kind === SyntaxKind.AsExpression ||
    current.kind === SyntaxKind.NonNullExpression ||
    current.kind === SyntaxKind.ParenthesizedExpression ||
    current.kind === SyntaxKind.SatisfiesExpression ||
    current.kind === SyntaxKind.TypeAssertionExpression
  ) {
    current = current.expression;
  }
  return current;
}

function visitAstIterative(root, visitor) {
  const work = [root];
  while (work.length > 0) {
    const node = work.pop();
    visitor(node);
    const children = [];
    node.forEachChild((child) => {
      children.push(child);
    });
    for (let index = children.length - 1; index >= 0; index -= 1) {
      work.push(children[index]);
    }
  }
}

function readVisibleText(artifact) {
  const parts = [];
  let index = 0;
  for (const element of extractArtifactTextElements(artifact, NON_VISIBLE_TEXT_ELEMENT_NAMES)) {
    parts.push(artifact.slice(index, element.start), " ");
    index = element.end;
  }
  parts.push(artifact.slice(index));
  return parts.join("");
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
  const paddingLength = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const decodedLength = (payload.length / 4) * 3 - paddingLength;
  if (
    payload.length > MAX_PNG_BASE64_CHARACTERS ||
    decodedLength > MAX_PNG_BYTES
  ) {
    issues.push(`${label} screenshot encoded PNG payload exceeds resource limit`);
    return null;
  }
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== payload) {
    issues.push(`${label} screenshot must contain non-empty strict base64 data`);
    return null;
  }
  if (mimeSubtype !== "png") {
    issues.push(`${label} screenshot evidence must use PNG`);
    return null;
  }
  const pngIssue = validatePng(bytes);
  if (pngIssue !== null) {
    issues.push(`${label} screenshot ${pngIssue}`);
    return null;
  }
  return createHash("sha256").update(bytes).digest("hex");
}

function validatePng(bytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length > MAX_PNG_BYTES) return "PNG payload exceeds resource limit";
  if (bytes.length < signature.length || !bytes.subarray(0, 8).equals(signature)) {
    return "PNG magic bytes are invalid";
  }

  const idatChunks = [];
  let header = null;
  let ihdrCount = 0;
  let iendCount = 0;
  let idatCount = 0;
  let zeroLengthIdatCount = 0;
  let compressedLength = 0;
  let idatFinished = false;
  let offset = signature.length;
  let chunkIndex = 0;

  while (offset < bytes.length) {
    if (chunkIndex >= MAX_PNG_CHUNKS) return "PNG chunk count exceeds limit";
    if (offset + 12 > bytes.length) return "must have valid PNG structure and chunk boundaries";
    const length = bytes.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > bytes.length) {
      return "must have valid PNG structure and chunk boundaries";
    }

    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    if (!isValidPngChunkType(typeBytes)) {
      return "must have valid PNG structure and chunk types";
    }
    if ((typeBytes[2] & 0x20) !== 0) return "PNG chunk type reserved bit must be zero";
    const type = typeBytes.toString("latin1");
    const data = bytes.subarray(dataStart, dataEnd);
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(typeBytes, data);
    if (actualCrc !== expectedCrc) return `PNG ${type} chunk CRC is invalid`;

    if (chunkIndex === 0 && type !== "IHDR") {
      return "must contain exactly one IHDR as the first chunk";
    }
    if (type === "IHDR") {
      ihdrCount += 1;
      if (ihdrCount !== 1 || chunkIndex !== 0 || data.length !== 13) {
        return "must contain exactly one IHDR as the first 13-byte chunk";
      }
      header = readPngHeader(data);
    } else if (type === "IDAT") {
      if (header === null || idatFinished) return "must contain contiguous IDAT chunks after IHDR";
      idatCount += 1;
      if (data.length === 0) {
        zeroLengthIdatCount += 1;
        if (zeroLengthIdatCount > MAX_ZERO_LENGTH_IDAT_CHUNKS) {
          return "zero-length IDAT chunk limit exceeded";
        }
      }
      compressedLength += data.length;
      if (compressedLength > MAX_PNG_COMPRESSED_BYTES) {
        return "compressed PNG payload exceeds limit";
      }
      if (data.length > 0) idatChunks.push(data);
    } else {
      if (idatCount > 0) idatFinished = true;
      if (type === "IEND") {
        iendCount += 1;
        if (iendCount !== 1 || data.length !== 0 || chunkEnd !== bytes.length) {
          return "must contain exactly one terminal empty IEND chunk";
        }
      } else if ((typeBytes[0] & 0x20) === 0) {
        return `contains unsupported critical PNG chunk ${type}`;
      }
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  if (ihdrCount !== 1 || header === null) return "must contain exactly one IHDR";
  if (idatCount === 0) return "must contain IDAT data";
  if (iendCount !== 1) return "must contain exactly one IEND";
  if (header.width < 640 || header.height < 1000 || header.height <= header.width) {
    return "must be at least 640 x 1000 in portrait orientation";
  }
  if (
    header.bitDepth !== 8 ||
    (header.colorType !== 2 && header.colorType !== 6) ||
    header.compression !== 0 ||
    header.filter !== 0 ||
    header.interlace !== 0
  ) {
    return "must be 8-bit RGB or RGBA without interlacing";
  }

  const bytesPerPixel = header.colorType === 6 ? 4 : 3;
  const pixelCount = header.width * header.height;
  const rowLength = header.width * bytesPerPixel;
  const expectedLength = header.height * (rowLength + 1);
  if (
    header.width > MAX_PNG_WIDTH ||
    header.height > MAX_PNG_HEIGHT ||
    !Number.isSafeInteger(pixelCount) ||
    pixelCount > MAX_PNG_PIXELS ||
    !Number.isSafeInteger(rowLength) ||
    !Number.isSafeInteger(expectedLength) ||
    expectedLength > MAX_PNG_INFLATED_BYTES
  ) {
    return "dimensions or decoded pixels exceed PNG resource limits";
  }

  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(idatChunks, compressedLength), {
      maxOutputLength: expectedLength,
    });
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      (error.code === "ERR_BUFFER_TOO_LARGE" || /maxOutputLength/i.test(error.message ?? ""))
    ) {
      return "IDAT data must inflate within expected output limit";
    }
    return "IDAT data must inflate successfully";
  }
  if (inflated.length !== expectedLength) {
    return `inflated scanline length must equal ${expectedLength} bytes`;
  }

  const pixels = unfilterPngScanlines(
    inflated,
    header.height,
    rowLength,
    bytesPerPixel,
  );
  if (pixels === null) return "scanline filter byte must be between 0 and 4";
  const variation = measureVisiblePixelVariation(
    pixels,
    header.width,
    header.height,
    bytesPerPixel,
  );
  if (!variation.visible) return "must contain nontrivial visible image variation";
  if (!variation.spatial) return "must contain spatially relevant image variation";
  return null;
}

function isValidPngChunkType(typeBytes) {
  return (
    typeBytes.length === 4 &&
    [...typeBytes].every(
      (byte) => (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a),
    )
  );
}

function readPngHeader(data) {
  return {
    bitDepth: data[8],
    colorType: data[9],
    compression: data[10],
    filter: data[11],
    height: data.readUInt32BE(4),
    interlace: data[12],
    width: data.readUInt32BE(0),
  };
}

function unfilterPngScanlines(inflated, height, rowLength, bytesPerPixel) {
  const pixels = Buffer.alloc(height * rowLength);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    if (filter === undefined || filter > 4) return null;
    const rowOffset = row * rowLength;
    for (let column = 0; column < rowLength; column += 1) {
      const encoded = inflated[sourceOffset] ?? 0;
      sourceOffset += 1;
      const left = column >= bytesPerPixel
        ? pixels[rowOffset + column - bytesPerPixel]
        : 0;
      const up = row > 0 ? pixels[rowOffset - rowLength + column] : 0;
      const upperLeft = row > 0 && column >= bytesPerPixel
        ? pixels[rowOffset - rowLength + column - bytesPerPixel]
        : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) predictor = paethPredictor(left, up, upperLeft);
      pixels[rowOffset + column] = (encoded + predictor) & 0xff;
    }
  }
  return pixels;
}

function paethPredictor(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function measureVisiblePixelVariation(pixels, width, height, bytesPerPixel) {
  const cellColumns = 8;
  const cellRows = 8;
  const cellCount = cellColumns * cellRows;
  const colorHistogram = new Uint32Array(16_384);
  const transitionCells = new Set();
  const visibleColors = new Set();
  const previousRow = new Uint32Array(width);
  let transitionCount = 0;

  for (let y = 0; y < height; y += 1) {
    const cellY = Math.min(cellRows - 1, Math.floor((y * cellRows) / height));
    let leftColor = null;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * bytesPerPixel;
      const color = readVisiblePixelColor(pixels, offset, bytesPerPixel);
      colorHistogram[readVisiblePixelBin(pixels, offset, bytesPerPixel)] += 1;
      if (visibleColors.size < 16) visibleColors.add(color);

      const cellX = Math.min(cellColumns - 1, Math.floor((x * cellColumns) / width));
      const cellIndex = cellY * cellColumns + cellX;
      if (leftColor !== null && color !== leftColor) {
        transitionCount += 1;
        transitionCells.add(cellIndex);
      }
      if (y > 0 && color !== previousRow[x]) {
        transitionCount += 1;
        transitionCells.add(cellIndex);
      }
      previousRow[x] = color;
      leftColor = color;
    }
  }

  let dominantBin = 0;
  for (let index = 1; index < colorHistogram.length; index += 1) {
    if (colorHistogram[index] > colorHistogram[dominantBin]) dominantBin = index;
  }
  const cellPixels = new Uint32Array(cellCount);
  const variedCellPixels = new Uint32Array(cellCount);
  let variedPixels = 0;
  for (let y = 0; y < height; y += 1) {
    const cellY = Math.min(cellRows - 1, Math.floor((y * cellRows) / height));
    for (let x = 0; x < width; x += 1) {
      const cellX = Math.min(cellColumns - 1, Math.floor((x * cellColumns) / width));
      const cellIndex = cellY * cellColumns + cellX;
      cellPixels[cellIndex] += 1;
      const offset = (y * width + x) * bytesPerPixel;
      if (readVisiblePixelBin(pixels, offset, bytesPerPixel) !== dominantBin) {
        variedPixels += 1;
        variedCellPixels[cellIndex] += 1;
      }
    }
  }

  const qualifiedCellRows = new Uint8Array(cellRows);
  const qualifiedCellColumns = new Uint8Array(cellColumns);
  let qualifiedCells = 0;
  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    if (variedCellPixels[cellIndex] * 50 < cellPixels[cellIndex]) continue;
    qualifiedCells += 1;
    qualifiedCellRows[Math.floor(cellIndex / cellColumns)] += 1;
    qualifiedCellColumns[cellIndex % cellColumns] += 1;
  }
  const denseRows = [...qualifiedCellRows].filter((count) => count >= 4).length;
  const denseColumns = [...qualifiedCellColumns].filter((count) => count >= 4).length;
  const minimumTransitions = Math.max(128, Math.ceil((width * height) / 2000));
  const minimumVariedPixels = Math.ceil((width * height) / 100);
  return {
    spatial:
      transitionCount >= minimumTransitions &&
      transitionCells.size >= 8 &&
      variedPixels >= minimumVariedPixels &&
      qualifiedCells >= 16 &&
      denseRows >= 4 &&
      denseColumns >= 4,
    visible: visibleColors.size >= 16,
  };
}

function readVisiblePixelBin(pixels, offset, bytesPerPixel) {
  const alpha = bytesPerPixel === 3 ? 0xff : pixels[offset + 3];
  const red = Math.round((pixels[offset] * alpha) / 0xff);
  const green = Math.round((pixels[offset + 1] * alpha) / 0xff);
  const blue = Math.round((pixels[offset + 2] * alpha) / 0xff);
  return (
    (alpha >> 6) * 0x1000 +
    (red >> 4) * 0x100 +
    (green >> 4) * 0x10 +
    (blue >> 4)
  );
}

function readVisiblePixelColor(pixels, offset, bytesPerPixel) {
  if (bytesPerPixel === 3) {
    return pixels[offset] * 0x10000 + pixels[offset + 1] * 0x100 + pixels[offset + 2];
  }
  const alpha = pixels[offset + 3];
  if (alpha === 0) return 0;
  const red = Math.round((pixels[offset] * alpha) / 0xff);
  const green = Math.round((pixels[offset + 1] * alpha) / 0xff);
  const blue = Math.round((pixels[offset + 2] * alpha) / 0xff);
  return red * 0x1000000 + green * 0x10000 + blue * 0x100 + alpha;
}

function crc32(...buffers) {
  let crc = 0xffffffff;
  for (const bytes of buffers) {
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
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
