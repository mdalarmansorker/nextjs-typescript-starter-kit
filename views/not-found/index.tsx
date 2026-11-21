import Link from 'next/link';

import BackButton from './components/BackButton';

export default function NotFoundView() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="font-mono text-sm font-medium tracking-widest text-zinc-500">404</p>
      <div className="flex max-w-md flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          The page you are looking for doesn&apos;t exist or has moved. Check the address, or head back to somewhere
          familiar.
        </p>
      </div>
      <nav aria-label="Leave this page" className="flex flex-wrap justify-center gap-4 font-medium">
        <Link href="/" className="rounded-full bg-foreground px-5 py-2 text-background">
          Go home
        </Link>
        <BackButton />
      </nav>
    </main>
  );
}
