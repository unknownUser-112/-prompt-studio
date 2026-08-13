import type { ProfileLayout } from "../contracts/prompt/layout";
import type { JsonValue, PromptDocument, PromptFragment, PromptSection } from "../contracts/prompt/prompt-document";
import type { PromptFragmentDraft, PromptSectionDraft } from "../contracts/prompt/providers";
import type { ResolvedState } from "../contracts/resolved-state/resolved-state";
import type { ResolutionTraceEntry } from "../contracts/resolved-state/resolution-trace";
import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";

export const PROMPT_AST_VERSION = "v1";

const SLOT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const FRAGMENT_ID_PATTERN = /^\S+$/u;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value: unknown, seen = new Set<object>()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Prompt section values must be valid JSON values");
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error("Prompt section values must be valid JSON values");
    seen.add(value);
    const result = value.map((item) => canonicalize(item, seen));
    seen.delete(value);
    return result;
  }
  if (typeof value === "object") {
    if (seen.has(value)) throw new Error("Prompt section values must be valid JSON values");
    seen.add(value);
    const result: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value).sort(compareCodeUnits)) {
      result[key] = canonicalize((value as Record<string, unknown>)[key], seen);
    }
    seen.delete(value);
    return result;
  }
  throw new Error("Prompt section values must be valid JSON values");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function assertContiguousOrder(layout: ProfileLayout): void {
  const orders = layout.sections.map((section) => section.order).sort((left, right) => left - right);
  if (orders.some((order, index) => order !== index)) {
    throw new Error("Profile layout section order must be contiguous and zero-based");
  }
}

export function selectLayoutSections(document: PromptDocument, layout: ProfileLayout): readonly PromptSection[] {
  assertContiguousOrder(layout);
  const sectionsById = new Map(document.sections.map((section) => [section.id, section]));
  const selected = layout.sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .map(({ sectionId }) => {
      const section = sectionsById.get(sectionId);
      if (section === undefined) throw new Error(`Profile layout references unknown section: ${sectionId}`);
      return section;
    });
  if (new Set(selected.map((section) => section.id)).size !== selected.length) {
    throw new Error("Profile layout must not select a section more than once");
  }
  return selected;
}

export class PromptAstBuilder {
  build(state: ResolvedState, providers: readonly PromptSectionProvider[]): PromptDocument {
    const traceById = new Map(state.trace.entries.map((entry) => [entry.id, entry]));
    if (traceById.size !== state.trace.entries.length) throw new Error("Resolution trace entry IDs must be unique");

    const drafts = providers
      .slice()
      .sort((left, right) => compareCodeUnits(left.id, right.id))
      .flatMap((provider) => provider.provide(state)
        .slice()
        .sort((left, right) => compareCodeUnits(left.slotId, right.slotId))
        .map((draft) => ({ provider, draft })));
    const seenSlots = new Set<string>();
    const seenFragmentIds = new Set<string>();
    const referencedTraceIds = new Set<string>();
    const sections = drafts.map(({ provider, draft }, order) => this.toSection(
      provider,
      draft,
      traceById,
      seenSlots,
      seenFragmentIds,
      referencedTraceIds,
      order,
    ));

    if (referencedTraceIds.size !== traceById.size) {
      const missing = [...traceById.keys()].filter((id) => !referencedTraceIds.has(id)).sort(compareCodeUnits);
      throw new Error(`Prompt document must cover every resolution trace entry: ${missing.join(", ")}`);
    }
    return deepFreeze({
      astVersion: PROMPT_AST_VERSION,
      id: `${PROMPT_AST_VERSION}:${state.stateHash}`,
      stateHash: state.stateHash,
      sections,
      trace: [...traceById.values()].sort((left, right) => compareCodeUnits(left.id, right.id)),
    });
  }

  private toSection(
    provider: PromptSectionProvider,
    draft: PromptSectionDraft,
    traceById: ReadonlyMap<string, ResolutionTraceEntry>,
    seenSlots: Set<string>,
    seenFragmentIds: Set<string>,
    referencedTraceIds: Set<string>,
    order: number,
  ): PromptSection {
    if (!SLOT_ID_PATTERN.test(draft.slotId)) throw new Error(`Invalid prompt slot ID: ${draft.slotId}`);
    if (draft.sourcePluginId !== provider.id) throw new Error("Prompt section source plugin ID must match its provider ID");
    const slotKey = `${draft.sourcePluginId}:${draft.slotId}`;
    if (seenSlots.has(slotKey)) throw new Error(`Duplicate prompt plugin/slot combination: ${slotKey}`);
    seenSlots.add(slotKey);
    const trace = draft.traceIds.map((id) => {
      const entry = traceById.get(id);
      if (entry === undefined) throw new Error(`Prompt section references unknown resolution trace: ${id}`);
      if (entry.sourcePluginId !== draft.sourcePluginId) {
        throw new Error(`Prompt section trace source does not match its plugin: ${id}`);
      }
      referencedTraceIds.add(id);
      return entry;
    });
    const fragmentDrafts = draft.fragments ?? [{
      id: `${draft.sourcePluginId}.${draft.slotId}.content`,
      text: draft.text,
      traceIds: draft.traceIds,
    }];
    if (draft.fragments !== undefined && draft.fragments.length === 0) {
      throw new Error("Prompt fragment collection must not be empty");
    }
    const sectionId = `${PROMPT_AST_VERSION}:${draft.sourcePluginId}:${draft.slotId}`;
    const fragments = fragmentDrafts.map((fragment, fragmentOrder) => this.toFragment(
      provider,
      sectionId,
      fragment,
      fragmentOrder,
      draft.fragments !== undefined,
      traceById,
      seenFragmentIds,
      referencedTraceIds,
    ));
    return {
      id: sectionId,
      sourcePluginId: draft.sourcePluginId,
      slotId: draft.slotId,
      order,
      text: draft.text,
      value: canonicalize(draft.value),
      trace,
      fragments,
    };
  }

  private toFragment(
    provider: PromptSectionProvider,
    sectionId: string,
    draft: PromptFragmentDraft,
    order: number,
    requiresTrace: boolean,
    traceById: ReadonlyMap<string, ResolutionTraceEntry>,
    seenFragmentIds: Set<string>,
    referencedTraceIds: Set<string>,
  ): PromptFragment {
    if (!FRAGMENT_ID_PATTERN.test(draft.id)) throw new Error(`Invalid prompt fragment ID: ${draft.id}`);
    if (seenFragmentIds.has(draft.id)) throw new Error(`Duplicate prompt fragment ID: ${draft.id}`);
    if (draft.text.trim().length === 0) throw new Error(`Prompt fragment text must not be empty: ${draft.id}`);
    if (requiresTrace && draft.traceIds.length === 0) throw new Error(`Prompt fragment trace list must not be empty: ${draft.id}`);
    if (new Set(draft.traceIds).size !== draft.traceIds.length) throw new Error(`Duplicate prompt fragment trace ID: ${draft.id}`);
    seenFragmentIds.add(draft.id);
    const trace = draft.traceIds.map((id) => {
      const entry = traceById.get(id);
      if (entry === undefined) throw new Error(`Prompt fragment references unknown resolution trace: ${id}`);
      referencedTraceIds.add(id);
      return entry;
    }).sort((left, right) => compareCodeUnits(left.id, right.id));
    return { id: draft.id, sourcePluginId: provider.id, sectionId, order, text: draft.text, trace };
  }
}
