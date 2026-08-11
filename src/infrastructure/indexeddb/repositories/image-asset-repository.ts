import type { ImageAssetRepository } from "../../../contracts/storage/repositories/image-asset";
import type { ImageAssetRecord } from "../../../contracts/storage/records/image-asset";
import { isStorageRecordMetadata, isStringArray } from "../../../contracts/storage/storage-errors";
import { IndexedDbRecordStore, type IndexedDbAdapter } from "../indexeddb-adapter";

export class IndexedDbImageAssetRepository implements ImageAssetRepository {
  private readonly records: IndexedDbRecordStore<ImageAssetRecord>;

  public constructor(adapter: IndexedDbAdapter) {
    this.records = new IndexedDbRecordStore(adapter, "ImageAssets", "image asset", isImageAssetRecord);
  }

  public getById: ImageAssetRepository["getById"] = (id) => this.records.get(id);
  public getBySha256: ImageAssetRepository["getBySha256"] = (sha256) => this.records.firstByIndex("sha256", sha256);
  public put: ImageAssetRepository["put"] = (record, transaction) => this.records.put(record, transaction);
  public delete: ImageAssetRepository["delete"] = (id, transaction) => this.records.delete(id, transaction);
}

function isImageAssetRecord(value: unknown): value is ImageAssetRecord {
  return isStorageRecordMetadata(value) && isBlob(value.blob) && typeof value.mimeType === "string" &&
    Number.isFinite(value.width) && Number.isFinite(value.height) && typeof value.sha256 === "string" &&
    isStringArray(value.referencedEntityIds);
}

function isBlob(value: unknown): value is Blob {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<Blob>;
  return typeof candidate.size === "number" && typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function" && typeof candidate.slice === "function" &&
    typeof candidate.stream === "function" && typeof candidate.text === "function";
}
