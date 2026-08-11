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
const NAMED_HTML_CHARACTER_REFERENCES = new Map([
  ["AMP", "&"],
  ["AMP;", "&"],
  ["GT", ">"],
  ["GT;", ">"],
  ["LT", "<"],
  ["LT;", "<"],
  ["NewLine;", "\n"],
  ["NonBreakingSpace;", "\u00a0"],
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
  ["nbsp", "\u00a0"],
  ["nbsp;", "\u00a0"],
  ["quot", '"'],
  ["quot;", '"'],
]);
const NAMED_HTML_CHARACTER_REFERENCE_NAMES = [...NAMED_HTML_CHARACTER_REFERENCES.keys()]
  .sort((left, right) => right.length - left.length);
const RAW_TEXT_ELEMENTS = new Set(["noframes", "noscript", "script", "style", "title"]);
const FOREIGN_CONTENT_ROOT_NAMES = new Set(["math", "svg"]);
const POLICY_LATE_ELEMENTS = new Set(["script", "style"]);
const HEAD_CONTENT_ELEMENTS = new Set([
  "base",
  "basefont",
  "bgsound",
  "link",
  "meta",
  "noframes",
  "noscript",
  "script",
  "style",
  "template",
  "title",
]);
const AFTER_HEAD_POINTER_ELEMENTS = new Set([
  "base",
  "basefont",
  "bgsound",
  "link",
  "meta",
  "noframes",
  "script",
  "style",
  "template",
  "title",
]);
const RESOURCE_LOADING_ATTRIBUTES = new Map([
  ["audio", ["src"]],
  ["embed", ["src"]],
  ["iframe", ["src"]],
  ["img", ["src", "srcset"]],
  ["input", ["src"]],
  ["link", ["href", "imagesrcset"]],
  ["object", ["data"]],
  ["source", ["src", "srcset"]],
  ["track", ["src"]],
  ["video", ["poster", "src"]],
]);

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
  let headFound = false;
  let mode = "before-head";
  let policyIsLate = false;

  for (const token of scanHtmlTokens(html)) {
    if (token.type === "characters") {
      if (
        mode !== "in-body" &&
        [...decodeHtmlCharacterData(token.data)].some(
          (character) => !isHtmlWhitespace(character),
        )
      ) {
        mode = "in-body";
      }
      continue;
    }

    const tag = token;
    if (tag.closing) {
      if (mode === "in-head" && tag.name === "head") {
        mode = "after-head";
      } else if (
        mode !== "in-body" &&
        (tag.name === "body" || tag.name === "html" || tag.name === "br")
      ) {
        mode = "in-body";
      }
      continue;
    }

    if (mode === "before-head") {
      if (tag.name === "html") continue;
      if (tag.name === "head" && !headFound) {
        headFound = true;
        mode = "in-head";
      } else {
        mode = "in-body";
      }
      continue;
    }

    if (mode === "in-body") continue;

    if (tag.name === "head") {
      continue;
    }
    if (tag.name === "body") {
      mode = "in-body";
      continue;
    }
    if (tag.name === "html") continue;

    const acceptedInHead = mode === "in-head"
      ? HEAD_CONTENT_ELEMENTS.has(tag.name)
      : AFTER_HEAD_POINTER_ELEMENTS.has(tag.name);
    if (!acceptedInHead) {
      mode = "in-body";
      continue;
    }

    if (tag.name === "meta") {
      const parsedAttributes = parseAttributes(tag.raw);
      const attributes = parsedAttributes.attributes;
      const httpEquiv = attributes.get("http-equiv")?.toLowerCase();
      const looksLikeCsp =
        /\bhttp-equiv\b/i.test(tag.raw) &&
        /content-security-policy/i.test(decodeHtmlAttributeValue(tag.raw));
      if (looksLikeCsp || httpEquiv === "content-security-policy") {
        issues.push(...parsedAttributes.issues);
        if (tag.unterminated) {
          issues.push({
            code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
            detail: "unterminated CSP meta tag",
          });
        }
        if (looksLikeCsp && httpEquiv !== "content-security-policy") {
          issues.push({
            code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
            detail: "could not parse CSP http-equiv attribute",
          });
        }
        if (httpEquiv === "content-security-policy") {
          if (policyIsLate) {
            issues.push({
              code: "CSP_META_TOO_LATE",
              detail: "CSP meta must precede script, style and resource-loading content",
            });
          }
          const content = attributes.get("content");
          if (content === undefined) {
            issues.push({
              code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
              detail: "CSP meta content attribute is missing",
            });
          } else {
            policies.push(content);
          }
        }
      }
      if (isResourceLoadingTag(tag, attributes)) policyIsLate = true;
      continue;
    }

    if (POLICY_LATE_ELEMENTS.has(tag.name) || isResourceLoadingTag(tag)) {
      policyIsLate = true;
    }
  }
  return { policies, issues };
}

