import { z } from 'zod';

import type { Page } from '@/types';

type Body = Record<string, unknown>;

const isObject = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The first value that is a whole number of at least `min`, also from a numeric string. */
const firstNumber = (min: number, ...values: unknown[]): number | undefined => {
  for (const value of values) {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    if (typeof number === 'number' && Number.isInteger(number) && number >= min) return number;
  }

  return undefined;
};

/** Finds the list and the object holding its page numbers. */
const locate = (body: unknown): { list: unknown; meta: Body } | undefined => {
  if (Array.isArray(body)) return { list: body, meta: {} };
  if (!isObject(body)) return undefined;

  // `{ status, data: { data: [...], current_page } }`: an envelope around a paginator.
  if (isObject(body.data) && Array.isArray(body.data.data)) return locate(body.data);

  const list = body.data ?? body.results ?? body.items;
  const meta = isObject(body.meta) ? body.meta : isObject(body.pagination) ? body.pagination : body;

  return Array.isArray(list) ? { list, meta } : undefined;
};

/**
 * Returns a `parse` function for `handleRequest` that reads a paginated list and checks each item with
 * `itemSchema`. It understands the common shapes:
 *
 * | Shape                                                         | Used by                          |
 * | ------------------------------------------------------------- | -------------------------------- |
 * | `{ data: [...], meta: { current_page, per_page, total, last_page } }` | Laravel API resources  |
 * | `{ data: [...], current_page, per_page, total, last_page }`   | Laravel paginator                |
 * | `{ count, next, previous, results: [...] }`                   | Django REST Framework            |
 * | `{ items: [...], total, page, pageSize }`, `{ data, pagination }` | many Node / Go APIs          |
 * | any of the above inside `{ status, data: {...} }`, or a plain array |                            |
 *
 * Numbers the API leaves out are filled from `requested` (the page and size you asked for) or worked out
 * from the others. Adapt `locate` and the field names here if your API differs.
 *
 * @example
 * handleRequest(PROJECTS, { query: { page }, parse: parsePage(ProjectSchema, { page }) })
 */
export const parsePage =
  <T extends z.ZodType>(itemSchema: T, requested: { page?: number; perPage?: number } = {}) =>
  (body: unknown): Page<z.infer<T>> => {
    const found = locate(body);

    if (!found) {
      throw new Error('The response is not a paginated list.');
    }

    const items = z.array(itemSchema).parse(found.list);
    const { meta } = found;
    const perPage =
      firstNumber(1, meta.per_page, meta.perPage, meta.page_size, meta.pageSize, meta.limit, requested.perPage) ??
      Math.max(items.length, 1);
    const total = firstNumber(0, meta.total, meta.count, meta.total_count, meta.totalCount) ?? items.length;
    const page = firstNumber(1, meta.current_page, meta.currentPage, meta.page, requested.page) ?? 1;
    const lastPage =
      firstNumber(1, meta.last_page, meta.lastPage, meta.total_pages, meta.totalPages) ??
      Math.max(Math.ceil(total / perPage), 1);

    return { items, page, perPage, total, lastPage };
  };
