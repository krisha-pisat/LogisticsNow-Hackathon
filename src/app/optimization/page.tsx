'use client';

import { useShipments } from '@/hooks/useShipments';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { Settings, CheckCircle2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function OptimizationPage() {
  const { shipments } = useShipments();

  // Mock an optimization algorithm: identifying low capacity routes and consolidating them
  const optimizations = useMemo(() => {
    let baselineTotal = 0;
    let proposedTotal = 0;
    
    // Simplistic mock: if load factor is < 50%, we consolidate 2 into 1 (+20% efficiency)
    let consolidatedCount = 0;
    
    shipments.forEach(s => {
      // rough proxy for baseline
      const baseCO2 = s.distance_km * (s.weight_kg / 1000) * 0.1;
      baselineTotal += baseCO2;
      
      if (s.load_factor < 0.5) {
        consolidatedCount++;
        proposedTotal += baseCO2 * 0.6; // 40% saving from consolidation
      } else {
        proposedTotal += baseCO2;
      }
    });

    return { baselineTotal, proposedTotal, consolidatedCount };
  }, [shipments]);

  const chartData = [
    { 
      name: 'Current Network', 
      Emissions: optimizations.baselineTotal 
    },
    { 
      name: 'Optimized Network', 
      Emissions: optimizations.proposedTotal,
      Saved: optimizations.baselineTotal - optimizations.proposedTotal
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Algorithmic Optimization</h1>
        <p className="text-muted-foreground text-sm">AI-driven routing and consolidation suggestions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <ChartCard title="Consolidation Engine">
            <div className="space-y-6 flex flex-col items-center justify-center text-center h-full pt-8">
              <div className="h-20 w-20 bg-brand-green/10 rounded-full flex items-center justify-center">
                <Settings className="w-10 h-10 text-brand-green animate-[spin_4s_linear_infinite]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{optimizations.consolidatedCount}</h3>
                <p className="text-muted-foreground text-sm">Shipments eligible for consolidation</p>
              </div>
              <div className="w-full bg-muted/50 p-4 rounded-lg">
                <p className="text-brand-green font-bold text-lg">- {((1 - (optimizations.proposedTotal / optimizations.baselineTotal)) * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Projected Network Reduction</p>
              </div>
              <Button className="w-full bg-brand-blue hover:bg-brand-blue/90">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Apply Logistics Plan
              </Button>
            </div>
          </ChartCard>
        </div>

        <div className="md:col-span-2">
          <ChartCard title="Structural Efficiency Improvements" description="Baseline emissions compared to the AI-optimized multi-stop routing protocol.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={14} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(val: any) => [`${Number(val).toFixed(0)} kg`, 'CO2']} />
                <Legend />
                <Bar dataKey="Emissions" stackId="a" fill="#111827" radius={[0, 0, 4, 4]} barSize={80} />
                <Bar dataKey="Saved" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
