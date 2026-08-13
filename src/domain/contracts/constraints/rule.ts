import type { DomainObject, DomainValue } from "../../entities/project";
import type { NormalizedFacts } from "../resolved-state/facts";
import type { ConstraintPhase } from "./phases";

export type ConflictStrategy = "reject" | "replace" | "preserve";

export interface ConstraintAssignment {
  readonly path: string;
  readonly sourceField: string;
  readonly value: DomainValue;
}

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
