'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateShipmentCO2 } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
  ZAxis
} from 'recharts';

export default function EmissionsPage() {
  const { shipments } = useShipments();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { tableData, barData, scatterData } = useMemo(() => {
    const list = shipments.map(s => ({
      ...s,
      co2: calculateShipmentCO2(s)
    })).sort((a, b) => b.co2 - a.co2); // Sort by highest emissions

    // Bar Chart: CO2 by Vehicle Type
    const vMap = new Map<string, number>();
    list.forEach(item => {
      vMap.set(item.vehicle_type, (vMap.get(item.vehicle_type) || 0) + item.co2);
    });
    const bar = Array.from(vMap.entries()).map(([name, co2]) => ({ name, co2 }));

    // Scatter Plot: Distance vs Emissions
    const scatter = list.slice(0, 100).map(item => ({
      x: item.distance_km,
      y: item.co2,
      z: item.weight_kg,
      name: item.shipment_id,
      vehicle: item.vehicle_type
    }));

    return { tableData: list, barData: bar, scatterData: scatter };
  }, [shipments]);

  const columns = [
    { key: 'shipment_id', title: 'Shipment ID' },
    { key: 'origin_city', title: 'Origin' },
    { key: 'destination_city', title: 'Destination' },
    { 
      key: 'vehicle_type', 
      title: 'Mode',
      render: (row: any) => (
        <Badge variant="outline" className="bg-muted font-normal text-muted-foreground">
          {row.vehicle_type}
        </Badge>
      )
    },
    { key: 'distance_km', title: 'Distance (km)', align: 'right' as const, render: (r: any) => `${r.distance_km}` },
    { key: 'weight_kg', title: 'Weight (kg)', align: 'right' as const, render: (r: any) => `${r.weight_kg}` },
    { 
      key: 'co2', 
      title: 'Emissions (kg)', 
      align: 'right' as const,
      render: (row: any) => <span className="font-semibold text-brand-orange">{row.co2.toFixed(1)}</span>
    },
  ];

  const paginatedData = tableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Emissions Ledger</h1>
        <p className="text-muted-foreground text-sm">Detailed breakdown of carbon output per shipment.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Emissions by Vehicle Type" description="Total CO2 output split by transportation mode.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <Tooltip cursor={{fill: 'transparent'}} formatter={(val: any) => [`${Number(val).toFixed(0)} kg`, 'CO2']} />
              <Bar dataKey="co2" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distance vs Emissions" description="Scatter analysis of haul lengths vs output (Top 100).">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" dataKey="x" name="Distance" unit="km" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="y" name="Emissions" unit="kg" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val).toFixed(0)}`} />
              <ZAxis type="number" dataKey="z" range={[20, 200]} name="Weight" unit="kg" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Shipments" data={scatterData} fill="#EF4444" fillOpacity={0.6} stroke="#EF4444" strokeWidth={1} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Shipment Log" className="border-none shadow-none bg-transparent">
        <DataTable 
          columns={columns} 
          data={paginatedData} 
          keyField="shipment_id" 
          className="border border-border/50"
        />
        <div className="flex justify-between items-center mt-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="text-sm px-4 py-2 bg-card border rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(tableData.length / PAGE_SIZE)}
          </span>
          <button 
            disabled={page >= Math.ceil(tableData.length / PAGE_SIZE)}
            onClick={() => setPage(p => p + 1)}
            className="text-sm px-4 py-2 bg-card border rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </ChartCard>
    </div>
  );
}