function* scanHtmlTokens(html) {
  const foreignContentRoots = [];
  let templateDepth = 0;
  let index = 0;
  while (index < html.length) {
    const tagStart = html.indexOf("<", index);
    if (tagStart === -1) {
      if (templateDepth === 0 && index < html.length) {
        yield { data: html.slice(index), type: "characters" };
      }
      return;
    }

    if (templateDepth === 0 && tagStart > index) {
      yield { data: html.slice(index, tagStart), type: "characters" };
    }

    if (html.startsWith("<!--", tagStart)) {
      index = skipHtmlComment(html, tagStart);
      continue;
    }

    if (
      foreignContentRoots.length > 0 &&
      html.startsWith("<![CDATA[", tagStart)
    ) {
      index = skipCdataSection(html, tagStart);
      continue;
    }

    if (html[tagStart + 1] === "!" || html[tagStart + 1] === "?") {
      index = skipBogusMarkup(html, tagStart + 2);
      continue;
    }

    const tag = readHtmlTag(html, tagStart);
    if (tag === null) {
      if (templateDepth === 0) yield { data: "<", type: "characters" };
      index = tagStart + 1;
      continue;
    }
    index = tag.end;

    if (foreignContentRoots.length > 0) {
      updateForeignContent(tag, foreignContentRoots);
      continue;
    }

    if (templateDepth > 0) {
      if (!tag.closing && FOREIGN_CONTENT_ROOT_NAMES.has(tag.name)) {
        if (!tag.selfClosing) foreignContentRoots.push(tag.name);
        continue;
      }
      if (!tag.closing && RAW_TEXT_ELEMENTS.has(tag.name)) {
        index = skipRawTextElement(html, index, tag.name);
        continue;
      }
      if (!tag.closing && tag.name === "template") {
        templateDepth += 1;
        continue;
      }
      if (tag.closing && tag.name === "template") templateDepth -= 1;
      continue;
    }

    yield { ...tag, type: "tag" };
    if (!tag.closing && FOREIGN_CONTENT_ROOT_NAMES.has(tag.name)) {
      if (!tag.selfClosing) foreignContentRoots.push(tag.name);
      continue;
    }
    if (!tag.closing && tag.name === "template") {
      templateDepth = 1;
      continue;
    }
    if (!tag.closing && RAW_TEXT_ELEMENTS.has(tag.name)) {
      index = skipRawTextElement(html, index, tag.name);
    }
  }
}

function updateForeignContent(tag, foreignContentRoots) {
  if (tag.closing) {
    const rootIndex = foreignContentRoots.lastIndexOf(tag.name);
    if (rootIndex !== -1) foreignContentRoots.length = rootIndex;
    return;
  }
  if (FOREIGN_CONTENT_ROOT_NAMES.has(tag.name) && !tag.selfClosing) {
    foreignContentRoots.push(tag.name);
  }
}

function readHtmlTag(html, start) {
  let index = start + 1;
  const closing = html[index] === "/";
  if (closing) {
    index += 1;
  }

  const nameStart = index;
  if (!/[a-z]/i.test(html[index] ?? "")) return null;
  index += 1;
  while (
    index < html.length &&
    !isHtmlWhitespace(html[index]) &&
    html[index] !== "/" &&
    html[index] !== ">"
  ) {
    index += 1;
  }
  const name = html.slice(nameStart, index).toLowerCase();
  const tail = readHtmlTagTail(html, index);
  return {
    closing,
    end: tail.end,
    name,
    raw: html.slice(start, tail.end),
    selfClosing: !closing && tail.selfClosing,
    unterminated: tail.unterminated,
  };
}

