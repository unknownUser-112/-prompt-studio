import type { PromptStudioPlugin } from "../contracts/plugins/plugin-manifest";
import type { PluginRegistrar } from "../contracts/plugins/plugin-registrar";
import type { ConstraintProvider } from "../domain/contracts/constraints/provider";
import { CapabilityGraph } from "./capability-graph";

export type PluginStatus = "active" | "failed";

const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

export class PluginManager {
  private readonly diagnostics_: string[] = [];
  private constraintProviders_: readonly ConstraintProvider[] = [];
  private readonly statuses = new Map<string, PluginStatus>();
  private orderedPluginIds_: readonly string[] = [];

  get diagnostics(): readonly string[] {
    return this.diagnostics_;
  }

  get orderedPluginIds(): readonly string[] {
    return this.orderedPluginIds_;
  }

  get constraintProviders(): readonly ConstraintProvider[] {
    return this.constraintProviders_;
  }

  get canGeneratePrompts(): boolean {
    for (const [id, status] of this.statuses) {
      if (status === "failed" && this.pluginsById.get(id)?.manifest.required) return false;
    }
    return true;
  }

  private pluginsById = new Map<string, PromptStudioPlugin>();

  load(plugins: readonly PromptStudioPlugin[]): void {
    this.diagnostics_.length = 0;
    this.constraintProviders_ = [];
    this.statuses.clear();
    this.pluginsById = new Map();

    for (const plugin of plugins) {
      const { apiVersion, id, version } = plugin.manifest;
      if (this.pluginsById.has(id)) throw new Error(`Duplicate plugin id: ${id}`);
      if (!isSemVer(version)) throw new Error(`Invalid plugin version: ${id}`);
      if (!isSemVer(apiVersion)) throw new Error(`Invalid api version: ${id}`);
      this.pluginsById.set(id, plugin);
      this.statuses.set(id, "active");
    }

    const providers = new Map<string, string>();
    for (const [id, plugin] of this.pluginsById) {
      for (const capability of plugin.manifest.provides) {
        if (providers.has(capability)) {
          this.fail(id, `duplicate exclusive provider: ${capability}`);
          continue;
        }
        providers.set(capability, id);
      }
    }

    this.failMissingCapabilities(providers);
    this.failCycles(providers);
    this.failMissingCapabilities(providers);

    const graph = this.createGraph(providers);
    this.orderedPluginIds_ = graph.orderedPluginIds();

    for (const id of this.orderedPluginIds_) {
      if (this.statuses.get(id) !== "active") continue;
      try {
        this.pluginsById.get(id)?.register(createRegistrar((contribution) => {
          this.constraintProviders_ = [...this.constraintProviders_, contribution.provider];
        }));
      } catch (error) {
        this.fail(id, error instanceof Error ? error.message : String(error));
        this.failMissingCapabilities(providers);
      }
    }
  }

  pluginStatus(id: string): PluginStatus | undefined {
    return this.statuses.get(id);
  }

  assertPromptGenerationAvailable(): void {
    if (!this.canGeneratePrompts) {
      throw new Error("Prompt generation blocked by required plugin failure");
    }
  }

  private createGraph(providers: ReadonlyMap<string, string>): CapabilityGraph {
    const dependencies = new Map<string, readonly string[]>();

    for (const [id, plugin] of this.pluginsById) {
      if (this.statuses.get(id) !== "active") continue;
      const requiredPluginIds = plugin.manifest.requires
        .map((capability) => providers.get(capability))
        .filter((providerId): providerId is string => providerId !== undefined)
        .filter((providerId) => this.statuses.get(providerId) === "active");
      dependencies.set(id, requiredPluginIds);
    }

    return new CapabilityGraph(dependencies);
  }

  private failCycles(providers: ReadonlyMap<string, string>): void {
    const cyclicPluginIds = this.createGraph(providers).cyclicPluginIds();
    if (cyclicPluginIds.length === 0) return;

    this.diagnostics_.push(`capability cycle: ${cyclicPluginIds.join(", ")}`);
    for (const id of cyclicPluginIds) this.statuses.set(id, "failed");
  }

  private failMissingCapabilities(providers: ReadonlyMap<string, string>): void {
    let failedPlugin: boolean;

    do {
      failedPlugin = false;
      for (const [id, plugin] of this.pluginsById) {
        if (this.statuses.get(id) !== "active") continue;
        for (const capability of plugin.manifest.requires) {
          const providerId = providers.get(capability);
          if (providerId === undefined || this.statuses.get(providerId) !== "active") {
            failedPlugin = this.fail(id, `missing capability: ${capability}`) || failedPlugin;
            break;
          }
        }
      }
    } while (failedPlugin);
  }

  private fail(id: string, diagnostic: string): boolean {
    if (this.statuses.get(id) === "failed") return false;
    this.statuses.set(id, "failed");
    this.diagnostics_.push(diagnostic);
    return true;
  }
}

function isSemVer(value: string): boolean {
  const match = SEMVER.exec(value);
  if (match === null) return false;

  return (match[1] ?? "").split(".").every((identifier) =>
    !/^\d+$/u.test(identifier) || identifier === "0" || !identifier.startsWith("0"),
  );
}

function createRegistrar(onConstraint: (contribution: Parameters<PluginRegistrar["registerConstraint"]>[0]) => void): PluginRegistrar {
  return {
    registerBenchmark: () => undefined,
    registerCapability: () => undefined,
    registerConstraint: onConstraint,
    registerDiagnostic: () => undefined,
    registerJsonRenderer: () => undefined,
    registerMigration: () => undefined,
    registerProfileLayout: () => undefined,
    registerPromptSection: () => undefined,
    registerTextRenderer: () => undefined,
    registerUiBinding: () => undefined,
  };
}
