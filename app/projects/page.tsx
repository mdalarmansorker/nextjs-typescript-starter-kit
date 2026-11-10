import type { Metadata } from 'next';

import ProjectService from '@/services/api/projects.service';

import Projects from '@/views/projects/Projects';

export const metadata: Metadata = {
  title: 'Projects',
};

/** Reads `?page=` as a page number; anything else is page 1. */
const pageNumber = (value: string | string[] | undefined): number => {
  const page = Number(typeof value === 'string' ? value : 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const { page } = await searchParams;
  const projects = await ProjectService.index({ page: pageNumber(page) });

  return <Projects projects={projects} />;
}
