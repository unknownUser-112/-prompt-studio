import { createHash } from "node:crypto";

import type { RuntimeEnvironment } from "../../src/contracts/runtime/runtime-environment";
import type { IdNamespace } from "../../src/contracts/runtime/providers";

export interface FixedRuntimeSnapshot {
  readonly now: string;
  readonly monotonicNowMilliseconds: number;
  readonly locale: string;
  readonly timeZone: string;
  readonly randomBytes: readonly number[];
}

export interface FixedRuntime {
  readonly runtime: RuntimeEnvironment;
  advanceMonotonicMilliseconds(milliseconds: number): void;
}

const DEFAULT_SNAPSHOT: FixedRuntimeSnapshot = {
  now: "2026-01-01T00:00:00.000Z",
  monotonicNowMilliseconds: 0,
  locale: "de-DE",
  timeZone: "Europe/Berlin",
  randomBytes: [0],
};

export function createFixedRuntime(
  overrides: Partial<FixedRuntimeSnapshot> = {},
): FixedRuntime {
  const snapshot = { ...DEFAULT_SNAPSHOT, ...overrides };
  const idCounters = new Map<IdNamespace, number>();
  let monotonicNowMilliseconds = snapshot.monotonicNowMilliseconds;
  let randomOffset = 0;

  return {
    runtime: {
      clock: { now: () => snapshot.now },
      monotonicClock: { nowMilliseconds: () => monotonicNowMilliseconds },
      idGenerator: {
        nextId: (namespace: IdNamespace) => {
          const next = (idCounters.get(namespace) ?? 0) + 1;
          idCounters.set(namespace, next);
          return `${namespace}-${String(next).padStart(6, "0")}`;
        },
      },
      hashProvider: {
        sha256: async (data: Uint8Array) =>
          createHash("sha256").update(data).digest("hex"),
      },
      randomSource: {
        nextBytes: (length: number) => {
          const bytes = new Uint8Array(length);
          for (let index = 0; index < length; index += 1) {
            bytes[index] = snapshot.randomBytes[randomOffset % snapshot.randomBytes.length] ?? 0;
            randomOffset += 1;
          }
          return bytes;
        },
      },
      locale: snapshot.locale,
      timeZone: snapshot.timeZone,
    },
    advanceMonotonicMilliseconds: (milliseconds: number) => {
      monotonicNowMilliseconds = Math.max(
        monotonicNowMilliseconds,
        monotonicNowMilliseconds + milliseconds,
      );
    },
  };
}
