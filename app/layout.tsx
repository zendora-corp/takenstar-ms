import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import MuiProvider from '@/components/MuiProvider';
import SessionProvider from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TTSE Management System',
  description: 'Takenstar Talent Search Exam 2025 Management Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <MuiProvider>
            {children}
          </MuiProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
