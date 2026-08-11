import { CommandDispatcher } from "../core/command-dispatcher";
import { AppCore } from "../core/app-core";
import { LifecycleFacade } from "../core/lifecycle";
import { QueryDispatcher } from "../core/query-dispatcher";
import { HandlerRegistry } from "../core/registry";
import { createBrowserRuntime } from "../infrastructure/runtime/browser-runtime";
import { PluginManager } from "../plugins/plugin-manager";
import { createApp } from "./create-app";

export { createApp } from "./create-app";
export { installDiagnostics } from "./install-diagnostics";

const root = document.querySelector<HTMLElement>("[data-prompt-studio-root]");

if (root !== null) root.dataset.ready = "true";

const runtimeResult = createBrowserRuntime();

if (runtimeResult.ok) {
  const registry = new HandlerRegistry();
  createApp({
    build: { commit: "development", version: "600.0.0" },
    core: new AppCore({
      commandDispatcher: new CommandDispatcher(registry),
      lifecycle: new LifecycleFacade([]),
      queryDispatcher: new QueryDispatcher(registry),
      runtime: runtimeResult.value,
    }),
    globalTarget: window as unknown as Record<string, unknown>,
    modules: [],
    plugins: new PluginManager(),
    runtime: runtimeResult.value,
  });
}
