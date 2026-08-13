import { createCanonicalProjectStateV4Values } from "../../domain/entities/project-factory";
import type { DomainObject, DomainValue } from "../../domain/entities/project";
import { migrateProjectStateV1ToV2 } from "./v600-project-state-v1-to-v2";
import { migrateProjectStateV2ToV3 } from "./v600-project-state-v2-to-v3";

export function migrateProjectStateV3ToV4(state: DomainObject): DomainObject {
  if (state.schemaVersion !== 3) return state;

  const values = isDomainObject(state.values) ? cloneObject(state.values) : {};
  const baselineCharacter = createCanonicalProjectStateV4Values().character;
  const character = isDomainObject(values.character) ? cloneObject(values.character) : {};
  for (const field of ["faceShape", "eyeShape", "noseShape", "faceAge"] as const) {
    if (character[field] === undefined) character[field] = baselineCharacter[field];
  }
  values.character = character;

  return {
    ...cloneObject(state),
    schemaVersion: 4,
    values,
  };
}

export function migrateProjectStateToCurrent(state: DomainObject): DomainObject {
  const v2 = migrateProjectStateV1ToV2(state);
  const v3 = migrateProjectStateV2ToV3(v2);
  return migrateProjectStateV3ToV4(v3);
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
