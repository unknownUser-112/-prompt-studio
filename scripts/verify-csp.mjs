import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const REQUIRED_POLICY = new Map([
  ["default-src", ["'none'"]],
  ["script-src", ["'unsafe-inline'"]],
  ["style-src", ["'unsafe-inline'"]],
  ["img-src", ["data:", "blob:"]],
  ["connect-src", ["'none'"]],
  ["font-src", ["'none'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'none'"]],
  ["form-action", ["'none'"]],
  ["worker-src", ["blob:"]],
]);
const NON_NETWORK_SOURCES = new Set(["'none'", "'unsafe-inline'", "data:", "blob:"]);

try {
  const artifactPath = readArtifactPath(process.argv.slice(2));
  const artifact = await readFile(resolvePath(artifactPath), "utf8");
  const parsedMeta = findPolicies(artifact);
  const policies = parsedMeta.policies;
  const issues = [...parsedMeta.issues];

  if (policies.length !== 1) {
    issues.push({ code: "CSP_POLICY_COUNT_INVALID", detail: `found ${policies.length}` });
  } else {
    const parsed = parsePolicy(policies[0]);
    issues.push(...parsed.issues);
    issues.push(...verifyRequiredPolicy(parsed.directives));
    issues.push(...findNetworkSources(parsed.directives));
  }

  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue.code}: ${issue.detail}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`CSP_OK ${artifactPath}\n`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`CSP_FATAL: ${message}\n`);
  process.exitCode = 1;
}

function readArtifactPath(arguments_) {
  if (arguments_.length !== 1 || arguments_[0]?.startsWith("--")) {
    throw new Error("CSP_USAGE_INVALID expected one HTML artifact path");
  }
  return arguments_[0];
}

function findPolicies(html) {
  const policies = [];
  const issues = [];
  for (const tagMatch of html.matchAll(/<meta\b[^>]*>/gi)) {
    const parsedAttributes = parseAttributes(tagMatch[0]);
    const attributes = parsedAttributes.attributes;
    issues.push(...parsedAttributes.issues);
    if (attributes.get("http-equiv")?.toLowerCase() === "content-security-policy") {
      const content = attributes.get("content");
      if (content !== undefined) policies.push(content);
    }
  }
  return { policies, issues };
}

function parseAttributes(tag) {
  const attributes = new Map();
  const issues = [];
  for (const match of tag.matchAll(/([a-z][a-z0-9:-]*)\s*=\s*(["'])([\s\S]*?)\2/gi)) {
    const name = match[1];
    const value = match[3];
    if (name === undefined || value === undefined) continue;
    const normalizedName = name.toLowerCase();
    if (attributes.has(normalizedName)) {
      issues.push({ code: "CSP_DUPLICATE_ATTRIBUTE", detail: normalizedName });
      continue;
    }
    attributes.set(normalizedName, value);
  }
  return { attributes, issues };
}

function parsePolicy(policy) {
  const directives = new Map();
  const issues = [];
  for (const rawDirective of policy.split(";")) {
    const tokens = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const name = tokens[0].toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      issues.push({ code: "CSP_DIRECTIVE_NAME_INVALID", detail: name });
      continue;
    }
    if (directives.has(name)) {
      issues.push({ code: "CSP_DUPLICATE_DIRECTIVE", detail: name });
      continue;
    }
    directives.set(name, tokens.slice(1));
  }
  return { directives, issues };
}

function verifyRequiredPolicy(directives) {
  const issues = [];
  for (const [directive, requiredSources] of REQUIRED_POLICY) {
    const actualSources = directives.get(directive);
    if (actualSources === undefined) {
      issues.push({ code: "CSP_REQUIRED_DIRECTIVE_MISSING", detail: directive });
      continue;
    }
    if (
      requiredSources.length !== actualSources.length ||
      requiredSources.some((source) => !actualSources.includes(source))
    ) {
      issues.push({
        code: "CSP_REQUIRED_DIRECTIVE_INVALID",
        detail: `${directive} expected ${requiredSources.join(" ")}, received ${actualSources.join(" ")}`,
      });
    }
  }
  return issues;
}

function findNetworkSources(directives) {
  const issues = [];
  for (const [directive, sources] of directives) {
    for (const source of sources) {
      if (!NON_NETWORK_SOURCES.has(source)) {
        issues.push({
          code: "CSP_NETWORK_SOURCE_FORBIDDEN",
          detail: `${directive} ${source}`,
        });
      }
    }
  }
  return issues;
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(filePath);
}
