export type DomainValue =
  | null
  | string
  | number
  | boolean
  | readonly DomainValue[]
  | { readonly [key: string]: DomainValue };

export type DomainObject = Readonly<Record<string, DomainValue>>;
export type ProjectLifecycleStatus = "active" | "archived";

export interface Project {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly name: string;
  readonly state: DomainObject;
  readonly currentRevisionId: string | null;
  readonly autosavedAt: string | null;
  readonly lifecycleStatus: ProjectLifecycleStatus;
  readonly tagIds: readonly string[];
}
