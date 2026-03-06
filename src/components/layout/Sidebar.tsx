'use client';
import { motion } from 'framer-motion';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
    DashboardIcon, 
    EmissionsIcon, 
    LaneAnalysisIcon, 
    InefficienciesIcon, 
    OptimizationIcon, 
    SimulationIcon, 
    ReportsIcon 
} from '@/components/icons';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Emissions', href: '/emissions', icon: EmissionsIcon },
  { name: 'Lane Analysis', href: '/lane-analysis', icon: LaneAnalysisIcon },
  { name: 'Inefficiencies', href: '/inefficiencies', icon: InefficienciesIcon },
  { name: 'Optimization', href: '/optimization', icon: OptimizationIcon },
  { name: 'What-If Simulation', href: '/simulation', icon: SimulationIcon },
  { name: 'Reports', href: '/reports', icon: ReportsIcon },
];

export function SidebarContent() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 items-center px-6 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 text-brand-green">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">CIOA</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto w-full py-4">
        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Modules
        </div>
        <nav className="space-y-1 px-3 w-full">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-lg shadow-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 relative z-10',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <div className="hidden lg:flex w-[250px] flex-col border-r bg-card/50 backdrop-blur-xl shadow-sm z-10 shrink-0">
      <SidebarContent />
    </div>
  );
}
