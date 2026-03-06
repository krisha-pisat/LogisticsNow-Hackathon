import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import React from 'react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';

interface MetricTrendIndicatorProps {
  trend: 'up' | 'down' | 'neutral';
  value: string;
  inverseColors?: boolean;
}

export function MetricTrendIndicator({ trend, value, inverseColors = false }: MetricTrendIndicatorProps) {
  let colorClass = 'text-muted-foreground';
  let Icon = Minus;

  if (trend === 'up') {
    Icon = ArrowUpRight;
    colorClass = inverseColors ? 'text-brand-red' : 'text-brand-green';
  } else if (trend === 'down') {
    Icon = ArrowDownRight;
    colorClass = inverseColors ? 'text-brand-green' : 'text-brand-red';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
      className={cn("flex items-center text-xs font-semibold mt-1", colorClass)}
    >
      <motion.span
        animate={trend === 'up' ? { y: [0, -2, 0] } : trend === 'down' ? { y: [0, 2, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="h-3 w-3 mr-1" />
      </motion.span>
      {value}
    </motion.div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  inverseTrendColors?: boolean;
  className?: string;
}

export function KpiCard({ title, value, numericValue, prefix, suffix, decimals, icon, description, trend, trendValue, inverseTrendColors, className }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{
        scale: 1.03,
        boxShadow: "0px 12px 40px rgba(0,0,0,0.1)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn("transition-shadow duration-200 overflow-hidden relative h-full glass-card group", className)}>
        {/* Animated gradient top bar */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] gradient-border"
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
          <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
          <motion.div
            className="h-8 w-8 rounded-full bg-primary/10 flex flex-col items-center justify-center text-primary"
            whileHover={{ rotate: 12, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {icon}
          </motion.div>
        </CardHeader>
        <CardContent className="z-10 relative">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {numericValue !== undefined ? (
              <CountUp
                end={numericValue}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
                duration={2}
                separator=","
              />
            ) : (
              value
            )}
          </div>
          <div className="flex items-center justify-between mt-1 h-5">
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && trendValue && (
              <MetricTrendIndicator trend={trend} value={trendValue} inverseColors={inverseTrendColors} />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
