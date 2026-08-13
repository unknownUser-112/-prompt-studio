import type { RuntimeEnvironment } from "../../../contracts/runtime/runtime-environment";
import type { DomainObject } from "../../entities/project";
import type { DomainValue } from "../../entities/project";
import type { ConstraintRule } from "../constraints/rule";
import type { NormalizedFacts } from "./facts";
import type { ResolutionTrace } from "./resolution-trace";

export interface ResolutionDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: "warning" | "error";
}

export interface ResolvedState {
  readonly facts: NormalizedFacts;
  readonly values: DomainObject;
  readonly trace: ResolutionTrace;
  readonly diagnostics: readonly ResolutionDiagnostic[];
  readonly stateHash: string;
}

export interface ResolvedStateAssignment {
  readonly path: string;
  readonly sourceField: string;
  readonly rule: ConstraintRule;
  readonly value: DomainValue;
}

export interface ResolvedStateBuilder {
  normalizeFacts(input: unknown): NormalizedFacts;
  readFact(facts: NormalizedFacts, path: string): DomainValue | undefined;
  buildResolvedValues(assignments: readonly ResolvedStateAssignment[]): DomainObject;
  build(
    input: unknown,
    assignments: readonly ResolvedStateAssignment[],
    runtime: RuntimeEnvironment,
    diagnostics?: readonly ResolutionDiagnostic[],
  ): Promise<ResolvedState>;
}
