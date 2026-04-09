import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spool — Async Screen Recording',
  description: 'Record, share, and collaborate with async video. Unwind from Loom.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
