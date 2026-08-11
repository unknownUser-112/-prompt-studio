import type { DomainObject } from "./project";

export type ProfileKind = "built-in" | "custom";

export interface Profile {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly kind: ProfileKind;
  readonly name: string;
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly configuration: DomainObject;
}
