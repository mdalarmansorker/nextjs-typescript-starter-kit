import { describe, expect, it } from 'vitest';

import { makeStore } from '@/lib/store';

import pageTitleReducer, { setPageTitle } from './pageTitleSlice';

describe('pageTitleSlice', () => {
  it('starts with an empty title', () => {
    expect(pageTitleReducer(undefined, { type: 'unknown' })).toEqual({ pageTitle: '' });
  });

  it('sets the title', () => {
    expect(pageTitleReducer({ pageTitle: '' }, setPageTitle('Dashboard'))).toEqual({ pageTitle: 'Dashboard' });
  });

  it('is wired into the store', () => {
    const store = makeStore();

    store.dispatch(setPageTitle('Settings'));

    expect(store.getState().pageTitle.pageTitle).toBe('Settings');
  });
});
