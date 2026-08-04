import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUTPUT_FILE = "Prompt-Studio-V600.0.0-Phase1-Foundation.html";
const DIST_DIRECTORY = resolve("dist");
const MAX_ARTIFACT_BYTES = 1_500_000;
const V500_6_11_HTML_SHA256 =
  "d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7";
const V500_6_11_REPORT_SHA256 =
  "67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63";

const entries = await readdir(DIST_DIRECTORY, { withFileTypes: true });
const entryNames = entries.map((entry) => entry.name).sort();

if (JSON.stringify(entryNames) !== JSON.stringify([OUTPUT_FILE])) {
  throw new Error("VERIFY_SINGLE_HTML_FILE_COUNT_INVALID");
}

const artifact = await readFile(resolve(DIST_DIRECTORY, OUTPUT_FILE), "utf8");

if (Buffer.byteLength(artifact) >= MAX_ARTIFACT_BYTES) {
  throw new Error("VERIFY_SINGLE_HTML_SIZE_LIMIT_EXCEEDED");
}

const requiredFragments = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "connect-src 'none'",
  V500_6_11_HTML_SHA256,
  V500_6_11_REPORT_SHA256,
];

if (
  requiredFragments.some((fragment) => !artifact.includes(fragment)) ||
  !/<style(?:\s[^>]*)?>[\s\S]+<\/style>/i.test(artifact) ||
  !/<script(?:\s[^>]*)?>[\s\S]*\(\(\)\s*=>[\s\S]+<\/script>/i.test(artifact) ||
  /<(?:script|link)\b[^>]+\bsrc\s*=/i.test(artifact) ||
  /<link\b/i.test(artifact) ||
  /https?:\/\//i.test(artifact) ||
  /(?:@import|url\()\s*['"]?(?!data:|blob:)/i.test(artifact)
) {
  throw new Error("VERIFY_SINGLE_HTML_CONTRACT_INVALID");
}

process.stdout.write(`Verified dist/${OUTPUT_FILE}\n`);
