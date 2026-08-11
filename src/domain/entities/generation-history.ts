import type { DomainObject } from "./project";

export interface GenerationHistoryEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly projectId: string;
  readonly profileId: string;
  readonly promptResult: DomainObject;
  readonly resolvedStateHash: string;
  readonly diagnosticSummary: DomainObject;
}
