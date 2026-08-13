import type { ProjectRecord, StorageObject } from "../../contracts/storage/records/project";
import type { ProjectRevisionRecord } from "../../contracts/storage/records/project-revision";
import type { MigrationLedgerEntry, SettingsRecord } from "../../contracts/storage/records/settings";

export interface MigrationReport {
  readonly migrationId: string;
  readonly fingerprint: string;
  readonly sourceKey: string;
  readonly sourceVersion: string;
  readonly projectId: string;
  readonly revisionId: string;
  readonly completedAt: string;
  readonly migratedProjectCount: 1;
  readonly skippedProjectCount: 0;
}

export interface V600MigrationRecords {
  readonly migrationId: string;
  readonly project: ProjectRecord;
  readonly revision: ProjectRevisionRecord;
  readonly ledgerEntry: MigrationLedgerEntry;
  readonly report: MigrationReport;
}

export interface BuildV600MigrationRecordsInput {
  readonly completedAt: string;
  readonly fingerprint: string;
  readonly sourceKey: string;
  readonly sourceVersion: string;
  readonly state: StorageObject;
}

export function buildV600MigrationRecords(input: BuildV600MigrationRecordsInput): V600MigrationRecords {
  const suffix = input.fingerprint.slice(0, 24);
  const migrationId = `v500-to-v600:${input.fingerprint}`;
  const projectId = `project-v500-${suffix}`;
  const revisionId = `project-revision-v500-${suffix}`;
  const project: ProjectRecord = {
    id: projectId,
    schemaVersion: 1,
    createdAt: input.completedAt,
    updatedAt: input.completedAt,
    revision: 0,
    name: "Migriertes V500-Projekt",
    state: input.state,
    currentRevisionId: revisionId,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
  const revision: ProjectRevisionRecord = {
    id: revisionId,
    schemaVersion: 1,
    createdAt: input.completedAt,
    updatedAt: input.completedAt,
    revision: 0,
    projectId,
    sequence: 1,
    reason: "migration",
    parentRevisionId: null,
    snapshot: input.state,
    sha256: input.fingerprint,
  };
  const ledgerEntry: MigrationLedgerEntry = {
    migrationId,
    completedAt: input.completedAt,
    sourceVersion: input.sourceVersion,
  };
  return {
    migrationId,
    project,
    revision,
    ledgerEntry,
    report: {
      migrationId,
      fingerprint: input.fingerprint,
      sourceKey: input.sourceKey,
      sourceVersion: input.sourceVersion,
      projectId,
      revisionId,
      completedAt: input.completedAt,
      migratedProjectCount: 1,
      skippedProjectCount: 0,
    },
  };
}

export function defaultGlobalSettings(timestamp: string, activeProjectId: string | null): SettingsRecord {
  return {
    id: "settings-global",
    schemaVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    key: "global",
    scope: "global",
    projectId: null,
    featureFlags: {
      characterLibrary: false,
      outfitLibrary: false,
      sceneLibrary: false,
      promptLibrary: false,
      imageLibrary: false,
      revisionHistoryUi: false,
      cloudSync: false,
      aiKnowledgeBase: false,
    },
    activeProjectId,
    migrationLedger: [],
  };
}
