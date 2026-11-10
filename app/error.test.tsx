import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorPage from './error';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorPage', () => {
  it('retries when the user asks', async () => {
    const retry = vi.fn();

    render(<ErrorPage error={new Error('boom')} retry={retry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows the digest of a server error so it can be found in the logs', () => {
    render(<ErrorPage error={Object.assign(new Error('hidden'), { digest: 'abc123' })} retry={() => {}} />);

    expect(screen.getByText('Reference: abc123')).toBeInTheDocument();
  });

  it('does not show the error message, which may contain internals', () => {
    render(<ErrorPage error={new Error('SELECT * FROM users failed')} retry={() => {}} />);

    expect(screen.queryByText(/SELECT/)).not.toBeInTheDocument();
  });

  it('reports the error', () => {
    const error = new Error('boom');

    render(<ErrorPage error={error} retry={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(error);
  });
});
