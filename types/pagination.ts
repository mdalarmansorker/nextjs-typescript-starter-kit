/** One page of a list, in the same shape whatever the API sent. Made by `parsePage`. */
export interface Page<T> {
  items: T[];
  /** The current page, starting at 1. */
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
}
