import Link from 'next/link';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Next.js Starter Kit';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">{appName}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Edit <code className="font-mono text-base">app/page.tsx</code> to start. The guides in{' '}
          <code className="font-mono text-base">docs/</code> explain how everything fits together.
        </p>
      </div>
      <nav className="flex gap-4 font-medium">
        <Link href="/login" className="rounded-full bg-foreground px-5 py-2 text-background">
          Log in
        </Link>
        <Link href="/dashboard" className="rounded-full border border-zinc-300 px-5 py-2 dark:border-zinc-700">
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
