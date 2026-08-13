import type { AppError } from "../../contracts/core/errors";
import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { ProjectRepository } from "../../contracts/storage/repositories/project";
import type { ProjectRevisionRepository } from "../../contracts/storage/repositories/project-revision";
import type { SettingsRepository } from "../../contracts/storage/repositories/settings";
import type { ProjectRecord } from "../../contracts/storage/records/project";
import type { ProjectRevisionRecord } from "../../contracts/storage/records/project-revision";
import { isRecord } from "../../contracts/storage/storage-errors";
import type { StorageError } from "../../contracts/storage/storage-errors";
import type { StorageTransactionCoordinator } from "../../contracts/storage/transaction";
import { mapProjectRecordToEntity } from "../mappers/project-mapper";
import { mapProjectRevisionRecordToEntity } from "../mappers/project-revision-mapper";
import { SettingsService } from "./settings-service";

export const V600_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
const EXPORT_FORMAT = "prompt-studio-v600-project";
const EXPORT_MANIFEST_VERSION = 1;

export interface ProjectExport {
  readonly bytes: Uint8Array;
  readonly text: string;
  readonly checksum: string;
}

export interface ProjectImport {
  readonly project: ProjectRecord;
  readonly revision: ProjectRevisionRecord;
}

export interface ExportServiceDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly projects: ProjectRepository;
  readonly revisions: ProjectRevisionRepository;
  readonly settings: SettingsRepository;
  readonly transactions: StorageTransactionCoordinator;
}

interface ParsedImport {
  readonly project: ProjectRecord;
  readonly revisions: readonly ProjectRevisionRecord[];
}

export class ExportService {
  private readonly settingsService: SettingsService;

  public constructor(private readonly dependencies: ExportServiceDependencies) {
    this.settingsService = new SettingsService({ runtime: dependencies.runtime, settings: dependencies.settings });
  }

  public async exportProject(projectId: string): Promise<Result<ProjectExport, AppError>> {
    const projectResult = await this.dependencies.projects.getById(projectId);
    if (!projectResult.ok) return projectResult;
    if (projectResult.value === null) return exportFailure("storage/not-found", `Project not found: ${projectId}`);
    const revisionsResult = await this.dependencies.revisions.listByProjectId(projectId);
    if (!revisionsResult.ok) return revisionsResult;
    const signed = {
      manifest: { format: EXPORT_FORMAT, version: EXPORT_MANIFEST_VERSION },
      payload: {
        project: projectResult.value,
        revisions: [...revisionsResult.value].sort(compareRevisions),
      },
    };
    const checksum = await this.dependencies.runtime.hashProvider.sha256(new TextEncoder().encode(canonicalJson(signed)));
    const text = canonicalJson({ checksum, ...signed });
    return { ok: true, value: { bytes: new TextEncoder().encode(text), text, checksum } };
  }

  public async importProject(input: string | Uint8Array): Promise<Result<ProjectImport, AppError>> {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
    if (bytes.byteLength > V600_IMPORT_MAX_BYTES) {
      return exportFailure("IMPORT_OVERSIZE", "V600 input exceeds the 10 MiB UTF-8 limit");
    }
    const decoded = new TextDecoder("utf-8", { fatal: true });
    let text: string;
    try {
      text = decoded.decode(bytes);
    } catch {
      return exportFailure("IMPORT_INVALID_JSON", "V600 input is not valid UTF-8");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return exportFailure("IMPORT_INVALID_JSON", "V600 input is not valid JSON");
    }
    const validated = await this.validateImport(parsed);
    if (!validated.ok) return validated;

    const timestamp = this.dependencies.runtime.clock.now();
    const importRevisionId = this.dependencies.runtime.idGenerator.nextId("project-revision");
    if (validated.value.revisions.some((revision) => revision.id === importRevisionId)) {
      return conflict("ProjectRevisions", importRevisionId);
    }
    const nextSequence = validated.value.revisions.reduce((maximum, revision) => Math.max(maximum, revision.sequence), 0) + 1;
    const snapshotHash = await this.dependencies.runtime.hashProvider.sha256(
      new TextEncoder().encode(canonicalJson(validated.value.project.state)),
    );
    const importRevision: ProjectRevisionRecord = {
      id: importRevisionId,
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 0,
      projectId: validated.value.project.id,
      sequence: nextSequence,
      reason: "import",
      parentRevisionId: validated.value.project.currentRevisionId,
      snapshot: validated.value.project.state,
      sha256: snapshotHash,
    };
    const project: ProjectRecord = {
      ...validated.value.project,
      updatedAt: timestamp,
      revision: validated.value.project.revision + 1,
      currentRevisionId: importRevision.id,
    };
    return this.dependencies.transactions.run<ProjectImport>(
      { stores: ["Projects", "ProjectRevisions", "Settings"], mode: "readwrite" },
      async (transaction) => {
        const existingProject = await this.dependencies.projects.getById(project.id, transaction);
        if (!existingProject.ok) return existingProject;
        if (existingProject.value !== null) return conflict("Projects", project.id);
        for (const revision of validated.value.revisions) {
          const existing = await this.dependencies.revisions.getById(revision.id, transaction);
          if (!existing.ok) return existing;
          if (existing.value !== null) return conflict("ProjectRevisions", revision.id);
        }
        const existingImportRevision = await this.dependencies.revisions.getById(importRevision.id, transaction);
        if (!existingImportRevision.ok) return existingImportRevision;
        if (existingImportRevision.value !== null) return conflict("ProjectRevisions", importRevision.id);
        const settingsResult = await this.dependencies.settings.getByKey("global", transaction);
        if (!settingsResult.ok) return settingsResult;
        const settings = this.settingsService.prepareGlobal(settingsResult.value, project.id);
        const projectPut = await this.dependencies.projects.put(project, transaction);
        if (!projectPut.ok) return projectPut;
        for (const revision of validated.value.revisions) {
          const revisionPut = await this.dependencies.revisions.put(revision, transaction);
          if (!revisionPut.ok) return revisionPut;
        }
        const importRevisionPut = await this.dependencies.revisions.put(importRevision, transaction);
        if (!importRevisionPut.ok) return importRevisionPut;
        const settingsPut = await this.settingsService.put(settings, transaction);
        return settingsPut.ok ? { ok: true as const, value: { project, revision: importRevision } } : settingsPut;
      },
    );
  }

