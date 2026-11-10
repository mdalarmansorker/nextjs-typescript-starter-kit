'use server';

import { redirect } from 'next/navigation';

import { z } from 'zod';

import { ApiError } from '@/services/api/api-errors';
import ProjectService from '@/services/api/projects.service';

import type { ProjectPayload } from '@/types';

export interface ProjectFormState {
  message?: string;
  fieldErrors?: Partial<Record<keyof ProjectPayload, string[]>>;
  /** What the user typed, so the form keeps it after an error. */
  values?: { name: string; description: string };
}

const ProjectFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use at most 100 characters.'),
  description: z
    .string()
    .trim()
    .max(500, 'Use at most 500 characters.')
    .transform(value => value || null),
});

/**
 * Validates the form, then creates (`id` null) or updates the project. Returns the errors to show, or
 * nothing on success.
 */
const save = async (id: string | null, formData: FormData): Promise<ProjectFormState | undefined> => {
  const values = {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
  };
  const parsed = ProjectFormSchema.safeParse(values);

  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    if (id === null) {
      await ProjectService.store(parsed.data);
    } else {
      await ProjectService.update(id, parsed.data);
    }
  } catch (error) {
    // The API's own validation (e.g. "The name has already been taken.") goes back to the form.
    if (error instanceof ApiError && error.status < 500 && error.status !== 404) {
      return { values, message: error.message, fieldErrors: error.fieldErrors };
    }

    // 404 (deleted meanwhile) and 5xx go to the error and not-found pages.
    throw error;
  }

  return undefined;
};

export async function createProject(_previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const errors = await save(null, formData);

  if (errors) return errors;

  // Outside the try in `save`: redirect() works by throwing.
  redirect('/projects');
}

/** Bound to the project's id in the edit page: `updateProject.bind(null, id)`. */
export async function updateProject(
  id: string,
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const errors = await save(id, formData);

  if (errors) return errors;

  redirect('/projects');
}

/** Bound to the project's id in the list: `deleteProject.bind(null, id)`. */
export async function deleteProject(id: string): Promise<void> {
  try {
    await ProjectService.destroy(id);
  } catch (error) {
    // Already gone: the list below no longer shows it either way.
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }

  redirect('/projects');
}
