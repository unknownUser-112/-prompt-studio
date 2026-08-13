import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { DomainObject } from "../entities/project";
import type { ConstraintPhase } from "../contracts/constraints/phases";
import type { ConstraintProvider } from "../contracts/constraints/provider";
import type { ConstraintAssignment, ConstraintRule } from "../contracts/constraints/rule";
import type { ResolvedState, ResolvedStateAssignment, ResolvedStateBuilder } from "../contracts/resolved-state/resolved-state";

const PHASE_ORDER: Readonly<Record<ConstraintPhase, number>> = {
  facts: 0,
  constraints: 1,
  "model-behaviour": 2,
  validation: 3,
};

export class ConstraintEngine {
  public constructor(private readonly dependencies: ConstraintEngineDependencies) {}

  public async resolve(input: unknown, providers: readonly ConstraintProvider[]): Promise<ResolvedState> {
    const facts = this.dependencies.stateBuilder.normalizeFacts(input);
    const assignments = new Map<string, ResolvedStateAssignment>();

    for (const rule of orderedRules(providers)) {
      const context = { facts, resolvedValues: valuesFrom(assignments, this.dependencies.stateBuilder) };
      for (const assignment of rule.evaluate(context)) {
        applyAssignment(assignments, assignment, rule, facts.values, this.dependencies.stateBuilder);
      }
    }

    return this.dependencies.stateBuilder.build(input, [...assignments.values()], this.dependencies.runtime);
  }
}

export interface ConstraintEngineDependencies {
  readonly runtime: RuntimeEnvironment;
  readonly stateBuilder: ResolvedStateBuilder;
}

function orderedRules(providers: readonly ConstraintProvider[]): readonly ConstraintRule[] {
  const rules = providers
    .slice()
    .sort((left, right) => compareCodeUnits(left.id, right.id))
    .flatMap((provider) => provider.rules().map((rule) => ({ provider, rule })));

  for (const { provider, rule } of rules) {
    if (rule.sourcePluginId !== provider.sourcePluginId) {
      throw new Error(`Rule ${rule.id} has a mismatched source plugin`);
    }
    if (rule.version !== provider.version) throw new Error(`Rule ${rule.id} has a mismatched version`);
  }

  return rules
    .map(({ rule }) => rule)
    .sort((left, right) => PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase] || compareCodeUnits(left.id, right.id));
}

function applyAssignment(
  assignments: Map<string, ResolvedStateAssignment>,
  assignment: ConstraintAssignment,
  rule: ConstraintRule,
  facts: DomainObject,
  stateBuilder: ResolvedStateBuilder,
): void {
  if (stateBuilder.readFact({ values: facts }, assignment.sourceField) === undefined) {
    throw new Error(`Rule ${rule.id} references an unknown source fact: ${assignment.sourceField}`);
  }

  const existing = assignments.get(assignment.path);
  const relatedPath = [...assignments.keys()].find((path) => path !== assignment.path && pathsOverlap(path, assignment.path));
  if (relatedPath !== undefined) {
    throw new Error(`Resolved path conflict: ${relatedPath} and ${assignment.path}`);
  }
  if (existing !== undefined && rule.conflictStrategy === "reject") {
    throw new Error(`Rule conflict at ${assignment.path}: ${existing.rule.id} and ${rule.id}`);
  }
  if (existing !== undefined && rule.conflictStrategy === "preserve") return;

  assignments.set(assignment.path, { ...assignment, rule });
}

function valuesFrom(assignments: ReadonlyMap<string, ResolvedStateAssignment>, stateBuilder: ResolvedStateBuilder) {
  return stateBuilder.buildResolvedValues([...assignments.values()]);
}

function pathsOverlap(left: string, right: string): boolean {
  return left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
