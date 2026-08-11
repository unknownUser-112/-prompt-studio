import type { AppError } from "../../contracts/core/errors";
import type { Result } from "../../contracts/core/result";
import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { IdNamespace } from "../../contracts/runtime/providers";

const MODULE_ID = "runtime.browser";

export function createBrowserRuntime(): Result<RuntimeEnvironment> {
  if (
    globalThis.crypto === undefined ||
    globalThis.crypto.subtle === undefined ||
    globalThis.navigator === undefined ||
    globalThis.navigator.language.length === 0
  ) {
    return unavailableRuntime("RUNTIME_BROWSER_API_UNAVAILABLE");
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone === undefined || timeZone.length === 0) {
    return unavailableRuntime("RUNTIME_TIME_ZONE_UNAVAILABLE");
  }

  let lastMonotonicMilliseconds = performance.now();

  return {
    ok: true,
    value: {
      clock: {
        now: () => new Date().toISOString(),
      },
      monotonicClock: {
        nowMilliseconds: () => {
          lastMonotonicMilliseconds = Math.max(
            lastMonotonicMilliseconds,
            performance.now(),
          );
          return lastMonotonicMilliseconds;
        },
      },
      idGenerator: {
        nextId: (namespace: IdNamespace) => `${namespace}-${crypto.randomUUID()}`,
      },
      hashProvider: {
        sha256: async (data: Uint8Array) => {
          const input = new ArrayBuffer(data.byteLength);
          new Uint8Array(input).set(data);
          const digest = await crypto.subtle.digest("SHA-256", input);
          return Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
        },
      },
      randomSource: {
        nextBytes: (length: number) => {
          const bytes = new Uint8Array(length);
          crypto.getRandomValues(bytes);
          return bytes;
        },
      },
      locale: navigator.language,
      timeZone,
    },
  };
}

function unavailableRuntime(code: string): Result<RuntimeEnvironment> {
  const error: AppError = {
    code,
    moduleId: MODULE_ID,
    severity: "fatal",
    userMessage: "Die Laufzeitumgebung ist nicht verfügbar.",
    technicalMessage: "Required browser runtime APIs are unavailable.",
    recoverable: false,
  };

  return { ok: false, error };
}
