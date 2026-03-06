'use client';

import { useShipments } from '@/hooks/useShipments';
import { aggregateByLane } from '@/lib/aggregation';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Dynamically import the map to avoid SSR 'window is not defined' issue
const MapComponent = dynamic(() => import('@/components/ui/map-component'), { ssr: false });

export default function LaneAnalysisPage() {
  const { shipments } = useShipments();

  const lanes = useMemo(() => {
    return aggregateByLane(shipments)
      .sort((a, b) => b.total_emissions_kg - a.total_emissions_kg);
  }, [shipments]);

  const topLanes = lanes.slice(0, 10);

  const columns = [
    { key: 'origin_city', title: 'Origin' },
    { key: 'destination_city', title: 'Destination' },
    { key: 'shipment_count', title: 'Trips', align: 'right' as const },
    { 
      key: 'avg_load_factor', 
      title: 'Avg Load (%)', 
      align: 'right' as const, 
      render: (r: any) => `${(r.avg_load_factor * 100).toFixed(1)}%` 
    },
    { 
      key: 'total_emissions_kg', 
      title: 'Total CO2 (kg)', 
      align: 'right' as const, 
      render: (row: any) => <span className="font-semibold text-brand-orange">{row.total_emissions_kg.toFixed(1)}</span>
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Lane Analysis</h1>
        <p className="text-muted-foreground text-sm">Geospatial review of transport corridors and multi-trip aggregations.</p>
      </div>

      <ChartCard title="Global Corridors Map" description="Line thickness and color correlate to total absolute emissions.">
        <MapComponent lanes={lanes} />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Top 10 Culprit Lanes" description="Lanes producing the most CO2." className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topLanes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <YAxis dataKey="id" type="category" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} width={80} />
              <Tooltip cursor={{fill: 'transparent'}} formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'Total CO2']} />
              <Bar dataKey="total_emissions_kg" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lane Aggregation Data" description="Detailed tabular view of corridors." className="lg:col-span-2 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={lanes} 
            keyField="id" 
            className="border-none shadow-none max-h-[350px] overflow-y-auto w-full"
          />
        </ChartCard>
      </div>
    </div>
  );
}
