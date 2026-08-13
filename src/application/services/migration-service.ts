import type { AppError } from "../../contracts/core/errors";
import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { ProjectRepository } from "../../contracts/storage/repositories/project";
import type { ProjectRevisionRepository } from "../../contracts/storage/repositories/project-revision";
import type { SettingsRepository } from "../../contracts/storage/repositories/settings";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../contracts/storage/transaction";
import { V500_MAX_BYTES, migrateV500Project, parseV500Project, type V500ProjectSnapshot } from "../migrations/v500-to-v600";
import { V500_STORAGE_KEY_PRIORITY, type ReadonlyKeyValueSource } from "../migrations/v500-storage-keys";
import { buildV600MigrationRecords, type MigrationReport } from "../migrations/v600-records";
import { SettingsService } from "./settings-service";

export interface MigrationServiceDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly source: ReadonlyKeyValueSource;
  readonly projects: ProjectRepository;
  readonly revisions: ProjectRevisionRepository;
  readonly settings: SettingsRepository;
  readonly transactions: StorageTransactionCoordinator;
}

export interface MigrationOptions {
  readonly expectedFingerprint?: string;
}

export interface MigrationOutcome {
  readonly status: "migrated" | "already-migrated";
  readonly migrationId: string;
  readonly fingerprint: string;
  readonly sourceKey: string;
  readonly report: MigrationReport;
}

interface SelectedSource {
  readonly key: string;
  readonly rawBytes: Uint8Array;
  readonly fingerprint: string;
  readonly snapshot: V500ProjectSnapshot;
}

export class MigrationService {
  private readonly settingsService: SettingsService;

  public constructor(private readonly dependencies: MigrationServiceDependencies) {
    this.settingsService = new SettingsService({ runtime: dependencies.runtime, settings: dependencies.settings });
  }

  public async migrateBrowserState(options: MigrationOptions = {}): Promise<Result<MigrationOutcome, AppError>> {
    const selected = await this.selectSource(options.expectedFingerprint);
    if (!selected.ok) return selected;
    return this.persistSelected(selected.value);
  }

