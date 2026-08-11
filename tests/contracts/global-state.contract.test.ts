import { afterEach, describe, expect, it, vi } from "vitest";

import { installDiagnostics } from "../../src/bootstrap/install-diagnostics";
import { createDiagnosticsFacade } from "../../src/diagnostics/public-facade";
import { createFixedRuntime } from "../helpers/fixed-runtime";

describe("global state contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("installs the readonly facade through the real bootstrap entrypoint", async () => {
    const target: Record<string, unknown> = {};
    vi.stubGlobal("document", { querySelector: () => null });
    vi.stubGlobal("navigator", { language: "en-GB" });
    vi.stubGlobal("window", target);

    await import("../../src/bootstrap/index");

    const facade = target.PromptStudioV600 as Record<string, unknown>;
    expect(facade).toBeDefined();
    expect(Object.isFrozen(facade)).toBe(true);
    expect(Object.isFrozen(facade.build)).toBe(true);
    expect(Object.isFrozen(facade.health)).toBe(true);
    expect(Object.isFrozen(facade.registry)).toBe(true);
    expect(Object.isFrozen(facade.capabilities)).toBe(true);
    expect(Object.isFrozen(facade.benchmarks)).toBe(true);
    expect(Object.isFrozen(facade.runSelfTests)).toBe(true);
    expect(Object.isFrozen(facade.runBenchmarks)).toBe(true);
    expect(Object.isFrozen(facade.exportDiagnostics)).toBe(true);
  });

  it("installs only a deeply frozen readonly PromptStudioV600 facade", () => {
    const facade = createDiagnosticsFacade({
      build: { commit: "abc123", version: "600.0.0" },
      modules: [],
      runtime: createFixedRuntime().runtime,
    });
    const target: Record<string, unknown> = {};

    installDiagnostics(target, facade);

    const globalFacade = target.PromptStudioV600 as Record<string, unknown>;
    expect(globalFacade).toBe(facade);
    expect(Object.isFrozen(globalFacade)).toBe(true);
    expect(Object.isFrozen(globalFacade.build)).toBe(true);
    expect(Object.keys(globalFacade).sort()).toEqual([
      "benchmarks",
      "build",
      "capabilities",
      "exportDiagnostics",
      "health",
      "registry",
      "runBenchmarks",
      "runSelfTests",
      "version",
    ]);
    expect(globalFacade).not.toHaveProperty("projects");
    expect(globalFacade).not.toHaveProperty("settings");
    expect(globalFacade).not.toHaveProperty("featureFlags");
    expect(globalFacade).not.toHaveProperty("database");
    expect(() => (globalFacade.version = "changed")).toThrow();
    expect(() => (globalFacade.build as Record<string, unknown>).commit = "changed").toThrow();
  });
});
