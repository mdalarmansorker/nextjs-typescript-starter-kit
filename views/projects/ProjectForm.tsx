'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import type { ProjectFormState } from '@/app/projects/actions';
import type { Project } from '@/types';

interface ProjectFormProps {
  title: string;
  submitLabel: string;
  /** `createProject`, or `updateProject` bound to the project's id. */
  action: (previous: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  /** The project being edited; empty for a new one. */
  project?: Project;
}

interface FieldProps {
  name: 'name' | 'description';
  label: string;
  defaultValue: string;
  errors?: string[];
  multiline?: boolean;
}

const inputClass =
  'rounded-md border border-zinc-300 px-3 py-2 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-900';

/** A labelled input with its error linked by aria-describedby, so screen readers read it with the field. */
function Field({ name, label, defaultValue, errors, multiline }: FieldProps) {
  const errorId = `${name}-error`;
  const shared = {
    id: name,
    name,
    defaultValue,
    'aria-invalid': errors ? true : undefined,
    'aria-describedby': errors ? errorId : undefined,
    className: inputClass,
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? <textarea rows={4} {...shared} /> : <input type="text" required {...shared} />}
      {errors && (
        <p id={errorId} className="text-sm text-red-600">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

/** Create and edit form. Errors from the server action (zod or the API) appear next to their field. */
export default function ProjectForm({ title, submitLabel, action, project }: ProjectFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  // After an error, keep what the user typed; otherwise start from the project.
  const values = state.values ?? { name: project?.name ?? '', description: project?.description ?? '' };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* `key` resets the uncontrolled inputs to the returned values after each submit. */}
      <form key={JSON.stringify(values)} action={formAction} className="flex flex-col gap-4" noValidate>
        {state.message && (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        )}

        <Field name="name" label="Name" defaultValue={values.name} errors={state.fieldErrors?.name} />
        <Field
          name="description"
          label="Description"
          defaultValue={values.description}
          errors={state.fieldErrors?.description}
          multiline
        />

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-foreground px-5 py-2 font-medium text-background transition-opacity disabled:opacity-60"
          >
            {pending ? 'Saving…' : submitLabel}
          </button>
          <Link href="/projects" className="font-medium underline underline-offset-4">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