  private async validateImport(value: unknown): Promise<Result<ParsedImport, AppError>> {
    if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.payload) || typeof value.checksum !== "string") {
      return exportFailure("IMPORT_MANIFEST_INVALID", "V600 manifest shape is invalid");
    }
    if (value.manifest.format !== EXPORT_FORMAT || value.manifest.version !== EXPORT_MANIFEST_VERSION) {
      return exportFailure("IMPORT_MANIFEST_INVALID", "V600 manifest version is unsupported");
    }
    const signed = { manifest: value.manifest, payload: value.payload };
    const actualChecksum = await this.dependencies.runtime.hashProvider.sha256(new TextEncoder().encode(canonicalJson(signed)));
    if (actualChecksum !== value.checksum) {
      return exportFailure("IMPORT_CHECKSUM_MISMATCH", "V600 manifest checksum does not match its payload");
    }
    if (containsAssetBundle(value)) {
      return exportFailure("IMPORT_ASSET_BUNDLE_UNSUPPORTED", "Binary asset bundles are not supported in Phase 1");
    }
    if (!hasExactKeys(value, ["checksum", "manifest", "payload"])) {
      return exportFailure("IMPORT_MANIFEST_INVALID", "V600 import must contain exactly checksum, manifest, and payload");
    }
    const project = value.payload.project;
    const revisions = value.payload.revisions;
    if (!Array.isArray(revisions) || !mapProjectRecordToEntity(project).ok) {
      return exportFailure("IMPORT_RECORD_INVALID", "V600 project record is invalid");
    }
    const records: ProjectRevisionRecord[] = [];
    const ids = new Set<string>();
    for (const revision of revisions) {
      const mapped = mapProjectRevisionRecordToEntity(revision);
      if (!mapped.ok || mapped.value.projectId !== (project as ProjectRecord).id || ids.has(mapped.value.id)) {
        return exportFailure("IMPORT_RECORD_INVALID", "V600 revision record is invalid");
      }
      ids.add(mapped.value.id);
      records.push(revision as ProjectRevisionRecord);
    }
    return { ok: true, value: { project: project as ProjectRecord, revisions: records.sort(compareRevisions) } };
  }
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function containsAssetBundle(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsAssetBundle);
  if (!isRecord(value)) return false;
  if (["assetBundle", "assets", "imageAssets", "binaryAssets"].some((key) => Object.hasOwn(value, key))) return true;
  return Object.values(value).some(containsAssetBundle);
}

function canonicalJson(value: unknown): string {
  return `${serializeCanonical(value, 0)}\n`;
}

function serializeCanonical(value: unknown, depth: number): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError("Canonical JSON does not support undefined values");
    return serialized;
  }
  const indentation = "  ".repeat(depth);
  const childIndentation = "  ".repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const entries = value.map((entry) => `${childIndentation}${serializeCanonical(entry, depth + 1)}`);
    return `[\n${entries.join(",\n")}\n${indentation}]`;
  }
  const entries = Object.entries(value as Readonly<Record<string, unknown>>)
    .sort(([left], [right]) => compareLexicographically(left, right));
  if (entries.length === 0) return "{}";
  const properties = entries.map(([key, entry]) =>
    `${childIndentation}${JSON.stringify(key)}: ${serializeCanonical(entry, depth + 1)}`
  );
  return `{\n${properties.join(",\n")}\n${indentation}}`;
}

function compareRevisions(left: ProjectRevisionRecord, right: ProjectRevisionRecord): number {
  return left.sequence - right.sequence || compareLexicographically(left.id, right.id);
}

function compareLexicographically(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function conflict(store: StorageError["store"], id: string): Result<never, StorageError> {
  return {
    ok: false,
    error: {
      code: "storage/conflict",
      moduleId: "storage",
      severity: "error",
      userMessage: "The import conflicts with existing data.",
      technicalMessage: `${store ?? "Storage"} record already exists: ${id}`,
      recoverable: true,
      ...(store === undefined ? {} : { store }),
    },
  };
}

function exportFailure(code: string, technicalMessage: string): Result<never, AppError> {
  return {
    ok: false,
    error: {
      code,
      moduleId: "export",
      severity: "error",
      userMessage: "The project file could not be processed.",
      technicalMessage,
      recoverable: true,
    },
  };
}
