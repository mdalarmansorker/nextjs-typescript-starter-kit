export interface Project {
  id: string;
  name: string;
  description: string | null;
}

/** What the create and edit forms send. */
export type ProjectPayload = Omit<Project, 'id'>;
