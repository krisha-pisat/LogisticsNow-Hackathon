import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ShellWrapper } from '@/components/layout/ShellWrapper';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CIOA Dashboard | Carbon Intelligence & Optimization',
  description: 'AI-driven sustainability analytics platform for logistics managers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ShellWrapper>{children}</ShellWrapper>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
