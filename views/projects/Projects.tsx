import Link from 'next/link';

import Pagination from '@/components/Pagination';

import { deleteProject } from '@/app/projects/actions';
import type { Page, Project } from '@/types';

interface ProjectsProps {
  projects: Page<Project>;
}

/** The projects list: one page of projects, with edit and delete for each. */
export default function Projects({ projects }: ProjectsProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{projects.total} in total</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-full bg-foreground px-5 py-2 font-medium text-background transition-opacity"
        >
          New project
        </Link>
      </header>

      {projects.items.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No projects yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {projects.items.map(project => (
            <li key={project.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{project.name}</p>
                {project.description && (
                  <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}/edit`}
                  aria-label={`Edit ${project.name}`}
                  className="font-medium underline underline-offset-4"
                >
                  Edit
                </Link>
                <form action={deleteProject.bind(null, project.id)}>
                  <button
                    type="submit"
                    aria-label={`Delete ${project.name}`}
                    className="font-medium text-red-600 underline underline-offset-4"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={projects.page} lastPage={projects.lastPage} href={page => `/projects?page=${page}`} />
    </main>
  );
}
