import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { SettingsService } from "../../src/application/services/settings-service";
import type { Result } from "../../src/contracts/core/result";
import type { SettingsRecord } from "../../src/contracts/storage/records/settings";
import type { SettingsRepository } from "../../src/contracts/storage/repositories/settings";
import type { SyncQueueRepository } from "../../src/contracts/storage/repositories/sync-queue";
import type { StorageError } from "../../src/contracts/storage/storage-errors";
import { LocalSyncAdapter } from "../../src/infrastructure/sync/local-sync-adapter";
import { createFixedRuntime } from "../helpers/fixed-runtime";

describe("Phase-1 no-cloud sync contract", () => {
  it("keeps cloudSync and aiKnowledgeBase literal false when untrusted updates request true", async () => {
    const repository = new MemorySettingsRepository();
    const service = new SettingsService({
      runtime: createFixedRuntime({ now: "2026-08-12T11:00:00.000Z" }).runtime,
      settings: repository,
    });

    const initial = await service.getOrCreateGlobal();
    expect(initial).toMatchObject({ ok: true, value: { featureFlags: { cloudSync: false, aiKnowledgeBase: false } } });
    const updated = await service.updateFeatureFlags({ cloudSync: true, aiKnowledgeBase: true, characterLibrary: true });

    expect(updated).toMatchObject({
      ok: true,
      value: { featureFlags: { cloudSync: false, aiKnowledgeBase: false, characterLibrary: true } },
    });
    expect(repository.record?.featureFlags.cloudSync).toBe(false);
    expect(repository.record?.featureFlags.aiKnowledgeBase).toBe(false);
  });

  it("exposes only a disabled local adapter backed by SyncQueueRepository behavior", async () => {
    const pending = [{ id: "sync-local-1", status: "pending" }] as never;
    const queue = new MemorySyncQueueRepository(pending);
    const adapter = new LocalSyncAdapter(queue);

    expect(adapter.mode).toBe("local-only");
    expect(adapter.cloudSync).toBe(false);
    expect(await adapter.listPending()).toEqual({ ok: true, value: pending });
  });

  it("contains no network transport, cloud adapter, or bootstrap registration path", async () => {
    const paths = [
      "src/contracts/storage/sync.ts",
      "src/infrastructure/sync/local-sync-adapter.ts",
      "src/bootstrap/create-app.ts",
      "src/bootstrap/index.ts",
    ];
    const sources = await Promise.all(paths.map((path) => readFile(path, "utf8")));
    const combined = sources.join("\n");

    expect(combined).not.toMatch(/\bfetch\s*\(|\bWebSocket\b|https?:\/\/|CloudSync|cloud-sync|cloud-adapter|remoteSync|apiClient/u);
    expect(sources.slice(2).join("\n")).not.toMatch(/infrastructure\/sync|SyncAdapter/u);
  });
});

class MemorySettingsRepository implements SettingsRepository {
  record: SettingsRecord | null = null;
  async getByKey(key: string): Promise<Result<SettingsRecord | null, StorageError>> {
    return { ok: true, value: this.record?.key === key ? this.record : null };
  }
  async list(): Promise<Result<readonly SettingsRecord[], StorageError>> {
    return { ok: true, value: this.record === null ? [] : [this.record] };
  }
  async put(record: SettingsRecord): Promise<Result<void, StorageError>> {
    this.record = record;
    return { ok: true, value: undefined };
  }
  async delete(): Promise<Result<void, StorageError>> {
    this.record = null;
    return { ok: true, value: undefined };
  }
}

class MemorySyncQueueRepository implements SyncQueueRepository {
  constructor(private readonly pending: never) {}
  async listPending() { return { ok: true as const, value: this.pending }; }
  async getById() { return { ok: true as const, value: null }; }
  async put() { return { ok: true as const, value: undefined }; }
  async delete() { return { ok: true as const, value: undefined }; }
}
