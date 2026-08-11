export class CapabilityGraph {
  constructor(private readonly dependencies: ReadonlyMap<string, readonly string[]>) {}

  orderedPluginIds(): readonly string[] {
    const dependents = new Map<string, string[]>();
    const remainingDependencies = new Map<string, number>();

    for (const [id, requiredPluginIds] of this.dependencies) {
      remainingDependencies.set(id, requiredPluginIds.length);
      for (const requiredPluginId of requiredPluginIds) {
        const entries = dependents.get(requiredPluginId) ?? [];
        entries.push(id);
        dependents.set(requiredPluginId, entries);
      }
    }

    const ready = [...remainingDependencies]
      .filter(([, count]) => count === 0)
      .map(([id]) => id)
      .sort();
    const ordered: string[] = [];

    while (ready.length > 0) {
      const id = ready.shift();
      if (id === undefined) continue;
      ordered.push(id);

      for (const dependentId of dependents.get(id) ?? []) {
        const remaining = (remainingDependencies.get(dependentId) ?? 0) - 1;
        remainingDependencies.set(dependentId, remaining);
        if (remaining === 0) {
          ready.push(dependentId);
          ready.sort();
        }
      }
    }

    return ordered;
  }

  cyclicPluginIds(): readonly string[] {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const cycleMembers = new Set<string>();
    const trail: string[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        for (const member of trail.slice(trail.indexOf(id))) cycleMembers.add(member);
        return;
      }

      visiting.add(id);
      trail.push(id);
      for (const dependency of this.dependencies.get(id) ?? []) visit(dependency);
      trail.pop();
      visiting.delete(id);
      visited.add(id);
    };

    for (const id of this.dependencies.keys()) visit(id);
    return [...cycleMembers].sort();
  }
}
