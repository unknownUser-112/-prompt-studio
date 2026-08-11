import type { CapabilityId, PluginRegistrar } from "./plugin-registrar";

export interface PluginManifest {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: string;
  readonly required: boolean;
  readonly provides: readonly CapabilityId[];
  readonly requires: readonly CapabilityId[];
}

export interface PromptStudioPlugin {
  readonly manifest: PluginManifest;
  register(registrar: PluginRegistrar): void;
}
