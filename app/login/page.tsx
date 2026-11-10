import type { Metadata } from 'next';

import LoginForm from '@/views/login/LoginForm';

export const metadata: Metadata = {
  title: 'Log in',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { redirect } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <LoginForm redirect={typeof redirect === 'string' ? redirect : undefined} />
    </main>
  );
}
