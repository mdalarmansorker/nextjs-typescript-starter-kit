import { Geist, Geist_Mono } from 'next/font/google';

import type { Metadata } from 'next';

import StoreProvider from '@/lib/StoreProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Next.js Starter Kit';

export const metadata: Metadata = {
  // Absolute URLs for Open Graph images and canonical links are built from this.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  // A page sets `title: 'Settings'` and gets "Settings | <app name>".
  title: { default: appName, template: `%s | ${appName}` },
  description: `${appName} web application`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
