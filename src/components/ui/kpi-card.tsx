import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import React from 'react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';

interface MetricTrendIndicatorProps {
  trend: 'up' | 'down' | 'neutral';
  value: string;
  inverseColors?: boolean; // if 'down' is actually good (e.g. emissions)
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
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("flex items-center text-xs font-semibold mt-1", colorClass)}
    >
      <Icon className="h-3 w-3 mr-1" />
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.02, boxShadow: "0px 10px 40px rgba(0,0,0,0.08)" }}
    >
      <Card className={cn("transition-shadow duration-200 overflow-hidden relative h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-muted/50 flex flex-col items-center justify-center text-primary">
          {icon}
        </div>
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
