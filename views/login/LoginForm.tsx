'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { login, type LoginState } from '@/app/login/actions';

interface LoginFormProps {
  /** The encoded page to return to after login, passed through from `?redirect=`. */
  redirect?: string;
}

interface LoginFieldProps {
  name: 'email' | 'password';
  label: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
}

/** A labelled input with its error linked by aria-describedby, so screen readers read it with the field. */
function LoginField({ name, label, type, autoComplete, defaultValue, errors }: LoginFieldProps) {
  const errorId = `${name}-error`;
  const invalid = Boolean(errors?.length);

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        defaultValue={defaultValue}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
      />
      {invalid && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
    </Field>
  );
}

export default function LoginForm({ redirect }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  // Laravel-style APIs often repeat a field error as the message; show it once, next to the field.
  const fieldMessages = Object.values(state.fieldErrors ?? {}).flat();
  const formMessage = state.message && !fieldMessages.includes(state.message) ? state.message : undefined;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-semibold">Log in</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            {formMessage && (
              <p role="alert" className="text-sm text-destructive">
                {formMessage}
              </p>
            )}

            <LoginField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              defaultValue={state.email}
              errors={state.fieldErrors?.email}
            />
            <LoginField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              errors={state.fieldErrors?.password}
            />

            {redirect && <input type="hidden" name="redirect" value={redirect} />}

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Logging in…' : 'Log in'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
