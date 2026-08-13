import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";
import type { ConstraintRule } from "../../domain/contracts/constraints/rule";
const PLUGIN_ID = "additional-person";
const VERSION = "1.0.0";
const rules: readonly ConstraintRule[] = [{ id: "additional-person.presence", version: VERSION, sourcePluginId: PLUGIN_ID, phase: "constraints", conflictStrategy: "reject", description: "Keeps the explicit additional-person setting traceable.", evaluate: ({ facts }) => { const present = nestedBoolean(facts.values, "scene", "additionalPerson"); return present === undefined ? [] : [{ path: "scene.additionalPerson", sourceField: "scene.additionalPerson", value: present }]; } }];
export const additionalPersonProvider: ConstraintProvider = { id: PLUGIN_ID, version: VERSION, sourcePluginId: PLUGIN_ID, rules: () => rules };
function nestedBoolean(value: unknown, first: string, second: string): boolean | undefined { if (value === null || Array.isArray(value) || typeof value !== "object") return undefined; const child = (value as Readonly<Record<string, unknown>>)[first]; return child !== null && !Array.isArray(child) && typeof child === "object" && typeof (child as Readonly<Record<string, unknown>>)[second] === "boolean" ? (child as Readonly<Record<string, unknown>>)[second] as boolean : undefined; }
