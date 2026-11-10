import 'server-only';

import { z } from 'zod';

import { PROJECTS } from '@/constants/api';
import type { Page, Project, ProjectPayload } from '@/types';

import { handleRequest } from './base.service';
import { parsePage } from './pagination';

/** Projects per page in the list. */
export const PROJECTS_PER_PAGE = 10;

const ProjectSchema = z.object({
  // Some APIs send numeric ids; the app treats every id as a string.
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  description: z
    .string()
    .nullish()
    .transform(value => value ?? null),
}) satisfies z.ZodType<Project, unknown>;

/** A single project, bare or wrapped in `{ data: … }` (Laravel API resources). */
const parseProject = (body: unknown): Project =>
  ProjectSchema.parse(typeof body === 'object' && body !== null && 'data' in body ? body.data : body);

const projectPath = (id: string) => `${PROJECTS}/${encodeURIComponent(id)}`;

/**
 * Example resource service: one method per endpoint, every response checked with zod.
 * Server-only: call it from Server Components to read, and from server actions to write.
 */
export default class ProjectService {
  static index = ({ page = 1 }: { page?: number } = {}): Promise<Page<Project>> =>
    handleRequest(PROJECTS, {
      requiresAuth: true,
      query: { page, per_page: PROJECTS_PER_PAGE },
      parse: parsePage(ProjectSchema, { page, perPage: PROJECTS_PER_PAGE }),
    });

  static show = (id: string): Promise<Project> =>
    handleRequest(projectPath(id), { requiresAuth: true, parse: parseProject });

  static store = (payload: ProjectPayload): Promise<Project> =>
    handleRequest(PROJECTS, {
      requiresAuth: true,
      method: 'POST',
      body: JSON.stringify(payload),
      parse: parseProject,
    });

  static update = (id: string, payload: ProjectPayload): Promise<Project> =>
    handleRequest(projectPath(id), {
      requiresAuth: true,
      method: 'PUT',
      body: JSON.stringify(payload),
      parse: parseProject,
    });

  static destroy = (id: string): Promise<void> =>
    handleRequest(projectPath(id), { requiresAuth: true, method: 'DELETE' });
}
