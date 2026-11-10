import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { ApiError } from '@/services/api/api-errors';
import ProjectService from '@/services/api/projects.service';

import ProjectForm from '@/views/projects/ProjectForm';

import { updateProject } from '../../actions';

export const metadata: Metadata = {
  title: 'Edit project',
};

/** The project, or the 404 page when the API doesn't know it. */
const findProject = async (id: string) => {
  try {
    return await ProjectService.show(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();

    throw error;
  }
};

export default async function EditProjectPage({ params }: PageProps<'/projects/[id]/edit'>) {
  const { id } = await params;
  const project = await findProject(id);

  return (
    <ProjectForm
      title={`Edit ${project.name}`}
      submitLabel="Save changes"
      action={updateProject.bind(null, project.id)}
      project={project}
    />
  );
}
