import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectForm from './ProjectForm';

vi.mock('@/app/projects/actions', () => ({}));

describe('ProjectForm', () => {
  it('starts from the project being edited', () => {
    render(
      <ProjectForm
        title="Edit Apollo"
        submitLabel="Save changes"
        action={vi.fn()}
        project={{ id: '1', name: 'Apollo', description: 'Moon' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Apollo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Apollo');
    expect(screen.getByLabelText('Description')).toHaveValue('Moon');
  });

  it('shows the returned errors next to their field and keeps what was typed', async () => {
    const action = vi.fn().mockResolvedValue({
      message: 'The name has already been taken.',
      fieldErrors: { name: ['The name has already been taken.'] },
      values: { name: 'Apollo', description: 'Notes' },
    });

    render(<ProjectForm title="New project" submitLabel="Create project" action={action} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Apollo');
    await userEvent.type(screen.getByLabelText('Description'), 'Notes');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The name has already been taken.');

    const name = screen.getByLabelText('Name');

    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('The name has already been taken.');
    expect(name).toHaveValue('Apollo');
    expect(screen.getByLabelText('Description')).toHaveValue('Notes');
  });
});
