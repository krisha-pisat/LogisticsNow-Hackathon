import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Shell } from '@/components/layout/Shell';

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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
