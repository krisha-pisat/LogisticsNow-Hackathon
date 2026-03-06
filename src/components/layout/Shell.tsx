'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BreadcrumbNav } from './BreadcrumbNav';
import { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { OnboardingModal } from '../onboarding/OnboardingModal';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Suspense fallback={<div className="h-16 w-full border-b bg-background" />}>
          <Header />
        </Suspense>
        
        <main className="flex-1 overflow-y-auto bg-muted/20 relative">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            <BreadcrumbNav />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="pb-24"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <OnboardingModal />
    </div>
  );
}
