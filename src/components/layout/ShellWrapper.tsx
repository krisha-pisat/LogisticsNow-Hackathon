'use client';

import { usePathname } from 'next/navigation';
import { Shell } from './Shell';

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Onboarding page renders without the Shell (no sidebar/header)
  if (pathname === '/onboarding') {
    return <>{children}</>;
  }

  return <Shell>{children}</Shell>;
}
