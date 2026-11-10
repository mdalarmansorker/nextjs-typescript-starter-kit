import type { Metadata } from 'next';

import ProjectForm from '@/views/projects/ProjectForm';

import { createProject } from '../actions';

export const metadata: Metadata = {
  title: 'New project',
};

export default function NewProjectPage() {
  return <ProjectForm title="New project" submitLabel="Create project" action={createProject} />;
}
