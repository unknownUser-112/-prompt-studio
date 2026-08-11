import { describe, expect, it } from "vitest";

import type { ModuleHealthContract } from "../../../src/contracts/core/module-health";
import { createDiagnosticsFacade } from "../../../src/diagnostics/public-facade";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

describe("diagnostics public facade", () => {
  it("returns deeply immutable, sanitised diagnostic snapshots without project content", async () => {
    const fixedRuntime = createFixedRuntime();
    const module: ModuleHealthContract = {
      moduleId: "core",
      version: "600.0.0",
      status: "ready",
      tests: [{ id: "core.health", version: "1.0.0" }],
      diagnose: async () => ({
        endedAt: "2026-01-01T00:00:01.000Z",
        error: {
          code: "diagnostic.failed",
          message: "diagnostic failure",
          projectContent: "private project",
          promptText: "private prompt",
        },
        moduleId: "core",
        moduleVersion: "600.0.0",
        result: "failed",
        severity: "error",
        startedAt: "2026-01-01T00:00:00.000Z",
        testVersion: "1.0.0",
        blobData: "private blob",
        importPayload: "private import",
        projectContent: "private project",
        promptText: "private prompt",
      } as unknown as ReturnType<ModuleHealthContract["diagnose"]> extends Promise<infer T> ? T : never),
      benchmark: async () => ({
        blobData: "private blob",
        durationMilliseconds: 1,
        endedAt: "2026-01-01T00:00:01.000Z",
        importPayload: "private import",
        moduleId: "core",
        moduleVersion: "600.0.0",
        projectContent: "private project",
        promptText: "private prompt",
        result: "passed",
        severity: "info",
        startedAt: "2026-01-01T00:00:00.000Z",
        testVersion: "1.0.0",
      } as unknown as ReturnType<ModuleHealthContract["benchmark"]> extends Promise<infer T> ? T : never),
    };
    const facade = createDiagnosticsFacade({
      build: { commit: "abc123", version: "600.0.0" },
      modules: [module],
      runtime: fixedRuntime.runtime,
    });

    const first = await facade.runSelfTests();
    const second = await facade.runSelfTests();
    const benchmarks = await facade.runBenchmarks();
    const exported = await facade.exportDiagnostics();

    expect(first).toEqual([{
      endedAt: "2026-01-01T00:00:01.000Z",
      error: { code: "diagnostic.failed", message: "diagnostic failure" },
      moduleId: "core",
      moduleVersion: "600.0.0",
      result: "failed",
      severity: "error",
      startedAt: "2026-01-01T00:00:00.000Z",
      testVersion: "1.0.0",
    }]);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]?.error)).toBe(true);
    expect(() => (first[0]!.error!.message = "changed")).toThrow();
    expect(second[0]?.error?.message).toBe("diagnostic failure");
    for (const report of [first[0], benchmarks[0], exported[0]]) {
      expect(report).not.toHaveProperty("promptText");
      expect(report).not.toHaveProperty("projectContent");
      expect(report).not.toHaveProperty("blobData");
      expect(report).not.toHaveProperty("importPayload");
    }
    expect(benchmarks[0]).toMatchObject({ severity: "info", testVersion: "1.0.0" });
    expect(Object.isFrozen(facade)).toBe(true);
    expect(Object.isFrozen(facade.build)).toBe(true);
    expect(Object.isFrozen(facade.health)).toBe(true);
    expect(Object.isFrozen(facade.registry)).toBe(true);
    expect(Object.isFrozen(facade.registry[0])).toBe(true);
    expect(Object.isFrozen(facade.capabilities)).toBe(true);
    expect(Object.isFrozen(facade.benchmarks)).toBe(true);
    expect(Object.isFrozen(facade.runSelfTests)).toBe(true);
    expect(Object.isFrozen(facade.runBenchmarks)).toBe(true);
    expect(Object.isFrozen(facade.exportDiagnostics)).toBe(true);
    expect(Object.isFrozen(benchmarks)).toBe(true);
    expect(Object.isFrozen(benchmarks[0])).toBe(true);
  });
});
