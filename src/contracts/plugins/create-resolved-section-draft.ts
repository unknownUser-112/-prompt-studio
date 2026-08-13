import type { PromptFragmentDraft, PromptSectionDraft } from "../../domain/contracts/prompt/providers";
import type { JsonValue } from "../../domain/contracts/prompt/prompt-document";
import type { ResolvedState } from "../../domain/contracts/resolved-state/resolved-state";

export function createResolvedSectionDraft(
  state: ResolvedState,
  sourcePluginId: string,
  text: string,
  fragments?: readonly PromptFragmentDraft[],
): PromptSectionDraft {
  const trace = tracesForPlugin(state, sourcePluginId);
  return {
    slotId: sourcePluginId,
    sourcePluginId,
    text,
    value: trace.map((entry) => ({ path: entry.path, value: readResolvedValue(state.values, entry.path) })),
    traceIds: trace.map((entry) => entry.id),
    ...(fragments === undefined ? {} : { fragments }),
  };
}

export function createResolvedFragmentDraft(
  state: ResolvedState,
  sourcePluginId: string,
  id: string,
  text: string,
  paths?: readonly string[],
): PromptFragmentDraft {
  const trace = paths === undefined
    ? tracesForPlugin(state, sourcePluginId)
    : paths.map((path) => {
      const entry = state.trace.entries.find((candidate) => candidate.path === path);
      if (entry === undefined) throw new Error(`Resolved trace is missing for prompt fragment path: ${path}`);
      return entry;
    }).sort((left, right) => compareCodeUnits(left.id, right.id));
  return { id, text, traceIds: trace.map((entry) => entry.id) };
}

function tracesForPlugin(state: ResolvedState, sourcePluginId: string) {
  return state.trace.entries
    .filter((entry) => entry.sourcePluginId === sourcePluginId)
    .slice()
    .sort((left, right) => compareCodeUnits(left.id, right.id));
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

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
