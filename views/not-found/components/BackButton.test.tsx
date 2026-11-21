import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BackButton from './BackButton';

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  router.back.mockReset();
  router.push.mockReset();
});

describe('BackButton', () => {
  it('goes back when the tab has history', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    render(<BackButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('goes home when the missing page was opened directly', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<BackButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(router.push).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
