import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Next.js Starter Kit';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">{appName}</h1>
          <ThemeToggle />
        </div>
        <p className="text-lg text-muted-foreground">
          Edit <code className="font-mono text-base">app/page.tsx</code> to start. The guides in{' '}
          <code className="font-mono text-base">docs/</code> explain how everything fits together.
        </p>
      </div>
      <nav className="flex gap-4">
        <Link href="/login" className={buttonVariants({ size: 'lg' })}>
          Log in
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
