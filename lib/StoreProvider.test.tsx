import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { setPageTitle } from './features/pageTitle/pageTitleSlice';
import { useAppDispatch, useAppSelector } from './hooks';
import StoreProvider from './StoreProvider';

function PageTitle() {
  const title = useAppSelector(state => state.pageTitle.pageTitle);
  const dispatch = useAppDispatch();

  return (
    <>
      <h1>{title || 'Untitled'}</h1>
      <button onClick={() => dispatch(setPageTitle('Reports'))}>Open reports</button>
    </>
  );
}

describe('StoreProvider', () => {
  it('gives its children a working store', async () => {
    render(
      <StoreProvider>
        <PageTitle />
      </StoreProvider>,
    );

    expect(screen.getByRole('heading')).toHaveTextContent('Untitled');

    await userEvent.click(screen.getByRole('button', { name: 'Open reports' }));

    expect(screen.getByRole('heading')).toHaveTextContent('Reports');
  });

  it('gives each provider its own store', async () => {
    render(
      <>
        <StoreProvider>
          <PageTitle />
        </StoreProvider>
        <StoreProvider>
          <PageTitle />
        </StoreProvider>
      </>,
    );

    const [firstButton] = screen.getAllByRole('button', { name: 'Open reports' });

    await userEvent.click(firstButton!);

    expect(screen.getAllByRole('heading').map(h => h.textContent)).toEqual(['Reports', 'Untitled']);
  });
});
