import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { login } from '@/app/login/actions';

import LoginForm from './LoginForm';

vi.mock('@/app/login/actions', () => ({ login: vi.fn() }));

describe('LoginForm', () => {
  it('has labelled email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('shows the errors returned by the action', async () => {
    vi.mocked(login).mockResolvedValue({
      email: 'ada@example.com',
      message: 'These credentials do not match our records.',
      fieldErrors: { password: ['Too short.'] },
    });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('These credentials do not match our records.')).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Too short.');
    expect(screen.getByLabelText('Password')).toBeInvalid();
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  });

  it('shows a message once when the API repeats it as a field error', async () => {
    const message = 'These credentials do not match our records.';
    vi.mocked(login).mockResolvedValue({ message, fieldErrors: { email: [message] } });
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(message);
    expect(screen.getAllByText(message)).toHaveLength(1);
  });

  it('sends the redirect value along with the form', async () => {
    vi.mocked(login).mockResolvedValue({});
    render(<LoginForm redirect="L2Rhc2hib2FyZA" />);

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const formData = vi.mocked(login).mock.calls[0]![1];

    expect(formData.get('redirect')).toBe('L2Rhc2hib2FyZA');
  });
});
