'use client';

import { useActionState } from 'react';

import { login, type LoginState } from '@/app/login/actions';

interface LoginFormProps {
  /** The encoded page to return to after login, passed through from `?redirect=`. */
  redirect?: string;
}

interface FieldProps {
  name: 'email' | 'password';
  label: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
}

/** A labelled input with its error linked by aria-describedby, so screen readers read it with the field. */
function Field({ name, label, type, autoComplete, defaultValue, errors }: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        defaultValue={defaultValue}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="rounded-md border border-zinc-300 px-3 py-2 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {errors && (
        <p id={errorId} className="text-sm text-red-600">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

export default function LoginForm({ redirect }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <h1 className="text-2xl font-semibold">Log in</h1>

      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />

      {redirect && <input type="hidden" name="redirect" value={redirect} />}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground px-5 py-2 font-medium text-background transition-opacity disabled:opacity-60"
      >
        {pending ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
