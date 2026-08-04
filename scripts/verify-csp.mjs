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
    const httpEquiv = attributes.get("http-equiv")?.toLowerCase();
    const looksLikeCsp = /content-security-policy/i.test(tagMatch[0]);
    if (looksLikeCsp && httpEquiv !== "content-security-policy") {
      issues.push({
        code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
        detail: "could not parse CSP http-equiv attribute",
      });
    }
    if (httpEquiv === "content-security-policy") {
      const content = attributes.get("content");
      if (content !== undefined) policies.push(content);
    }
  }
  return { policies, issues };
}

function parseAttributes(tag) {
  const attributes = new Map();
  const issues = [];
  let index = /^<meta\b/i.exec(tag)?.[0].length ?? 0;
  while (index < tag.length) {
    while (/\s/.test(tag[index] ?? "")) index += 1;
    if (tag[index] === ">" || (tag[index] === "/" && tag[index + 1] === ">")) break;

    const nameStart = index;
    while (index < tag.length && !/[\s=/>]/.test(tag[index] ?? "")) index += 1;
    const rawName = tag.slice(nameStart, index);
    if (!/^[a-z][a-z0-9:-]*$/i.test(rawName)) {
      issues.push({
        code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
        detail: `invalid attribute near offset ${nameStart}`,
      });
      index = Math.max(index + 1, nameStart + 1);
      continue;
    }

    const normalizedName = rawName.toLowerCase();
    while (/\s/.test(tag[index] ?? "")) index += 1;
    if (tag[index] !== "=") {
      issues.push({
        code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
        detail: `${normalizedName} has no value`,
      });
      recordAttribute(attributes, issues, normalizedName, "");
      continue;
    }

    index += 1;
    while (/\s/.test(tag[index] ?? "")) index += 1;
    const quote = tag[index];
    let value = "";
    if (quote === '"' || quote === "'") {
      index += 1;
      const valueStart = index;
      while (index < tag.length && tag[index] !== quote) index += 1;
      if (index >= tag.length) {
        issues.push({
          code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
          detail: `${normalizedName} has an unterminated quoted value`,
        });
        value = tag.slice(valueStart);
      } else {
        value = tag.slice(valueStart, index);
        index += 1;
      }
    } else {
      const valueStart = index;
      while (index < tag.length && !/[\s>]/.test(tag[index] ?? "")) index += 1;
      value = tag.slice(valueStart, index);
      if (value.length === 0 || /["'<=`]/.test(value)) {
        issues.push({
          code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
          detail: `${normalizedName} has an invalid unquoted value`,
        });
      }
    }
    recordAttribute(
      attributes,
      issues,
      normalizedName,
      decodeHtmlAttributeValue(value),
    );
  }
  return { attributes, issues };
}

function recordAttribute(attributes, issues, name, value) {
  if (attributes.has(name)) {
    issues.push({ code: "CSP_DUPLICATE_ATTRIBUTE", detail: name });
    return;
  }
  attributes.set(name, value);
}

function decodeHtmlAttributeValue(value) {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|quot|apos|amp|lt|gt);/gi,
    (entity, decimal, hexadecimal) => {
      if (decimal !== undefined) return decodeCodePoint(Number.parseInt(decimal, 10), entity);
      if (hexadecimal !== undefined) {
        return decodeCodePoint(Number.parseInt(hexadecimal, 16), entity);
      }
      const named = {
        "&amp;": "&",
        "&apos;": "'",
        "&gt;": ">",
        "&lt;": "<",
        "&quot;": '"',
      };
      return named[entity.toLowerCase()] ?? entity;
    },
  );
}

function decodeCodePoint(codePoint, fallback) {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
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
