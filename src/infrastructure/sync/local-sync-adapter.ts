import type { LocalSyncPort } from "../../contracts/storage/sync";
import type { SyncQueueRepository } from "../../contracts/storage/repositories/sync-queue";

export class LocalSyncAdapter implements LocalSyncPort {
  public readonly mode = "local-only" as const;
  public readonly cloudSync = false as const;

  public constructor(private readonly queue: SyncQueueRepository) {}

  public listPending: LocalSyncPort["listPending"] = () => this.queue.listPending();
}
