import type { StorageRecordMetadata } from "./project";

export type SettingsScope = "global" | "project";

export interface FeatureFlagSettings {
  readonly characterLibrary: boolean;
  readonly outfitLibrary: boolean;
  readonly sceneLibrary: boolean;
  readonly promptLibrary: boolean;
  readonly imageLibrary: boolean;
  readonly revisionHistoryUi: boolean;
  readonly cloudSync: false;
  readonly aiKnowledgeBase: false;
}

export interface MigrationLedgerEntry {
  readonly migrationId: string;
  readonly completedAt: string;
  readonly sourceVersion: string;
}

export interface SettingsRecord extends StorageRecordMetadata {
  readonly key: string;
  readonly scope: SettingsScope;
  readonly projectId: string | null;
  readonly featureFlags: FeatureFlagSettings;
  readonly activeProjectId: string | null;
  readonly migrationLedger: readonly MigrationLedgerEntry[];
}
