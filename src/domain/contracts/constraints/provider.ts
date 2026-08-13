import type { ConstraintRule } from "./rule";

export interface ConstraintProvider {
  readonly id: string;
  readonly version: string;
  readonly sourcePluginId: string;
  rules(): readonly ConstraintRule[];
}
