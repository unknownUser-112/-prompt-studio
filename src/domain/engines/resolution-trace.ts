import type { ResolutionTrace, ResolutionTraceEntry } from "../contracts/resolved-state/resolution-trace";
import type { ResolvedStateAssignment } from "../contracts/resolved-state/resolved-state";

export function createResolutionTrace(assignments: readonly ResolvedStateAssignment[]): ResolutionTrace {
  const entries: ResolutionTraceEntry[] = assignments
    .slice()
    .sort((left, right) => compareCodeUnits(left.path, right.path) || compareCodeUnits(left.rule.id, right.rule.id))
    .map((assignment) => ({
      id: `${assignment.path}:${assignment.rule.id}`,
      path: assignment.path,
      pluginVersion: assignment.rule.version,
      ruleId: assignment.rule.id,
      ruleVersion: assignment.rule.version,
      sourceField: assignment.sourceField,
      sourcePluginId: assignment.rule.sourcePluginId,
    }));

  return { entries };
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
