import type { DomainObject, DomainValue } from "../../entities/project";

export type FactValue = DomainValue;

export interface NormalizedFacts {
  readonly values: DomainObject;
}
