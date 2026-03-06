'use client';

import { useShipments } from '@/hooks/useShipments';
import { detectInefficiencies } from '@/lib/inefficiencies';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem, CHART_TOOLTIP_STYLE } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { useFiltersStore } from '@/store/useFiltersStore';
import { toast } from 'sonner';
import CountUp from 'react-countup';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';

export default function InefficienciesPage() {
  const { shipments } = useShipments();
  const router = useRouter();
  const { addSelectedShipmentIds } = useFiltersStore();

  const { inefficiencies, loadFactors, shortHauls, heavyShortHauls } = useMemo(() => {
    const findings = detectInefficiencies(shipments);

    const buckets = new Array(10).fill(0);
    shipments.forEach(s => {
      const index = Math.min(Math.floor(s.load_factor * 10), 9);
      buckets[index]++;
    });

    const loadData = buckets.map((count, i) => ({
      range: `${i * 10}-${i * 10 + 10}%`,
      count
    }));

    const short = shipments
      .filter(s => s.distance_km < 300)
      .map(s => ({
        x: s.distance_km,
        y: s.weight_kg,
        z: s.load_factor,
        mode: s.vehicle_type,
        id: s.shipment_id
      }));

    const heavyShort = shipments.filter(s => s.distance_km < 200 && s.weight_kg > 10000);

    return {
      inefficiencies: findings,
      loadFactors: loadData,
      shortHauls: short,
      heavyShortHauls: heavyShort,
    };
  }, [shipments]);

  const sendToOptimization = (shipmentIds: string[]) => {
    addSelectedShipmentIds(shipmentIds);
    toast.success(`${shipmentIds.length} shipments sent to Optimization`);
    router.push('/optimization');
  };

  const viewDetails = (shipmentId: string) => {
    router.push(`/emissions?region=All`);
  };

  const columns = [
    { key: 'shipment_id', title: 'ID' },
    { key: 'origin_city', title: 'Route', render: (r: any) => `${r.origin_city} → ${r.destination_city}` },
    { key: 'vehicle_type', title: 'Mode' },
    {
      key: 'reasons', title: 'Flags',
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
      key: 'inefficiency_score', title: 'Severity', align: 'right' as const,
      render: (r: any) => <span className="font-bold text-brand-red">{r.inefficiency_score.toFixed(1)}</span>
    },
    {
      key: 'actions', title: 'Actions', align: 'center' as const,
      render: (r: any) => (
        <div className="flex gap-1">
          <button onClick={() => sendToOptimization([r.shipment_id])} className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-xs flex items-center gap-0.5" title="Send to Optimization">
            <ArrowRight className="w-3 h-3" /> Optimize
          </button>
          <button onClick={() => viewDetails(r.shipment_id)} className="text-muted-foreground hover:bg-muted rounded px-1.5 py-0.5 text-xs flex items-center gap-0.5" title="View Details">
            <Eye className="w-3 h-3" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight">Inefficiencies Detected</h1>
        <p className="text-muted-foreground text-sm">Review shipments flagged for sub-optimal logistics execution.</p>
      </motion.div>

      <StaggerContainer className="grid gap-4 md:grid-cols-4" staggerDelay={0.12}>
        <StaggerItem>
          <motion.div className="bg-card border rounded-lg p-4 glass-card" whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flagged Shipments</p>
            <p className="text-2xl font-bold text-brand-red mt-1"><CountUp end={inefficiencies.length} duration={2} /></p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div className="bg-card border rounded-lg p-4 glass-card" whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Heavy Short-Haul</p>
            <p className="text-2xl font-bold text-brand-orange mt-1"><CountUp end={heavyShortHauls.length} duration={2} /></p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div className="bg-card border rounded-lg p-4 glass-card" whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Short-Haul Routes</p>
            <p className="text-2xl font-bold text-brand-orange mt-1"><CountUp end={shortHauls.length} duration={2} /></p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div className="bg-card border rounded-lg p-4 glass-card" whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Analyzed</p>
            <p className="text-2xl font-bold text-brand-blue mt-1"><CountUp end={shipments.length} duration={2} separator="," /></p>
          </motion.div>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Capacity Under-utilization" description="Histogram of fleet load factors. Target > 80%.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadFactors} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="range" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any) => [val, 'Shipments']} />
              <ReferenceLine x="80-90%" stroke="#10B981" strokeDasharray="3 3" />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1200} animationBegin={200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Short-Haul Analysis (< 300km)" description="Identify routes suitable for fleet electrification.">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" dataKey="x" name="Distance" unit="km" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="y" name="Weight" unit="kg" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <ZAxis type="number" dataKey="z" range={[50, 400]} name="Load Factor" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={CHART_TOOLTIP_STYLE} />
              <Scatter name="Shipments" data={shortHauls} fill="#F59E0B" fillOpacity={0.6} isAnimationActive={true} animationDuration={800} animationBegin={400} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Prioritized Intervention List"
        description={`${inefficiencies.length} shipments flagged for immediate review.`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => sendToOptimization(inefficiencies.slice(0, 20).map(s => s.shipment_id))}>
              <ArrowRight className="w-3.5 h-3.5 mr-1" /> Send Top 20 to Optimization
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Badge variant="destructive" className="bg-brand-red flex items-center gap-1 cursor-pointer">
                <AlertTriangle className="w-3 h-3" /> Action Required
              </Badge>
            </motion.div>
          </div>
        }
      >
        <DataTable columns={columns} data={inefficiencies.slice(0, 50)} keyField="shipment_id" className="border border-border/50" />
      </ChartCard>
    </div>
  );
}
