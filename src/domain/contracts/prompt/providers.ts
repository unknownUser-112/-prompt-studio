import type { ResolvedState } from "../resolved-state/resolved-state";
import type { JsonValue } from "./prompt-document";

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export interface PromptSectionDraft {
  readonly slotId: string;
  readonly sourcePluginId: string;
  readonly text: string;
  readonly value: JsonValue;
  readonly traceIds: readonly string[];
}

function readResolvedValue(values: JsonValue, path: string): JsonValue {
  return path.split(".").reduce<JsonValue>((current, segment) => {
    if (current === null || Array.isArray(current) || typeof current !== "object") {
      throw new Error(`Resolved value is missing for traced path: ${path}`);
    }
    const value = (current as Readonly<Record<string, JsonValue>>)[segment];
    if (value === undefined) throw new Error(`Resolved value is missing for traced path: ${path}`);
    return value;
  }, values);
}

export function createResolvedSectionDraft(
  state: ResolvedState,
  sourcePluginId: string,
  text: string,
): PromptSectionDraft {
  const trace = state.trace.entries
    .filter((entry) => entry.sourcePluginId === sourcePluginId)
    .slice()
    .sort((left, right) => compareCodeUnits(left.id, right.id));
  return {
    slotId: sourcePluginId,
    sourcePluginId,
    text,
    value: trace.map((entry) => ({ path: entry.path, value: readResolvedValue(state.values, entry.path) })),
    traceIds: trace.map((entry) => entry.id),
  };
}
