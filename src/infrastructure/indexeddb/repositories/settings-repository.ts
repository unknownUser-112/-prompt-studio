import type { SettingsRepository } from "../../../contracts/storage/repositories/settings";
import type { SettingsRecord } from "../../../contracts/storage/records/settings";
import { isNullableString, isRecord, isStorageRecordMetadata } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

const FLAG_NAMES = [
  "characterLibrary",
  "outfitLibrary",
  "sceneLibrary",
  "promptLibrary",
  "imageLibrary",
  "revisionHistoryUi",
  "cloudSync",
  "aiKnowledgeBase",
] as const;

export class IndexedDbSettingsRepository implements SettingsRepository {
  private readonly records: IndexedDbRecordStore<SettingsRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "Settings", "settings", isSettingsRecord);
  }

  public getByKey: SettingsRepository["getByKey"] = (key, transaction) => this.records.get(key, transaction);
  public list: SettingsRepository["list"] = (transaction) => this.records.list(transaction);
  public put: SettingsRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: SettingsRepository["delete"] = (key, transaction) => this.records.delete(key, transaction);
}

function isSettingsRecord(value: unknown): value is SettingsRecord {
  return isStorageRecordMetadata(value) && typeof value.key === "string" &&
    (value.scope === "global" || value.scope === "project") && isNullableString(value.projectId) &&
    hasFeatureFlags(value.featureFlags) && isNullableString(value.activeProjectId) && hasMigrationLedger(value.migrationLedger);
}

function hasFeatureFlags(value: unknown): boolean {
  return isRecord(value) && FLAG_NAMES.every((name) => typeof value[name] === "boolean") &&
    value.cloudSync === false && value.aiKnowledgeBase === false;
}

function hasMigrationLedger(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => isRecord(entry) &&
    typeof entry.migrationId === "string" && typeof entry.completedAt === "string" &&
    typeof entry.sourceVersion === "string");
}
