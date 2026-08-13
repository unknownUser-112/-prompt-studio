import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { DomainObject, DomainValue } from "../entities/project";
import type { NormalizedFacts } from "../contracts/resolved-state/facts";
import type { ResolutionDiagnostic, ResolvedState, ResolvedStateAssignment, ResolvedStateBuilder } from "../contracts/resolved-state/resolved-state";
import { createResolutionTrace } from "./resolution-trace";

export async function buildResolvedState(
  input: unknown,
  assignments: readonly ResolvedStateAssignment[],
  runtime: RuntimeEnvironment,
  diagnostics: readonly ResolutionDiagnostic[] = [],
): Promise<ResolvedState> {
  const facts = normalizeFacts(input);
  const values = buildValues(assignments);
  const trace = createResolutionTrace(assignments);
  const stateWithoutHash = { diagnostics: [...diagnostics], facts, trace, values };
  const stateHash = await runtime.hashProvider.sha256(
    new TextEncoder().encode(canonicalSerialize(stateWithoutHash)),
  );

  return deepFreeze({ ...stateWithoutHash, stateHash });
}

export function normalizeFacts(input: unknown): NormalizedFacts {
  return deepFreeze({ values: normalizeObject(input) });
}

export function buildResolvedValues(assignments: readonly ResolvedStateAssignment[]): DomainObject {
  return deepFreeze(buildValues(assignments));
}

export function createResolvedStateBuilder(): ResolvedStateBuilder {
  return {
    build: buildResolvedState,
    buildResolvedValues,
    normalizeFacts,
    readFact,
  };
}

export function readFact(facts: NormalizedFacts, path: string): DomainValue | undefined {
  return path.split(".").reduce<DomainValue | undefined>((current, segment) => {
    if (current === null || Array.isArray(current) || typeof current !== "object") return undefined;
    return (current as Readonly<Record<string, DomainValue>>)[segment];
  }, facts.values);
}

function normalizeObject(input: unknown): DomainObject {
  if (input === null || Array.isArray(input) || typeof input !== "object") {
    throw new Error("Constraint input must be a plain object");
  }

  const object = input as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(object).sort().map((key) => [key, normalizeValue(object[key])]),
  ) as DomainObject;
}

function normalizeValue(value: unknown): DomainValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").normalize("NFC");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Facts must not contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") return normalizeObject(value);
  throw new Error("Facts must contain only domain values");
}

function buildValues(assignments: readonly ResolvedStateAssignment[]): DomainObject {
  const values: Record<string, DomainValue> = {};
  for (const assignment of assignments) setValue(values, assignment.path, assignment.value);
  return values;
}

function setValue(target: Record<string, DomainValue>, path: string, value: DomainValue): void {
  const segments = path.split(".");
  if (segments.some((segment) => segment.length === 0)) throw new Error(`Invalid resolved path: ${path}`);
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment];
    if (existing === undefined) {
      const created: Record<string, DomainValue> = {};
      current[segment] = created;
      current = created;
      continue;
    }
    if (existing === null || Array.isArray(existing) || typeof existing !== "object") {
      throw new Error(`Resolved path conflicts with a value: ${path}`);
    }
    current = existing as Record<string, DomainValue>;
  }
  current[segments.at(-1) ?? path] = value;
}

function canonicalSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalSerialize(object[key])}`).join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
