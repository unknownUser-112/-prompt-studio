import { describe, expect, it } from "vitest";

import { createFixedRuntime } from "../../helpers/fixed-runtime";

describe("runtime environment", () => {
  it("replays a fixed snapshot with namespace-specific IDs, random bytes, and locale data", () => {
    const first = createFixedRuntime({
      locale: "en-GB",
      randomBytes: [4, 8, 15, 16],
      timeZone: "UTC",
    });
    const second = createFixedRuntime({
      locale: "en-GB",
      randomBytes: [4, 8, 15, 16],
      timeZone: "UTC",
    });

    expect(first.runtime.clock.now()).toBe("2026-01-01T00:00:00.000Z");
    expect(first.runtime.locale).toBe("en-GB");
    expect(first.runtime.timeZone).toBe("UTC");
    expect(first.runtime.idGenerator.nextId("project")).toBe("project-000001");
    expect(first.runtime.idGenerator.nextId("project")).toBe("project-000002");
    expect(first.runtime.idGenerator.nextId("profile")).toBe("profile-000001");
    expect(first.runtime.randomSource.nextBytes(6)).toEqual(
      new Uint8Array([4, 8, 15, 16, 4, 8]),
    );
    expect(second.runtime.randomSource.nextBytes(6)).toEqual(
      new Uint8Array([4, 8, 15, 16, 4, 8]),
    );
  });

  it("offers a controlled non-decreasing monotonic clock and stable UTF-8 hashes", async () => {
    const fixed = createFixedRuntime({ monotonicNowMilliseconds: 42 });

    expect(fixed.runtime.monotonicClock.nowMilliseconds()).toBe(42);
    fixed.advanceMonotonicMilliseconds(5);
    expect(fixed.runtime.monotonicClock.nowMilliseconds()).toBe(47);
    fixed.advanceMonotonicMilliseconds(-99);
    expect(fixed.runtime.monotonicClock.nowMilliseconds()).toBe(47);
    await expect(
      fixed.runtime.hashProvider.sha256(new TextEncoder().encode("abc")),
    ).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
