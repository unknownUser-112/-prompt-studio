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
  const normalizedAssignment = normalizeAssignmentSources(assignment, rule);
  for (const sourceField of assignmentSourceFields(normalizedAssignment)) {
    if (stateBuilder.readFact({ values: facts }, sourceField) === undefined) {
      throw new Error(`Rule ${rule.id} references an unknown source fact: ${sourceField}`);
    }
  }

  const existing = assignments.get(normalizedAssignment.path);
  const relatedPath = [...assignments.keys()].find((path) => path !== normalizedAssignment.path && pathsOverlap(path, normalizedAssignment.path));
  if (relatedPath !== undefined) {
    throw new Error(`Resolved path conflict: ${relatedPath} and ${normalizedAssignment.path}`);
  }
  if (existing !== undefined && rule.conflictStrategy === "reject") {
    throw new Error(`Rule conflict at ${normalizedAssignment.path}: ${existing.rule.id} and ${rule.id}`);
  }
  if (existing !== undefined && rule.conflictStrategy === "preserve") return;

  assignments.set(normalizedAssignment.path, resolvedAssignment(normalizedAssignment, rule));
}

function normalizeAssignmentSources(assignment: ConstraintAssignment, rule: ConstraintRule): ConstraintAssignment {
  const sourceField = assignment.sourceField;
  const sourceFields = assignment.sourceFields;
  if (typeof sourceField === "string") {
    if (sourceFields !== undefined) {
      throw new Error(`Rule ${rule.id} must declare exactly one source declaration`);
    }
    return assignment;
  }
  if (sourceFields === undefined) {
    throw new Error(`Rule ${rule.id} must declare exactly one source declaration`);
  }
  if (sourceFields.length < 2) {
    throw new Error(`Rule ${rule.id} must declare at least two source fields`);
  }

  const canonical = [...sourceFields].sort(compareCodeUnits);
  if (new Set(canonical).size !== canonical.length) {
    throw new Error(`Rule ${rule.id} declares a duplicate source field`);
  }
  return { ...assignment, sourceFields: canonical as [string, string, ...string[]] };
}

function assignmentSourceFields(assignment: ConstraintAssignment): readonly string[] {
  return assignment.sourceFields ?? [assignment.sourceField];
}

function resolvedAssignment(assignment: ConstraintAssignment, rule: ConstraintRule): ResolvedStateAssignment {
  if (assignment.sourceFields !== undefined) {
    return { path: assignment.path, rule, sourceFields: assignment.sourceFields, value: assignment.value };
  }
  return { path: assignment.path, rule, sourceField: assignment.sourceField, value: assignment.value };
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
