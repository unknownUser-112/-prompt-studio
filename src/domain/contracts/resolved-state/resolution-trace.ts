interface ResolutionTraceEntryFields {
  readonly id: string;
  readonly path: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly sourcePluginId: string;
  readonly pluginVersion: string;
}

interface SingleSourceResolutionTraceEntry {
  readonly sourceField: string;
  readonly sourceFields?: never;
}

interface MultiSourceResolutionTraceEntry {
  readonly sourceField?: never;
  readonly sourceFields: readonly [string, string, ...string[]];
}

export type ResolutionTraceEntry = ResolutionTraceEntryFields & (
  SingleSourceResolutionTraceEntry | MultiSourceResolutionTraceEntry
);

export interface ResolutionTrace {
  readonly entries: readonly ResolutionTraceEntry[];
}
