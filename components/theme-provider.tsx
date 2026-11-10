'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Adds the `dark` class to <html> for dark mode, following the OS setting until the user picks a
 * theme (saved in localStorage). shadcn's colors switch on that class (`app/globals.css`).
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
