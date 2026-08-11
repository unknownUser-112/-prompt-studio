import type { RuntimeEnvironment } from "../../contracts/runtime/runtime-environment";
import type { ProjectRevisionReason } from "../../contracts/storage/records/project-revision";
import type { Project } from "../../domain/entities/project";
import type { ProjectRevision } from "../../domain/entities/project-revision";

export class RevisionService {
  public constructor(private readonly runtime: RuntimeEnvironment) {}

  public async create(
    project: Project,
    reason: ProjectRevisionReason,
    sequence: number,
    parentRevisionId: string | null = project.currentRevisionId,
  ): Promise<ProjectRevision> {
    const timestamp = this.runtime.clock.now();
    const snapshot = {
      name: project.name,
      state: project.state,
      lifecycleStatus: project.lifecycleStatus,
      tagIds: project.tagIds,
    };
    const bytes = new TextEncoder().encode(canonicalSerialize(snapshot));
    return {
      id: this.runtime.idGenerator.nextId("project-revision"),
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 0,
      projectId: project.id,
      sequence,
      reason,
      parentRevisionId,
      snapshot,
      sha256: await this.runtime.hashProvider.sha256(bytes),
    };
  }
}

function canonicalSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalSerialize(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
