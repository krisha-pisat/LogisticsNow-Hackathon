import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';
import { motion } from 'framer-motion';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({ title, description, children, className, action }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0px 12px 40px rgba(0,0,0,0.08)",
        transition: { duration: 0.2 }
      }}
      className="flex flex-col"
    >
      <Card className={cn("flex flex-col glass-card relative overflow-hidden group", className)}>
        {/* Animated gradient top accent */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] gradient-border"
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <CardHeader className="pb-4 items-start flex-row justify-between">
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
        <CardContent className="flex-1">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}