import type { ModuleHealthContract } from "../contracts/core/module-health";
import type { RuntimeEnvironment } from "../contracts/runtime/runtime-environment";
import type { AppCore } from "../core/app-core";
import { createDiagnosticsFacade, type DiagnosticsBuildInformation, type DiagnosticsPublicFacade } from "../diagnostics/public-facade";
import type { PluginManager } from "../plugins/plugin-manager";
import { installDiagnostics } from "./install-diagnostics";

export interface CreateAppOptions {
  readonly core: AppCore;
  readonly plugins: PluginManager;
  readonly runtime: RuntimeEnvironment;
  readonly modules: readonly ModuleHealthContract[];
  readonly build: DiagnosticsBuildInformation;
  readonly globalTarget: Record<string, unknown>;
}

export interface PromptStudioApp {
  readonly core: AppCore;
  readonly diagnostics: DiagnosticsPublicFacade;
  readonly plugins: PluginManager;
}

export function createApp(options: CreateAppOptions): PromptStudioApp {
  const diagnostics = createDiagnosticsFacade({
    build: options.build,
    capabilities: options.plugins.orderedPluginIds,
    health: { lifecycle: options.core.health.lifecycle },
    modules: options.modules,
    runtime: options.runtime,
  });
  installDiagnostics(options.globalTarget, diagnostics);

  return { core: options.core, diagnostics, plugins: options.plugins };
}
