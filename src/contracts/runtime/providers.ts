export interface Clock {
  now(): string;
}

export interface MonotonicClock {
  nowMilliseconds(): number;
}

export type IdNamespace =
  | "project"
  | "project-revision"
  | "profile"
  | "character"
  | "outfit"
  | "scene"
  | "prompt-template"
  | "generation-history"
  | "image-asset"
  | "tag"
  | "trash-entry"
  | "sync-operation"
  | "migration"
  | "diagnostic-report";

export interface IdGenerator {
  nextId(namespace: IdNamespace): string;
}

export interface HashProvider {
  sha256(data: Uint8Array): Promise<string>;
}

export interface RandomSource {
  nextBytes(length: number): Uint8Array;
}
