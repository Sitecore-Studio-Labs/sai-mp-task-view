import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './Providers';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Jira Task Management Extension',
  description: 'Marketplace extension with Jira connectivity and React Query.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
