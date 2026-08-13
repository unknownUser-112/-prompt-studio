import type { DomainObject, DomainValue } from "../../entities/project";
import type { NormalizedFacts } from "../resolved-state/facts";
import type { ConstraintPhase } from "./phases";

export type ConflictStrategy = "reject" | "replace" | "preserve";

interface ConstraintAssignmentFields {
  readonly path: string;
  readonly value: DomainValue;
}

interface SingleSourceConstraintAssignment {
  readonly sourceField: string;
  readonly sourceFields?: never;
}

interface MultiSourceConstraintAssignment {
  readonly sourceField?: never;
  readonly sourceFields: readonly [string, string, ...string[]];
}

export type ConstraintAssignment = ConstraintAssignmentFields & (
  SingleSourceConstraintAssignment | MultiSourceConstraintAssignment
);

export interface ConstraintRuleContext {
  readonly facts: NormalizedFacts;
  readonly resolvedValues: DomainObject;
}

export interface ConstraintRule {
  readonly id: string;
  readonly version: string;
  readonly sourcePluginId: string;
  readonly phase: ConstraintPhase;
  readonly conflictStrategy: ConflictStrategy;
  readonly description: string;
  evaluate(context: Readonly<ConstraintRuleContext>): readonly ConstraintAssignment[];
}
