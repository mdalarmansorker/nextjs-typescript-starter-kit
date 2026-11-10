import type { Metadata } from 'next';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Example page behind login: `/dashboard` is in PROTECTED_ROUTES (constants/routes.ts), so proxy.ts
 * sends logged-out users to /login first. Replace it with your app.
 */
export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form method="post" action="/api/auth/clear">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <p className="text-muted-foreground">You are logged in. Build your app from here.</p>
    </main>
  );
}
