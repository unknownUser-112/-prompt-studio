import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { Project } from "./project";

export function createNewProject(_runtime: RuntimeEnvironment, _name = "Neues Projekt"): Project {
  const timestamp = _runtime.clock.now();
  return {
    id: _runtime.idGenerator.nextId("project"),
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    name: _name,
    state: {
      schemaVersion: 1,
      wizardStep: 1,
      values: {},
      assetIds: [],
    },
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [],
  };
}

export function duplicateProject(runtime: RuntimeEnvironment, source: Project): Project {
  const timestamp = runtime.clock.now();
  return {
    id: runtime.idGenerator.nextId("project"),
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    name: `${source.name} Kopie`,
    state: cloneValue(source.state),
    currentRevisionId: null,
    autosavedAt: null,
    lifecycleStatus: "active",
    tagIds: [...source.tagIds],
  };
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Readonly<Record<string, unknown>>)
        .map(([key, child]) => [key, cloneValue(child)]),
    ) as T;
  }
  return value;
}
