import { createCanonicalProjectStateV3Values } from "../../domain/entities/project-factory";
import type { DomainObject, DomainValue } from "../../domain/entities/project";

export function migrateProjectStateV2ToV3(state: DomainObject): DomainObject {
  if (state.schemaVersion !== 2) return state;

  const values = isDomainObject(state.values) ? cloneObject(state.values) : {};
  const baseline = createCanonicalProjectStateV3Values();
  values.model = mergeMissingObject(values.model, baseline.model);
  values.realism = mergeMissingObject(values.realism, baseline.realism);

  return {
    ...cloneObject(state),
    schemaVersion: 3,
    values,
  };
}

function mergeMissingObject(current: DomainValue | undefined, baseline: DomainObject): DomainObject {
  const result = isDomainObject(current) ? cloneObject(current) : {};
  for (const [key, value] of Object.entries(baseline)) {
    if (result[key] === undefined) result[key] = cloneValue(value);
  }
  return result;
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
