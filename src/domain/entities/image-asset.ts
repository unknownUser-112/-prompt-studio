export interface ImageAsset {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly blob: Blob;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly referencedEntityIds: readonly string[];
}
