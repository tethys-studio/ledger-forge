import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LedgerForge | Neo-Fintech Cash Flow & Sinking Fund Engine',
  description:
    'High-performance personal cash-flow, dynamic MTD burn velocity, irregular cadence sinking funds, and Udhaar receivables ledger powered by Neon PostgreSQL.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-[#090D16] text-[#F8FAFC] antialiased selection:bg-violet-500 selection:text-white`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
