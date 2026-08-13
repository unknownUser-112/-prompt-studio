import { createCanonicalProjectStateV2Values } from "../../domain/entities/project-factory";
import type { DomainObject, DomainValue } from "../../domain/entities/project";

export function migrateProjectStateV1ToV2(state: DomainObject): DomainObject {
  if (state.schemaVersion !== 1) return state;

  const currentValues = isDomainObject(state.values) ? state.values : {};
  return {
    ...cloneObject(state),
    schemaVersion: 2,
    values: mergeMissing(currentValues, createCanonicalProjectStateV2Values()),
  };
}

function mergeMissing(current: DomainObject, baseline: DomainObject): DomainObject {
  const merged: Record<string, DomainValue> = cloneObject(current);
  for (const [key, baselineValue] of Object.entries(baseline)) {
    const currentValue = current[key];
    if (currentValue === undefined) {
      merged[key] = cloneValue(baselineValue);
    } else if (isDomainObject(currentValue) && isDomainObject(baselineValue)) {
      merged[key] = mergeMissing(currentValue, baselineValue);
    }
  }
  return merged;
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
