import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api/api-errors';
import ProjectService from '@/services/api/projects.service';

import { createProject, deleteProject, updateProject } from './actions';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/services/api/projects.service', () => ({
  default: { store: vi.fn(), update: vi.fn(), destroy: vi.fn() },
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) data.set(key, value);

  return data;
};

beforeEach(() => {
  vi.mocked(ProjectService.store).mockReset();
  vi.mocked(ProjectService.update).mockReset();
  vi.mocked(ProjectService.destroy).mockReset();
});

describe('createProject', () => {
  it('creates the project with trimmed values and goes to the list', async () => {
    await expect(createProject({}, form({ name: '  Apollo ', description: '' }))).rejects.toThrow('NEXT_REDIRECT');

    expect(ProjectService.store).toHaveBeenCalledWith({ name: 'Apollo', description: null });
    expect(redirect).toHaveBeenCalledWith('/projects');
  });

  it('returns validation errors without calling the API, keeping what was typed', async () => {
    const state = await createProject({}, form({ name: ' ', description: 'Notes' }));

    expect(state).toEqual({ values: { name: ' ', description: 'Notes' }, fieldErrors: { name: ['Enter a name.'] } });
    expect(ProjectService.store).not.toHaveBeenCalled();
  });

  it("returns the API's own validation errors", async () => {
    vi.mocked(ProjectService.store).mockRejectedValue(
      new ApiError('The name has already been taken.', 422, { name: ['The name has already been taken.'] }),
    );

    const state = await createProject({}, form({ name: 'Apollo', description: '' }));

    expect(state).toMatchObject({
      message: 'The name has already been taken.',
      fieldErrors: { name: ['The name has already been taken.'] },
      values: { name: 'Apollo', description: '' },
    });
  });

  it('lets server errors reach the error page', async () => {
    vi.mocked(ProjectService.store).mockRejectedValue(new ApiError('Down', 503));

    await expect(createProject({}, form({ name: 'Apollo' }))).rejects.toMatchObject({ status: 503 });
  });
});

describe('updateProject', () => {
  it('updates the bound project and goes to the list', async () => {
    await expect(updateProject('7', {}, form({ name: 'Renamed', description: 'New' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(ProjectService.update).toHaveBeenCalledWith('7', { name: 'Renamed', description: 'New' });
  });

  it('lets a 404 (deleted meanwhile) reach the not-found page', async () => {
    vi.mocked(ProjectService.update).mockRejectedValue(new ApiError('Project not found.', 404));

    await expect(updateProject('7', {}, form({ name: 'A' }))).rejects.toMatchObject({ status: 404 });
  });
});

describe('deleteProject', () => {
  it('deletes the project and returns to the list', async () => {
    await expect(deleteProject('7')).rejects.toThrow('NEXT_REDIRECT');

    expect(ProjectService.destroy).toHaveBeenCalledWith('7');
    expect(redirect).toHaveBeenCalledWith('/projects');
  });

  it('treats an already deleted project as deleted', async () => {
    vi.mocked(ProjectService.destroy).mockRejectedValue(new ApiError('Project not found.', 404));

    await expect(deleteProject('7')).rejects.toThrow('NEXT_REDIRECT');
  });

  it('lets other failures through', async () => {
    vi.mocked(ProjectService.destroy).mockRejectedValue(new ApiError('Forbidden', 403));

    await expect(deleteProject('7')).rejects.toMatchObject({ status: 403 });
  });
});
