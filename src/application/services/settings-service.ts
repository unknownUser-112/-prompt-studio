import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { SettingsRepository } from "../../contracts/storage/repositories/settings";
import type { FeatureFlagSettings, MigrationLedgerEntry, SettingsRecord } from "../../contracts/storage/records/settings";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StorageTransaction } from "../../contracts/storage/transaction";
import { defaultGlobalSettings } from "../migrations/v600-records";

export interface SettingsServiceDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly settings: SettingsRepository;
}

export class SettingsService {
  public constructor(private readonly dependencies: SettingsServiceDependencies) {}

  public async getOrCreateGlobal(): Promise<Result<SettingsRecord, StorageError>> {
    const current = await this.dependencies.settings.getByKey("global");
    if (!current.ok) return current;
    if (current.value !== null) return { ok: true, value: this.normalizeRecord(current.value) };
    const created = defaultGlobalSettings(this.dependencies.runtime.clock.now(), null);
    const put = await this.dependencies.settings.put(created);
    return put.ok ? { ok: true, value: created } : put;
  }

  public async updateFeatureFlags(update: Readonly<Record<string, unknown>>): Promise<Result<SettingsRecord, StorageError>> {
    const current = await this.getOrCreateGlobal();
    if (!current.ok) return current;
    const timestamp = this.dependencies.runtime.clock.now();
    const next: SettingsRecord = {
      ...current.value,
      updatedAt: timestamp,
      revision: current.value.revision + 1,
      featureFlags: normalizeFeatureFlags({ ...current.value.featureFlags, ...update }),
    };
    const put = await this.dependencies.settings.put(next);
    return put.ok ? { ok: true, value: next } : put;
  }

  public prepareGlobal(
    current: SettingsRecord | null,
    activeProjectId: string | null,
    ledgerEntry?: MigrationLedgerEntry,
  ): SettingsRecord {
    const timestamp = this.dependencies.runtime.clock.now();
    const base = current === null ? defaultGlobalSettings(timestamp, activeProjectId) : this.normalizeRecord(current);
    const migrationLedger = ledgerEntry === undefined || base.migrationLedger.some((entry) => entry.migrationId === ledgerEntry.migrationId)
      ? base.migrationLedger
      : [...base.migrationLedger, ledgerEntry];
    return {
      ...base,
      updatedAt: timestamp,
      revision: current === null ? base.revision : base.revision + 1,
      activeProjectId,
      migrationLedger,
      featureFlags: normalizeFeatureFlags(base.featureFlags),
    };
  }

  public put(record: SettingsRecord, transaction?: StorageTransaction): Promise<Result<void, StorageError>> {
    return this.dependencies.settings.put(this.normalizeRecord(record), transaction);
  }

  private normalizeRecord(record: SettingsRecord): SettingsRecord {
    return { ...record, featureFlags: normalizeFeatureFlags(record.featureFlags) };
  }
}

function normalizeFeatureFlags(
  value: Readonly<Partial<Record<keyof FeatureFlagSettings, unknown>>>,
): FeatureFlagSettings {
  return {
    characterLibrary: value.characterLibrary === true,
    outfitLibrary: value.outfitLibrary === true,
    sceneLibrary: value.sceneLibrary === true,
    promptLibrary: value.promptLibrary === true,
    imageLibrary: value.imageLibrary === true,
    revisionHistoryUi: value.revisionHistoryUi === true,
    cloudSync: false,
    aiKnowledgeBase: false,
  };
}
