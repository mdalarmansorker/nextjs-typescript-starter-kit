import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import GlobalError from './global-error';

describe('GlobalError', () => {
  it('shows the digest and retries', async () => {
    const retry = vi.fn();
    // It renders its own <html> and <body>, so mount it on the document itself.
    render(<GlobalError error={Object.assign(new Error('hidden'), { digest: 'xyz' })} retry={retry} />, {
      container: document,
    });

    expect(screen.getByText('Reference: xyz')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