  public async importV500Project(
    input: string | Uint8Array,
    options: MigrationOptions = {},
  ): Promise<Result<MigrationOutcome, AppError>> {
    const rawBytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
    if (rawBytes.byteLength > V500_MAX_BYTES) {
      return migrationFailure("MIGRATION_SOURCE_OVERSIZE", "V500 input exceeds the 2 MiB UTF-8 limit");
    }
    let raw: string;
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
    } catch {
      return migrationFailure("MIGRATION_INVALID_JSON", "V500 project file is not valid UTF-8");
    }
    const parsed = parseV500Project(raw);
    if (!parsed.ok) return parsed;
    const fingerprint = await this.dependencies.runtime.hashProvider.sha256(rawBytes);
    if (options.expectedFingerprint !== undefined && fingerprint !== options.expectedFingerprint) {
      return migrationFailure("MIGRATION_FINGERPRINT_MISMATCH", "V500 input does not match the expected fingerprint");
    }
    return this.persistSelected({
      key: "v500-project-file",
      rawBytes,
      fingerprint,
      snapshot: parsed.value,
    });
  }

  private async persistSelected(selected: SelectedSource): Promise<Result<MigrationOutcome, AppError>> {
    const state = migrateV500Project(selected.snapshot);
    const records = buildV600MigrationRecords({
      completedAt: this.dependencies.runtime.clock.now(),
      fingerprint: selected.fingerprint,
      sourceKey: selected.key,
      sourceVersion: selected.snapshot.sourceVersion,
      state,
    });

    const verifiedFingerprint = await this.dependencies.runtime.hashProvider.sha256(selected.rawBytes);
    if (verifiedFingerprint !== selected.fingerprint) {
      return migrationFailure("MIGRATION_FINGERPRINT_MISMATCH", "V500 input fingerprint changed before persistence");
    }
    return this.dependencies.transactions.run<MigrationOutcome>(
      { stores: ["Projects", "ProjectRevisions", "Settings"], mode: "readwrite" },
      async (transaction) => {
        const settingsResult = await this.dependencies.settings.getByKey("global", transaction);
        if (!settingsResult.ok) return settingsResult;
        if (settingsResult.value?.migrationLedger.some((entry) => entry.migrationId === records.migrationId) === true) {
          return { ok: true as const, value: migrationOutcome("already-migrated", records, selected) };
        }
        const existingProject = await this.dependencies.projects.getById(records.project.id, transaction);
        if (!existingProject.ok) return existingProject;
        if (existingProject.value !== null) return conflict("Projects", records.project.id);
        const existingRevision = await this.dependencies.revisions.getById(records.revision.id, transaction);
        if (!existingRevision.ok) return existingRevision;
        if (existingRevision.value !== null) return conflict("ProjectRevisions", records.revision.id);
        const settings = this.settingsService.prepareGlobal(
          settingsResult.value,
          records.project.id,
          records.ledgerEntry,
        );
        const projectPut = await this.dependencies.projects.put(records.project, transaction);
        if (!projectPut.ok) return projectPut;
        const revisionPut = await this.dependencies.revisions.put(records.revision, transaction);
        if (!revisionPut.ok) return revisionPut;
        const settingsPut = await this.settingsService.put(settings, transaction);
        return settingsPut.ok
          ? { ok: true as const, value: migrationOutcome("migrated", records, selected) }
          : settingsPut;
      },
    );
  }

  private async selectSource(expectedFingerprint: string | undefined): Promise<Result<SelectedSource, AppError>> {
    let firstFailure: AppError | null = null;
    let found = false;
    for (const key of V500_STORAGE_KEY_PRIORITY) {
      const raw = this.dependencies.source.getItem(key);
      if (raw === null) continue;
      found = true;
      const parsed = parseV500Project(raw);
      if (!parsed.ok) {
        firstFailure ??= parsed.error;
        continue;
      }
      const rawBytes = new TextEncoder().encode(raw);
      const fingerprint = await this.dependencies.runtime.hashProvider.sha256(rawBytes);
      if (expectedFingerprint !== undefined && fingerprint !== expectedFingerprint) {
        return migrationFailure("MIGRATION_FINGERPRINT_MISMATCH", "V500 input does not match the expected fingerprint");
      }
      return { ok: true, value: { key, rawBytes, fingerprint, snapshot: parsed.value } };
    }
    if (firstFailure !== null) return { ok: false, error: firstFailure };
    return migrationFailure(
      found ? "MIGRATION_INVALID_SIGNATURE" : "MIGRATION_SOURCE_NOT_FOUND",
      found ? "No valid V500 state was found" : "No V500 browser state was found",
    );
  }
}

function migrationOutcome(
  status: MigrationOutcome["status"],
  records: ReturnType<typeof buildV600MigrationRecords>,
  selected: SelectedSource,
): MigrationOutcome {
  return {
    status,
    migrationId: records.migrationId,
    fingerprint: selected.fingerprint,
    sourceKey: selected.key,
    report: records.report,
  };
}

function conflict(store: StorageError["store"], id: string): Result<never, StorageError> {
  return {
    ok: false,
    error: {
      code: "storage/conflict",
      moduleId: "storage",
      severity: "error",
      userMessage: "The migration conflicts with existing data.",
      technicalMessage: `${store ?? "Storage"} record already exists: ${id}`,
      recoverable: true,
      ...(store === undefined ? {} : { store }),
    },
  };
}

function migrationFailure(code: string, technicalMessage: string): Result<never, AppError> {
  return {
    ok: false,
    error: {
      code,
      moduleId: "migration",
      severity: "error",
      userMessage: "The project data could not be migrated.",
      technicalMessage,
      recoverable: true,
    },
  };
}
