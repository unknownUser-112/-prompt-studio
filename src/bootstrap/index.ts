import { CommandDispatcher } from "../core/command-dispatcher";
import { AppCore } from "../core/app-core";
import { LifecycleFacade } from "../core/lifecycle";
import { QueryDispatcher } from "../core/query-dispatcher";
import { HandlerRegistry } from "../core/registry";
import { createBrowserRuntime } from "../infrastructure/runtime/browser-runtime";
import { adaptiveRealismPlugin } from "../plugins/adaptive-realism/plugin";
import { additionalPersonPlugin } from "../plugins/additional-person/plugin";
import { brandPlugin } from "../plugins/brand/plugin";
import { cameraPlugin } from "../plugins/camera/plugin";
import { characterSheetPlugin } from "../plugins/character-sheet/plugin";
import { garmentPlugin } from "../plugins/garment/plugin";
import { materialPhysicsPlugin } from "../plugins/material-physics/plugin";
import { modelBehaviourPlugin } from "../plugins/model-behaviour/plugin";
import { PluginManager } from "../plugins/plugin-manager";
import { safetyPlugin } from "../plugins/safety/plugin";
import { sceneLightingPlugin } from "../plugins/scene-lighting/plugin";
import { selfiePlugin } from "../plugins/selfie/plugin";
import { createApp } from "./create-app";

export { createApp } from "./create-app";
export { installDiagnostics } from "./install-diagnostics";

const root = document.querySelector<HTMLElement>("[data-prompt-studio-root]");

if (root !== null) root.dataset.ready = "true";

const runtimeResult = createBrowserRuntime();

if (runtimeResult.ok) {
  const registry = new HandlerRegistry();
  const plugins = new PluginManager();
  plugins.load([
    adaptiveRealismPlugin,
    additionalPersonPlugin,
    brandPlugin,
    cameraPlugin,
    characterSheetPlugin,
    garmentPlugin,
    materialPhysicsPlugin,
    modelBehaviourPlugin,
    safetyPlugin,
    sceneLightingPlugin,
    selfiePlugin,
  ]);
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
    plugins,
    runtime: runtimeResult.value,
  });
}
