import { createCanonicalProjectStateV5Values } from "../../domain/entities/project-factory";
import type { DomainObject, DomainValue } from "../../domain/entities/project";
import { migrateProjectStateToCurrent as migrateProjectStateToV4 } from "./v600-project-state-v3-to-v4";

export function migrateProjectStateV4ToV5(state: DomainObject): DomainObject {
  if (state.schemaVersion !== 4) return state;

  const values = isDomainObject(state.values) ? cloneObject(state.values) : {};
  const scene = isDomainObject(values.scene) ? cloneObject(values.scene) : {};
  if (scene.additionalPerson === undefined) {
    scene.additionalPerson = createCanonicalProjectStateV5Values().scene.additionalPerson;
  }
  values.scene = scene;

  return { ...cloneObject(state), schemaVersion: 5, values };
}

export function migrateProjectStateToCurrent(state: DomainObject): DomainObject {
  return migrateProjectStateV4ToV5(migrateProjectStateToV4(state));
}

function isDomainObject(value: DomainValue | undefined): value is DomainObject {
  return value !== null && value !== undefined && !Array.isArray(value) && typeof value === "object";
}

function cloneObject(value: DomainObject): Record<string, DomainValue> {
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)]));
}

function cloneValue(value: DomainValue): DomainValue {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isDomainObject(value)) return cloneObject(value);
  return value;
}
