'use client';

import { useShipments } from '@/hooks/useShipments';
import { aggregateByLane } from '@/lib/aggregation';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHART_TOOLTIP_STYLE } from '@/components/motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const MapComponent = dynamic(() => import('@/components/ui/map-component'), { ssr: false });

export default function LaneAnalysisPage() {
  const { shipments } = useShipments();
  const router = useRouter();
  const [selectedLane, setSelectedLane] = useState<string | null>(null);

  const lanes = useMemo(() => {
    return aggregateByLane(shipments).sort((a, b) => b.total_emissions_kg - a.total_emissions_kg);
  }, [shipments]);

  const topLanes = lanes.slice(0, 10);
  const worstLane = lanes[0];

  const columns = [
    { key: 'origin_city', title: 'Origin' },
    { key: 'destination_city', title: 'Destination' },
    { key: 'shipment_count', title: 'Trips', align: 'right' as const },
    {
      key: 'avg_load_factor', title: 'Avg Load (%)', align: 'right' as const,
      render: (r: any) => <span className={r.avg_load_factor < 0.5 ? 'text-brand-red' : ''}>{(r.avg_load_factor * 100).toFixed(1)}%</span>
    },
    {
      key: 'total_emissions_kg', title: 'Total CO2 (kg)', align: 'right' as const,
      render: (row: any) => <span className="font-semibold text-brand-orange">{row.total_emissions_kg.toFixed(1)}</span>
    },
    {
      key: 'actions', title: '', align: 'center' as const,
      render: (row: any) => (
        <button
          onClick={() => router.push(`/emissions?region=${encodeURIComponent(row.origin_city)}`)}
          className="text-primary hover:underline text-xs flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> View
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight">Lane Analysis</h1>
        <p className="text-muted-foreground text-sm">Geospatial review of transport corridors and multi-trip aggregations.</p>
      </motion.div>

      {/* Worst Lane Alert Card */}
      {worstLane && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand-red/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <p className="font-semibold text-sm">⚠️ Worst Performing Lane: <span className="text-brand-red">{worstLane.origin_city} → {worstLane.destination_city}</span></p>
              <p className="text-xs text-muted-foreground">{worstLane.shipment_count} trips • {worstLane.total_emissions_kg.toFixed(0)} kg CO₂ • Avg load {(worstLane.avg_load_factor * 100).toFixed(0)}%</p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            className="border-brand-red/30 text-brand-red hover:bg-brand-red/10"
            onClick={() => router.push(`/emissions?region=${encodeURIComponent(worstLane.origin_city)}`)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Shipments
          </Button>
        </motion.div>
      )}

      <ChartCard title="Global Corridors Map" description="Line thickness and color correlate to total absolute emissions. Click a route for details.">
        <MapComponent
          lanes={lanes}
          selectedLaneId={selectedLane}
          onLaneSelect={(id) => setSelectedLane(id === selectedLane ? null : id)}
        />
      </ChartCard>

      {/* Selected lane info */}
      <AnimatePresence>
        {selectedLane && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Selected Lane: {selectedLane}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Map zoomed to route. Click anywhere else to deselect.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push(`/emissions?region=${encodeURIComponent(selectedLane.split('-')[0])}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Drill Down
                </Button>
                <motion.button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-muted" onClick={() => setSelectedLane(null)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Clear
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Top 10 Culprit Lanes" description="Lanes producing the most CO2." className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topLanes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
              <YAxis dataKey="id" type="category" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} width={80} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'Total CO2']} />
              <Bar
                dataKey="total_emissions_kg" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={15}
                isAnimationActive={true} animationDuration={1200} animationBegin={300} animationEasing="ease-out"
                cursor="pointer"
                onClick={(data: any) => {
                  if (data?.id) setSelectedLane(data.id === selectedLane ? null : data.id);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lane Aggregation Data" description="Detailed tabular view of corridors." className="lg:col-span-2 overflow-hidden">
          <DataTable columns={columns} data={lanes} keyField="id" className="border-none shadow-none max-h-[350px] overflow-y-auto w-full" />
        </ChartCard>
      </div>
    </div>
  );
}
