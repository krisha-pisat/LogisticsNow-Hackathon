'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateESGScore, calculateShipmentCO2 } from '@/lib/emissions';
import { aggregateByLane } from '@/lib/aggregation';
import { KpiCard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { Activity, Leaf, AlertTriangle, Truck } from 'lucide-react';
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { shipments } = useShipments();

  const metrics = useMemo(() => {
    let totalCO2 = 0;
    let totalWeight = 0;
    
    // Time-series for area chart
    const timeMap = new Map<string, number>();
    // Vehicle split for pie chart
    const vehicleMap = new Map<string, number>();

    shipments.forEach(s => {
      const co2 = calculateShipmentCO2(s);
      totalCO2 += co2;
      totalWeight += s.weight_kg;

      const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
      timeMap.set(dateStr, (timeMap.get(dateStr) || 0) + co2);

      vehicleMap.set(s.vehicle_type, (vehicleMap.get(s.vehicle_type) || 0) + co2);
    });

    const avgLoad = shipments.reduce((sum, s) => sum + s.load_factor, 0) / (shipments.length || 1);
    const esgScore = calculateESGScore(totalCO2, totalWeight * 0.1, avgLoad);

    const timeSeriesData = Array.from(timeMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, co2]) => ({ date, co2 }));

    const vehicleData = Array.from(vehicleMap.entries()).map(([name, value]) => ({ name, value }));
    const lanes = aggregateByLane(shipments).slice(0, 5); // top 5 regions

    return { totalCO2, esgScore, avgLoad, timeSeriesData, vehicleData, lanes };
  }, [shipments]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm">Monitor enterprise-level emissions and logistics efficiency metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total CO2 Emissions"
          value={`${(metrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`}
          numericValue={metrics.totalCO2 / 1000}
          decimals={1}
          suffix=" kg"
          icon={<AlertTriangle className="h-4 w-4" />}
          description="vs baseline target"
          trend="down"
          trendValue="12.4%"
          inverseTrendColors={true}
        />
        <KpiCard
          title="ESG Score"
          value={metrics.esgScore.toFixed(0)}
          numericValue={metrics.esgScore}
          decimals={0}
          icon={<Leaf className="h-4 w-4" />}
          description="A rating (1-100)"
          trend="up"
          trendValue="4 points"
        />
        <KpiCard
          title="Active Shipments"
          value={shipments.length.toLocaleString()}
          numericValue={shipments.length}
          icon={<Activity className="h-4 w-4" />}
          description="In analyzed period"
        />
        <KpiCard
          title="Avg. Load Factor"
          value={`${(metrics.avgLoad * 100).toFixed(1)}%`}
          numericValue={metrics.avgLoad * 100}
          decimals={1}
          suffix="%"
          icon={<Truck className="h-4 w-4" />}
          description="Target is &gt; 80%"
          trend="down"
          trendValue="2.1%"
          inverseTrendColors={false}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <ChartCard 
          title="Emissions Trend" 
          description="Daily CO2 output across all active lanes"
          className="lg:col-span-4"
        >
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={metrics.timeSeriesData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'CO2 Emissions']}
              />
              <Area type="monotone" dataKey="co2" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCO2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Transport Mode Breakdown" 
          description="Proportional share of total CO2"
          className="lg:col-span-3"
        >
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={metrics.vehicleData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {metrics.vehicleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${(Number(value)/1000).toFixed(1)}k kg`, 'CO2']} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      
      {/* Top Regional Emissions (Replacing Heatmap with Bar Chart for ease of web rendering) */}
      <ChartCard title="Highest Emission Lanes" description="Aggregated origin to destination routing impacts.">
        <ResponsiveContainer width="100%" height="80%">
            <BarChart data={metrics.lanes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                <YAxis dataKey="id" type="category" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} width={150} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'Total CO2']} />
                <Bar dataKey="total_emissions_kg" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
