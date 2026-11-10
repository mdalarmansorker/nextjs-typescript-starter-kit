import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

vi.mock('next-themes', () => ({ useTheme: vi.fn() }));

const setTheme = vi.fn();

function mockTheme(resolvedTheme: 'light' | 'dark') {
  vi.mocked(useTheme).mockReturnValue({ resolvedTheme, setTheme, themes: ['light', 'dark'] });
}

describe('ThemeToggle', () => {
  beforeEach(() => setTheme.mockClear());

  it('switches from light to dark', async () => {
    mockTheme('light');
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }));

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches from dark to light', async () => {
    mockTheme('dark');
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }));

    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
