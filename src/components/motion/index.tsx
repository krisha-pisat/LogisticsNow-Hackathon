'use client';

import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation Constants ───
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

// Shared Recharts animation config
export const CHART_ANIM_PROPS = {
  isAnimationActive: true,
  animationDuration: 1200,
  animationEasing: 'ease-out' as const,
};

// Frosted-glass tooltip style for Recharts
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  backdropFilter: 'blur(8px)',
  background: 'rgba(255, 255, 255, 0.9)',
  padding: '8px 12px',
};

// ─── Stagger Container ───
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({ children, className = '', staggerDelay = 0.08, initialDelay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Item ───
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Pulse Dot ───
export function PulseDot({ color = '#10B981', size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// ─── Animated Progress Bar ───
export function AnimatedProgress({ value, max = 100, color = '#10B981', className = '' }: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={`h-2 w-full bg-muted/50 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      />
    </div>
  );
}

// ─── Skeleton Loaders ───
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-[200px] w-full mt-4" />
    </div>
  );
}

// ─── Floating Particles ───
export function FloatingParticles({ count = 8 }: { count?: number }) {
  const [particles, setParticles] = React.useState<Array<{
    id: number; left: string; top: string; duration: string; delay: string; size: string;
  }>>([]);

  React.useEffect(() => {
    setParticles(Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${5 + Math.random() * 6}s`,
      delay: `${Math.random() * 4}s`,
      size: `${3 + Math.random() * 4}px`,
    })));
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="floating-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            ['--duration' as any]: p.duration,
            ['--delay' as any]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ripple Card ───
interface RippleCardProps {
  children: React.ReactNode;
  className?: string;
}

export function RippleCard({ children, className = '' }: RippleCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    container.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

// ─── Page Transition Wrapper ───
export function PageTransition({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Motion Card (hover lift + glow) ───
interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MotionCard({ children, className = '', delay = 0 }: MotionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.995 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
