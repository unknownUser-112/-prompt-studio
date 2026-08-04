import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const DIST_DIRECTORY = resolve("dist");
const OUTPUT_FILE = "Prompt-Studio-V600.0.0-Phase1-Foundation.html";
const V500_6_11_HTML_SHA256 =
  "d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7";
const V500_6_11_REPORT_SHA256 =
  "67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63";
const MAX_ARTIFACT_BYTES = 1_500_000;
const execFileAsync = promisify(execFile);

describe("V600 single-HTML artifact", () => {
  it("ships one offline, CSP-protected artifact with canonical baseline metadata", async () => {
    const entries = await readdir(DIST_DIRECTORY, { withFileTypes: true }).catch(
      (error: unknown) => {
        if (isMissingDirectoryError(error)) {
          return [];
        }

        throw error;
      },
    );
    const entryNames = entries.map((entry) => entry.name).sort();

    expect(entryNames).toEqual([OUTPUT_FILE]);

    const artifact = await readFile(resolve(DIST_DIRECTORY, OUTPUT_FILE), "utf8");
    expect(Buffer.byteLength(artifact)).toBeLessThan(MAX_ARTIFACT_BYTES);
    expect(artifact).toContain("default-src 'none'");
    expect(artifact).toContain("script-src 'unsafe-inline'");
    expect(artifact).toContain("style-src 'unsafe-inline'");
    expect(artifact).toContain("connect-src 'none'");
    expect(artifact).toMatch(/<style(?:\s[^>]*)?>[\s\S]+<\/style>/i);
    expect(artifact).toMatch(/<script(?:\s[^>]*)?>[\s\S]*\(\(\)\s*=>[\s\S]+<\/script>/i);
    expect(artifact).toContain(V500_6_11_HTML_SHA256);
    expect(artifact).toContain(V500_6_11_REPORT_SHA256);
    expect(artifact).not.toMatch(/<(?:script|link)\b[^>]+\bsrc\s*=/i);
    expect(artifact).not.toMatch(/<link\b/i);
    expect(artifact).not.toMatch(/https?:\/\//i);
    expect(artifact).not.toMatch(/(?:@import|url\()\s*['"]?(?!data:|blob:)/i);
  });

  it("removes foreign dist entries when rebuilding the artifact", async () => {
    const foreignOutput = resolve(DIST_DIRECTORY, "foreign-output.txt");
    await writeFile(foreignOutput, "foreign", "utf8");

    try {
      await runNodeScript("scripts/build.mjs");
      const entryNames = (await readdir(DIST_DIRECTORY)).sort();

      expect(entryNames).toEqual([OUTPUT_FILE]);
    } finally {
      await runNodeScript("scripts/build.mjs");
    }
  });

  it("rejects an artifact at the production byte limit", async () => {
    const outputPath = resolve(DIST_DIRECTORY, OUTPUT_FILE);
    const originalArtifact = await readFile(outputPath, "utf8");
    const padding = "x".repeat(MAX_ARTIFACT_BYTES - Buffer.byteLength(originalArtifact));
    const oversizedArtifact = originalArtifact.replace("</body>", `${padding}</body>`);

    try {
      await writeFile(outputPath, oversizedArtifact, "utf8");

      await expect(runNodeScript("scripts/verify-single-html.mjs")).rejects.toThrow(
        "VERIFY_SINGLE_HTML_SIZE_LIMIT_EXCEEDED",
      );
    } finally {
      await writeFile(outputPath, originalArtifact, "utf8");
    }
  });

  it("rejects a source build at the production byte limit", async () => {
    const stylesPath = resolve("src/ui/styles.css");
    const originalStyles = await readFile(stylesPath, "utf8");
    const oversizedStyles = `${originalStyles}\n/* ${"x".repeat(MAX_ARTIFACT_BYTES)} */\n`;

    try {
      await writeFile(stylesPath, oversizedStyles, "utf8");

      await expect(runNodeScript("scripts/build.mjs")).rejects.toThrow(
        "BUILD_ARTIFACT_SIZE_LIMIT_EXCEEDED",
      );
    } finally {
      await writeFile(stylesPath, originalStyles, "utf8");
      await runNodeScript("scripts/build.mjs");
    }
  });
});

function isMissingDirectoryError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function runNodeScript(scriptPath: string): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return execFileAsync(process.execPath, [scriptPath]);
}
