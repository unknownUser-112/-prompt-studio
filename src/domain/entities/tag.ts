export interface Tag {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly slug: string;
  readonly name: string;
  readonly color: string | null;
}
