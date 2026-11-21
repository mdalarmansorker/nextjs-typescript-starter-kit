import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NotFoundView from '.';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

describe('NotFoundView', () => {
  it('says the page was not found', () => {
    render(<NotFoundView />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('links home and offers to go back', () => {
    render(<NotFoundView />);

    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });
});