function readHtmlTagTail(html, start) {
  let index = start;
  let state = "before-attribute-name";
  while (index < html.length) {
    const character = html[index];
    if (state === "before-attribute-name") {
      if (isHtmlWhitespace(character)) {
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
      } else {
        state = "attribute-name";
      }
      continue;
    }
    if (state === "attribute-name") {
      if (isHtmlWhitespace(character)) {
        state = "after-attribute-name";
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === "=") {
        state = "before-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
      } else {
        index += 1;
      }
      continue;
    }
    if (state === "after-attribute-name") {
      if (isHtmlWhitespace(character)) {
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === "=") {
        state = "before-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
      } else {
        state = "attribute-name";
      }
      continue;
    }
    if (state === "before-attribute-value") {
      if (isHtmlWhitespace(character)) {
        index += 1;
      } else if (character === '"') {
        state = "double-quoted-attribute-value";
        index += 1;
      } else if (character === "'") {
        state = "single-quoted-attribute-value";
        index += 1;
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
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
      if (isHtmlWhitespace(character)) {
        state = "before-attribute-name";
        index += 1;
      } else if (character === "/") {
        state = "self-closing-start-tag";
        index += 1;
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
      } else {
        state = "before-attribute-name";
      }
      continue;
    }
    if (state === "unquoted-attribute-value") {
      if (isHtmlWhitespace(character)) {
        state = "before-attribute-name";
      } else if (character === ">") {
        return { end: index + 1, selfClosing: false, unterminated: false };
      }
      index += 1;
      continue;
    }
    if (character === ">") {
      return { end: index + 1, selfClosing: true, unterminated: false };
    }
    state = "before-attribute-name";
  }
  return { end: html.length, selfClosing: false, unterminated: true };
}

function skipCdataSection(html, start) {
  const end = html.indexOf("]]>", start + "<![CDATA[".length);
  return end === -1 ? html.length : end + "]]>".length;
}

function skipRawTextElement(html, start, name) {
  const lowerHtml = html.toLowerCase();
  if (name === "script") {
    const candidate = findScriptDataEndTag(lowerHtml, start);
    if (candidate === -1) return html.length;
    const tag = readHtmlTag(html, candidate);
    return tag?.end ?? html.length;
  }
  const needle = `</${name}`;
  let searchIndex = start;
  while (searchIndex < html.length) {
    const candidate = lowerHtml.indexOf(needle, searchIndex);
    if (candidate === -1) return html.length;
    const next = html[candidate + needle.length];
    if (next === ">" || next === "/" || isHtmlWhitespace(next)) {
      const tag = readHtmlTag(html, candidate);
      if (tag !== null && tag.closing && tag.name === name) return tag.end;
    }
    searchIndex = candidate + needle.length;
  }
  return html.length;
}

function findScriptDataEndTag(lowerHtml, start) {
  let index = start;
  let state = "data";
  while (index < lowerHtml.length) {
    if (state === "data") {
      if (lowerHtml.startsWith("<!--", index)) {
        state = "escaped";
        index += 4;
        continue;
      }
      if (isScriptEndTagAt(lowerHtml, index)) return index;
      index += 1;
      continue;
    }

    if (state === "escaped-dash") {
      if (lowerHtml[index] === "-") {
        state = "escaped-dash-dash";
        index += 1;
      } else {
        state = "escaped";
      }
      continue;
    }
    if (state === "escaped-dash-dash") {
      if (lowerHtml[index] === "-") {
        index += 1;
      } else if (lowerHtml[index] === ">") {
        state = "data";
        index += 1;
      } else {
        state = "escaped";
      }
      continue;
    }
    if (state === "escaped") {
      if (isScriptEndTagAt(lowerHtml, index)) return index;
      if (isScriptDoubleEscapeStartAt(lowerHtml, index)) {
        state = "double-escaped";
        index += "<script".length;
        continue;
      }
      if (lowerHtml[index] === "-") {
        state = "escaped-dash";
      }
      index += 1;
      continue;
    }

    if (state === "double-escaped-dash") {
      if (lowerHtml[index] === "-") {
        state = "double-escaped-dash-dash";
        index += 1;
      } else {
        state = "double-escaped";
      }
      continue;
    }
    if (state === "double-escaped-dash-dash") {
      if (lowerHtml[index] === "-") {
        index += 1;
      } else if (lowerHtml[index] === ">") {
        state = "double-escaped";
        index += 1;
      } else {
        state = "double-escaped";
      }
      continue;
    }
    if (isScriptEndTagAt(lowerHtml, index)) {
      state = "escaped";
      index += "</script".length;
      continue;
    }
    if (lowerHtml[index] === "-") state = "double-escaped-dash";
    index += 1;
  }
  return -1;
}

function isScriptDoubleEscapeStartAt(lowerHtml, index) {
  if (!lowerHtml.startsWith("<script", index)) return false;
  return isScriptTagNameDelimiter(lowerHtml[index + "<script".length]);
}

function isScriptEndTagAt(lowerHtml, index) {
  if (!lowerHtml.startsWith("</script", index)) return false;
  return isScriptTagNameDelimiter(lowerHtml[index + "</script".length]);
}

function isScriptTagNameDelimiter(character) {
  return character === ">" || character === "/" || isHtmlWhitespace(character);
}

function skipHtmlComment(html, start) {
  let index = start + 4;
  let state = "start";
  while (index < html.length) {
    const character = html[index];
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
  return html.length;
}

function skipBogusMarkup(html, start) {
  const end = html.indexOf(">", start);
  return end === -1 ? html.length : end + 1;
}

function isResourceLoadingTag(tag, parsedAttributes) {
  const resourceAttributes = RESOURCE_LOADING_ATTRIBUTES.get(tag.name);
  if (resourceAttributes === undefined) {
    if (tag.name !== "meta") return false;
    const attributes = parsedAttributes ?? parseAttributes(tag.raw).attributes;
    return attributes.get("http-equiv")?.toLowerCase() === "refresh";
  }
  const attributes = parsedAttributes ?? parseAttributes(tag.raw).attributes;
  return resourceAttributes.some((attribute) => {
    const value = attributes.get(attribute);
    return value !== undefined && value.length > 0;
  });
}

function parseAttributes(tag) {
  const attributes = new Map();
  const issues = [];
  let index = 1;
  while (/[a-z0-9:-]/i.test(tag[index] ?? "")) index += 1;
  while (index < tag.length) {
    while (isHtmlWhitespace(tag[index])) index += 1;
    if (tag[index] === ">" || (tag[index] === "/" && tag[index + 1] === ">")) break;

    const nameStart = index;
    while (
      index < tag.length &&
      !isHtmlWhitespace(tag[index]) &&
      !/[=/>]/.test(tag[index] ?? "")
    ) {
      index += 1;
    }
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
    while (isHtmlWhitespace(tag[index])) index += 1;
    if (tag[index] !== "=") {
      issues.push({
        code: "CSP_META_ATTRIBUTE_SYNTAX_INVALID",
        detail: `${normalizedName} has no value`,
      });
      recordAttribute(attributes, issues, normalizedName, "");
      continue;
    }

    index += 1;
    while (isHtmlWhitespace(tag[index])) index += 1;
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
      while (
        index < tag.length &&
        !isHtmlWhitespace(tag[index]) &&
        tag[index] !== ">"
      ) {
        index += 1;
      }
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
  return decodeHtmlCharacterReferences(value, "attribute");
}

function decodeHtmlCharacterData(value) {
  return decodeHtmlCharacterReferences(value, "data");
}

function decodeHtmlCharacterReferences(value, context) {
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
      const codePoint = numeric[1] !== undefined
        ? Number.parseInt(numeric[1], 16)
        : Number.parseInt(numeric[2], 10);
      decoded += decodeCodePoint(codePoint, numeric[0]);
      index += numeric[0].length;
      continue;
    }
    const name = NAMED_HTML_CHARACTER_REFERENCE_NAMES.find((candidate) =>
      value.startsWith(candidate, index + 1),
    );
    if (name === undefined) {
      decoded += "&";
      index += 1;
      continue;
    }
    const next = value[index + name.length + 1];
    if (
      context === "attribute" &&
      !name.endsWith(";") &&
      /[=a-z0-9]/i.test(next ?? "")
    ) {
      decoded += "&";
      index += 1;
      continue;
    }
    decoded += NAMED_HTML_CHARACTER_REFERENCES.get(name);
    index += name.length + 1;
  }
  return decoded;
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
  if ([...policy].some((character) => /\s/u.test(character) && !isCspWhitespace(character))) {
    issues.push({
      code: "CSP_POLICY_ASCII_WHITESPACE_INVALID",
      detail: "CSP separates tokens with ASCII whitespace only",
    });
  }
  for (const rawDirective of policy.split(";")) {
    const tokens = trimCspWhitespace(rawDirective)
      .split(/[\u0009\u000a\u000c\u000d\u0020]+/)
      .filter(Boolean);
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

function isHtmlWhitespace(character) {
  return (
    character === "\t" ||
    character === "\n" ||
    character === "\f" ||
    character === "\r" ||
    character === " "
  );
}

function isCspWhitespace(character) {
  return isHtmlWhitespace(character);
}

function trimCspWhitespace(value) {
  return value.replace(/^[\u0009\u000a\u000c\u000d\u0020]+|[\u0009\u000a\u000c\u000d\u0020]+$/g, "");
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
