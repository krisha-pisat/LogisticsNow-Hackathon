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
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01, boxShadow: "0px 10px 40px rgba(0,0,0,0.06)" }}
      className="h-full flex flex-col"
    >
      <Card className={cn("flex flex-col h-full", className)}>
        <CardHeader className="pb-4 items-start flex-row justify-between">
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px]">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
