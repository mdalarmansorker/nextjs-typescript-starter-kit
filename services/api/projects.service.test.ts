import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleRequest } from './base.service';
import ProjectService from './projects.service';

vi.mock('./base.service', () => ({ handleRequest: vi.fn() }));

/** The options of the n-th handleRequest call. */
const options = (call = 0) => vi.mocked(handleRequest).mock.calls[call]![1]!;

beforeEach(() => {
  vi.mocked(handleRequest).mockReset();
});

describe('ProjectService', () => {
  it('lists a page of projects, ten per page', async () => {
    await ProjectService.index({ page: 2 });

    expect(handleRequest).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({ requiresAuth: true, query: { page: 2, per_page: 10 } }),
    );

    const page = options().parse!({ data: [{ id: 7, name: 'A' }], meta: { current_page: 2, total: 11, last_page: 2 } });

    expect(page).toEqual({
      items: [{ id: '7', name: 'A', description: null }],
      page: 2,
      perPage: 10,
      total: 11,
      lastPage: 2,
    });
  });

  it('reads a single project, bare or wrapped in data', async () => {
    await ProjectService.show('a/b');

    expect(handleRequest).toHaveBeenCalledWith('/projects/a%2Fb', expect.objectContaining({ requiresAuth: true }));

    const { parse } = options();

    expect(parse!({ data: { id: 1, name: 'A', description: 'B' } })).toEqual({ id: '1', name: 'A', description: 'B' });
    expect(parse!({ id: '1', name: 'A' })).toEqual({ id: '1', name: 'A', description: null });
    expect(() => parse!({ id: 1 })).toThrow();
  });

  it('creates, updates and deletes', async () => {
    const payload = { name: 'A', description: null };

    await ProjectService.store(payload);
    await ProjectService.update('1', payload);
    await ProjectService.destroy('1');

    expect(handleRequest).toHaveBeenNthCalledWith(
      1,
      '/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload), requiresAuth: true }),
    );
    expect(handleRequest).toHaveBeenNthCalledWith(
      2,
      '/projects/1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload), requiresAuth: true }),
    );
    expect(handleRequest).toHaveBeenNthCalledWith(3, '/projects/1', { method: 'DELETE', requiresAuth: true });
  });
});
