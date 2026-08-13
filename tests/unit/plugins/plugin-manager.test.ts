import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../src/domain/contracts/constraints/provider";
import type { PluginManifest, PromptStudioPlugin } from "../../../src/contracts/plugins/plugin-manifest";
import { PluginManager } from "../../../src/plugins/plugin-manager";

function plugin(
  id: string,
  options: Partial<Pick<PluginManifest, "provides" | "required" | "requires" | "version" | "apiVersion">> = {},
  register: PromptStudioPlugin["register"] = () => undefined,
): PromptStudioPlugin {
  return {
    manifest: {
      apiVersion: "1.0.0",
      id,
      provides: [],
      required: false,
      requires: [],
      version: "1.0.0",
      ...options,
    },
    register,
  };
}

describe("PluginManager", () => {
  it("orders capability providers before consumers regardless of import order and breaks ties by plugin id", () => {
    const manager = new PluginManager();

    manager.load([
      plugin("z-consumer", { requires: ["prompt.section"] }),
      plugin("b-independent"),
      plugin("a-provider", { provides: ["prompt.section"] }),
    ]);

    expect(manager.orderedPluginIds).toEqual([
      "a-provider",
      "b-independent",
      "z-consumer",
    ]);
  });

  it("rejects duplicate plugin ids", () => {
    const manager = new PluginManager();

    expect(() => manager.load([plugin("duplicate"), plugin("duplicate")])).toThrow(
      /duplicate plugin id: duplicate/i,
    );
  });

  it("rejects invalid plugin and api semantic versions", () => {
    expect(() => new PluginManager().load([plugin("invalid-plugin", { version: "1" })])).toThrow(
      /invalid plugin version/i,
    );
    expect(() => new PluginManager().load([plugin("invalid-api", { apiVersion: "v1" })])).toThrow(
      /invalid api version/i,
    );
  });

  it("rejects numeric prerelease identifiers with leading zeroes", () => {
    expect(() =>
      new PluginManager().load([plugin("invalid-plugin-prerelease", { version: "1.0.0-01" })]),
    ).toThrow(/invalid plugin version/i);
    expect(() =>
      new PluginManager().load([plugin("invalid-api-prerelease", { apiVersion: "1.0.0-01" })]),
    ).toThrow(/invalid api version/i);
  });

  it("marks plugins with missing capabilities as failed without stopping optional plugins", () => {
    const manager = new PluginManager();

    manager.load([
      plugin("broken-optional", { requires: ["missing.capability"] }),
      plugin("healthy-optional"),
    ]);

    expect(manager.pluginStatus("broken-optional")).toBe("failed");
    expect(manager.diagnostics).toContain("missing capability: missing.capability");
    expect(manager.pluginStatus("healthy-optional")).toBe("active");
    expect(manager.canGeneratePrompts).toBe(true);
  });

  it("marks duplicate exclusive capability providers and capability cycles as failed", () => {
    const manager = new PluginManager();

    manager.load([
      plugin("first", { provides: ["exclusive"] }),
      plugin("second", { provides: ["exclusive"] }),
      plugin("cycle-a", { provides: ["a"], requires: ["b"] }),
      plugin("cycle-b", { provides: ["b"], requires: ["a"] }),
    ]);

    expect(manager.pluginStatus("second")).toBe("failed");
    expect(manager.diagnostics).toContain("duplicate exclusive provider: exclusive");
    expect(manager.pluginStatus("cycle-a")).toBe("failed");
    expect(manager.pluginStatus("cycle-b")).toBe("failed");
    expect(manager.diagnostics).toContain("capability cycle: cycle-a, cycle-b");
  });

  it("isolates optional registration failures and blocks prompt generation for required failures", () => {
    const manager = new PluginManager();

    manager.load([
      plugin("optional-failure", {}, () => {
        throw new Error("optional exploded");
      }),
      plugin("required-failure", { required: true }, () => {
        throw new Error("required exploded");
      }),
    ]);

    expect(manager.pluginStatus("optional-failure")).toBe("failed");
    expect(manager.pluginStatus("required-failure")).toBe("failed");
    expect(manager.canGeneratePrompts).toBe(false);
    expect(() => manager.assertPromptGenerationAvailable()).toThrow(
      /prompt generation blocked by required plugin failure/i,
    );
  });

  it("fails dependent plugins transitively when a capability provider fails during registration", () => {
    let bridgeRegistered = false;
    let requiredConsumerRegistered = false;
    const manager = new PluginManager();

    manager.load([
      plugin(
        "required-consumer",
        { required: true, requires: ["bridge.capability"] },
        () => {
          requiredConsumerRegistered = true;
        },
      ),
      plugin(
        "bridge",
        { provides: ["bridge.capability"], requires: ["provider.capability"] },
        () => {
          bridgeRegistered = true;
        },
      ),
      plugin(
        "optional-provider",
        { provides: ["provider.capability"] },
        () => {
          throw new Error("provider exploded");
        },
      ),
    ]);

    expect(manager.pluginStatus("optional-provider")).toBe("failed");
    expect(manager.pluginStatus("bridge")).toBe("failed");
    expect(manager.pluginStatus("required-consumer")).toBe("failed");
    expect(bridgeRegistered).toBe(false);
    expect(requiredConsumerRegistered).toBe(false);
    expect(manager.canGeneratePrompts).toBe(false);
  });

  it("exposes only contribution ports to plugins", () => {
    let receivedRegistrar: object | undefined;
    const manager = new PluginManager();

    manager.load([
      plugin("contributor", {}, (registrar) => {
        receivedRegistrar = registrar;
        registrar.registerPromptSection({ id: "summary", provide: () => "Summary" });
        registrar.registerCapability("prompt.section");
      }),
    ]);

    expect(Object.keys(receivedRegistrar ?? {}).sort()).toEqual([
      "registerBenchmark",
      "registerCapability",
      "registerConstraint",
      "registerDiagnostic",
      "registerJsonRenderer",
      "registerMigration",
      "registerProfileLayout",
      "registerPromptSection",
      "registerTextRenderer",
      "registerUiBinding",
    ]);
    expect(receivedRegistrar).not.toHaveProperty("appCore");
  });

  it("retains complete constraint providers from separate plugins", () => {
    const first: ConstraintProvider = { id: "first", version: "1.0.0", sourcePluginId: "first", rules: () => [] };
    const second: ConstraintProvider = { id: "second", version: "1.0.0", sourcePluginId: "second", rules: () => [] };
    const manager = new PluginManager();

    manager.load([
      plugin("first", {}, (registrar) => registrar.registerConstraint({ id: first.id, provider: first })),
      plugin("second", {}, (registrar) => registrar.registerConstraint({ id: second.id, provider: second })),
    ]);

    expect(manager.constraintProviders).toEqual([first, second]);
    expect(manager.constraintProviders.map((provider) => [provider.id, provider.rules])).toEqual([
      ["first", first.rules],
      ["second", second.rules],
    ]);
  });
});
