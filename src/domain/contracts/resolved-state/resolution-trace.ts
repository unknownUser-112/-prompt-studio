export interface ResolutionTraceEntry {
  readonly id: string;
  readonly path: string;
  readonly sourceField: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly sourcePluginId: string;
  readonly pluginVersion: string;
}

export interface ResolutionTrace {
  readonly entries: readonly ResolutionTraceEntry[];
}
