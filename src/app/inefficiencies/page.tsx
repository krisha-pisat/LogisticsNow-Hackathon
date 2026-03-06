'use client';

import { useShipments } from '@/hooks/useShipments';
import { detectInefficiencies } from '@/lib/inefficiencies';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from 'recharts';

export default function InefficienciesPage() {
  const { shipments } = useShipments();

  const { inefficiencies, loadFactors, shortHauls } = useMemo(() => {
    const findings = detectInefficiencies(shipments);

    // Histogram data preparation (buckets of 10%)
    const buckets = new Array(10).fill(0);
    shipments.forEach(s => {
      const index = Math.min(Math.floor(s.load_factor * 10), 9);
      buckets[index]++;
    });
    
    const loadData = buckets.map((count, i) => ({
      range: `${i*10}-${i*10+10}%`,
      count
    }));

    // Short haul flights/trucks (< 200km)
    const short = shipments
      .filter(s => s.distance_km < 300)
      .map(s => ({
        x: s.distance_km,
        y: s.weight_kg,
        z: s.load_factor,
        mode: s.vehicle_type,
        id: s.shipment_id
      }));

    return { 
      inefficiencies: findings, 
      loadFactors: loadData,
      shortHauls: short
    };
  }, [shipments]);

  const columns = [
    { key: 'shipment_id', title: 'ID' },
    { key: 'origin_city', title: 'Route', render: (r: any) => `${r.origin_city} → ${r.destination_city}` },
    { key: 'vehicle_type', title: 'Mode' },
    { 
      key: 'reasons', 
      title: 'Flags', 
      render: (r: any) => (
        <div className="flex flex-wrap gap-1">
          {r.reasons.map((reason: string, i: number) => (
            <Badge key={i} variant="secondary" className="bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20 text-[10px] leading-tight px-1.5 py-0">
              {reason}
            </Badge>
          ))}
        </div>
      )
    },
    { 
      key: 'inefficiency_score', 
      title: 'Severity', 
      align: 'right' as const,
      render: (r: any) => (
        <span className="font-bold text-brand-red">{r.inefficiency_score.toFixed(1)}</span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Inefficiencies Detected</h1>
        <p className="text-muted-foreground text-sm">Review shipments flagged for sub-optimal logistics execution.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard 
          title="Capacity Under-utilization" 
          description="Histogram of fleet load factors. Target > 80%."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadFactors} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="range" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#F3F4F6'}} formatter={(val: any) => [val, 'Shipments']} />
              <ReferenceLine x="80-90%" stroke="#10B981" strokeDasharray="3 3" />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Short-Haul Analysis (< 300km)" 
          description="Identify routes suitable for fleet electrification."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" dataKey="x" name="Distance" unit="km" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="y" name="Weight" unit="kg" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <ZAxis type="number" dataKey="z" range={[50, 400]} name="Load Factor" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Shipments" data={shortHauls} fill="#F59E0B" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard 
        title="Prioritized Intervention List" 
        description={`${inefficiencies.length} shipments flagged for immediate review.`}
        action={
          <Badge variant="destructive" className="bg-brand-red flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Action Required
          </Badge>
        }
      >
        <DataTable 
          columns={columns} 
          data={inefficiencies.slice(0, 50)} 
          keyField="shipment_id" 
          className="border border-border/50"
        />
      </ChartCard>
    </div>
  );
}
