import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parsePage } from './pagination';

const Item = z.object({ id: z.number() });
const items = [{ id: 1 }, { id: 2 }];

describe('parsePage', () => {
  it.each([
    [
      'Laravel API resource',
      { data: items, meta: { current_page: 2, per_page: 2, total: 9, last_page: 5 }, links: {} },
      { page: 2, perPage: 2, total: 9, lastPage: 5 },
    ],
    [
      'Laravel paginator',
      { data: items, current_page: 2, per_page: 2, total: 9, last_page: 5 },
      { page: 2, perPage: 2, total: 9, lastPage: 5 },
    ],
    [
      'an envelope around a paginator',
      { status: 'success', data: { data: items, current_page: 3, per_page: 2, total: 6, last_page: 3 } },
      { page: 3, perPage: 2, total: 6, lastPage: 3 },
    ],
    [
      '{ items, total, page, pageSize }',
      { items, total: 7, page: 1, pageSize: 2 },
      { page: 1, perPage: 2, total: 7, lastPage: 4 },
    ],
    [
      '{ data, pagination }',
      { data: items, pagination: { page: 2, limit: 2, total: 4, totalPages: 2 } },
      { page: 2, perPage: 2, total: 4, lastPage: 2 },
    ],
  ])('reads the %s shape', (_name, body, expected) => {
    expect(parsePage(Item)(body)).toEqual({ items, ...expected });
  });

  it('fills the page and size from the request when the API leaves them out (Django REST Framework)', () => {
    const body = { count: 25, next: '…', previous: null, results: items };

    expect(parsePage(Item, { page: 3, perPage: 10 })(body)).toEqual({
      items,
      page: 3,
      perPage: 10,
      total: 25,
      lastPage: 3,
    });
  });

  it('reads a plain array as one page', () => {
    expect(parsePage(Item)(items)).toEqual({ items, page: 1, perPage: 2, total: 2, lastPage: 1 });
  });

  it('reads an empty list as one empty page', () => {
    expect(parsePage(Item)({ data: [], meta: { total: 0 } })).toEqual({
      items: [],
      page: 1,
      perPage: 1,
      total: 0,
      lastPage: 1,
    });
  });

  it('accepts numbers sent as strings', () => {
    expect(parsePage(Item)({ data: items, current_page: '2', per_page: '2', total: '4' })).toMatchObject({
      page: 2,
      perPage: 2,
      total: 4,
      lastPage: 2,
    });
  });

  it('checks every item', () => {
    expect(() => parsePage(Item)({ data: [{ id: 'one' }] })).toThrow();
  });

  it.each([null, 'text', { data: { id: 1 } }, { message: 'ok' }])('rejects %j, which is not a list', body => {
    expect(() => parsePage(Item)(body)).toThrow('not a paginated list');
  });
});
