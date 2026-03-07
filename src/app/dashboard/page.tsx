'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateESGScore, getShipmentMetric, getMetricLabel, getMetricUnit } from '@/lib/emissions';
import { aggregateByLane } from '@/lib/aggregation';
import { KpiCard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { CSVUploadZone } from '@/components/ui/csv-upload-zone';
import { Activity, Leaf, AlertTriangle, Truck, FileDown } from 'lucide-react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFiltersStore } from '@/store/useFiltersStore';
import { useDataStore } from '@/store/useDataStore';
import { StaggerContainer, StaggerItem, FloatingParticles, CHART_TOOLTIP_STYLE, CardSkeleton, ChartSkeleton } from '@/components/motion';
import { MetricMode } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import Papa from 'papaparse';

function MetricToggle({ value, onChange }: { value: MetricMode; onChange: (m: MetricMode) => void }) {
  const modes: { key: MetricMode; label: string }[] = [
    { key: 'co2', label: 'CO₂' },
    { key: 'nox', label: 'NOx' },
    { key: 'cost', label: 'Cost' },
  ];
  return (
    <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${value === m.key ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { shipments, isLoading, initialized } = useShipments();
  const router = useRouter();
  const { metricMode, setMetricMode } = useFiltersStore();
  const { rawRecords } = useDataStore();

  const downloadCleanedCsv = () => {
    if (!rawRecords || rawRecords.length === 0) return;
    const csv = Papa.unparse(rawRecords as any[]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIOA_Cleaned_Dataset_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = useMemo(() => {
    let totalMetric = 0;
    let totalWeight = 0;
    const timeMap = new Map<string, number>();
    const vehicleMap = new Map<string, number>();

    let underutilizedCount = 0;
    let optimizedCount = 0;
    let balancedCount = 0;

    let underutilizedMetric = 0;
    let optimizedMetric = 0;

    const loadBucketMap = new Map<string, number>([
      ['Underutilized (<50%)', 0],
      ['Balanced (50-80%)', 0],
      ['Optimized (>80%)', 0],
    ]);

    shipments.forEach(s => {
      const val = getShipmentMetric(s, metricMode);
      totalMetric += val;
      totalWeight += s.weight_kg;
      const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
      timeMap.set(dateStr, (timeMap.get(dateStr) || 0) + val);
      vehicleMap.set(s.vehicle_type, (vehicleMap.get(s.vehicle_type) || 0) + val);

       const loadFactor = s.load_factor ?? 0;
       if (loadFactor < 0.5) {
         underutilizedCount += 1;
         underutilizedMetric += val;
         loadBucketMap.set(
           'Underutilized (<50%)',
           (loadBucketMap.get('Underutilized (<50%)') || 0) + 1
         );
       } else if (loadFactor < 0.8) {
         balancedCount += 1;
         loadBucketMap.set(
           'Balanced (50-80%)',
           (loadBucketMap.get('Balanced (50-80%)') || 0) + 1
         );
       } else {
         optimizedCount += 1;
         optimizedMetric += val;
         loadBucketMap.set(
           'Optimized (>80%)',
           (loadBucketMap.get('Optimized (>80%)') || 0) + 1
         );
       }
    });

    const avgLoad = shipments.reduce((sum, s) => sum + s.load_factor, 0) / (shipments.length || 1);
    const esgScore = calculateESGScore(totalMetric, totalWeight * 0.1, avgLoad);

    const timeSeriesData = Array.from(timeMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, value]) => ({ date, value }));

    const vehicleData = Array.from(vehicleMap.entries()).map(([name, value]) => ({ name, value }));
    const lanes = aggregateByLane(shipments).slice(0, 5);

    const loadUtilizationData = Array.from(loadBucketMap.entries()).map(([segment, count]) => ({
      segment,
      count,
    }));

    const utilizationImpactData = [
      { name: 'Underutilized', value: underutilizedMetric },
      { name: 'Optimized', value: optimizedMetric },
      { name: 'Other', value: Math.max(totalMetric - underutilizedMetric - optimizedMetric, 0) },
    ];

    const underutilizedShare = totalMetric > 0 ? (underutilizedMetric / totalMetric) * 100 : 0;

    return {
      totalMetric,
      esgScore,
      avgLoad,
      timeSeriesData,
      vehicleData,
      lanes,
      loadUtilizationData,
      utilizationImpactData,
      underutilizedShare,
      underutilizedCount,
      optimizedCount,
      balancedCount,
    };
  }, [shipments, metricMode]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
  const LOAD_UTIL_COLORS = ['#A855F7', '#6366F1', '#E5E7EB'];
  const UTIL_IMPACT_COLORS = ['#EF4444', '#10B981', '#9CA3AF'];
  const unit = getMetricUnit(metricMode);
  const label = getMetricLabel(metricMode);

  const formatValue = (val: number) => {
    if (metricMode === 'cost') return `$${(val / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
    return `${(val / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
  };

  // Show upload zone if no data has been loaded yet
  if (!initialized && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm">Upload your shipment dataset to begin analysis.</p>
          </div>
        </div>
        <CSVUploadZone variant="hero" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <FloatingParticles count={10} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm">Monitor enterprise-level emissions and logistics efficiency metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <MetricToggle value={metricMode} onChange={setMetricMode} />
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCleanedCsv}
            disabled={!rawRecords || rawRecords.length === 0}
            title={rawRecords && rawRecords.length > 0 ? 'Download cleaned dataset from backend processing' : 'Upload/Load data first'}
          >
            <FileDown className="w-3.5 h-3.5 mr-1" />
            Cleaned CSV
          </Button>
        </div>
      </div>

      <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10" staggerDelay={0.1}>
        <StaggerItem>
          <KpiCard
            title={`Total ${label}`}
            value={formatValue(metrics.totalMetric)}
            numericValue={metrics.totalMetric / 1000}
            decimals={1}
            suffix={metricMode === 'cost' ? 'k' : ' kg'}
            prefix={metricMode === 'cost' ? '$' : undefined}
            icon={<AlertTriangle className="h-4 w-4" />}
            description="vs baseline target"
            trend="down" trendValue="12.4%"
            inverseTrendColors={true}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard title="ESG Score" value={metrics.esgScore.toFixed(0)} numericValue={metrics.esgScore} decimals={0} icon={<Leaf className="h-4 w-4" />} description="A rating (1-100)" trend="up" trendValue="4 points" />
        </StaggerItem>
        <StaggerItem>
          <KpiCard title="Active Shipments" value={shipments.length.toLocaleString()} numericValue={shipments.length} icon={<Activity className="h-4 w-4" />} description="In analyzed period" />
        </StaggerItem>
        <StaggerItem>
          <KpiCard title="Avg. Load Factor" value={`${(metrics.avgLoad * 100).toFixed(1)}%`} numericValue={metrics.avgLoad * 100} decimals={1} suffix="%" icon={<Truck className="h-4 w-4" />} description="Target is &gt; 80%" trend="down" trendValue="2.1%" inverseTrendColors={false} />
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 relative z-10">
        <ChartCard title={`${label} Trend`} description={`Daily ${label.toLowerCase()} across all active lanes`}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.timeSeriesData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => metricMode === 'cost' ? `$${(val / 1000).toFixed(0)}k` : `${(val / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any) => [metricMode === 'cost' ? `$${Number(value).toFixed(0)}` : `${Number(value).toFixed(1)} kg`, label]} />
              <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorMetric)" isAnimationActive={true} animationDuration={1500} animationBegin={200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Transport Mode Breakdown" description={`Proportional share of total ${label}`}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={metrics.vehicleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={true} animationDuration={1200} animationBegin={400} animationEasing="ease-out">
                {metrics.vehicleData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any) => [metricMode === 'cost' ? `$${(Number(value) / 1000).toFixed(1)}k` : `${(Number(value) / 1000).toFixed(1)}k kg`, label]} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 relative z-10">
        <ChartCard
          title="Load Utilization by Shipment"
          description="How shipments are distributed across utilization bands"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
            <div className="relative flex-1 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.loadUtilizationData.map((d, index) => ({
                      name: d.segment,
                      value: d.count,
                      fill: LOAD_UTIL_COLORS[index % LOAD_UTIL_COLORS.length],
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationBegin={200}
                    animationEasing="ease-out"
                  >
                    {metrics.loadUtilizationData.map((_, index) => (
                      <Cell key={`load-util-cell-${index}`} fill={LOAD_UTIL_COLORS[index % LOAD_UTIL_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-muted-foreground">Total Shipments</span>
                <span className="text-2xl font-semibold">
                  {shipments.length.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="w-full sm:w-48 space-y-3">
              {metrics.loadUtilizationData.map((bucket, index) => {
                const total = shipments.length || 1;
                const pct = (bucket.count / total) * 100;
                const color = LOAD_UTIL_COLORS[index % LOAD_UTIL_COLORS.length];
                return (
                  <div key={bucket.segment} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {bucket.segment}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {bucket.count.toLocaleString()} shipments
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Impact of Underutilized Shipments"
          description={`Emissions / cost share from underutilized vs optimized moves`}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
            <div className="relative flex-1 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.utilizationImpactData.map((d, index) => ({
                      ...d,
                      fill: UTIL_IMPACT_COLORS[index % UTIL_IMPACT_COLORS.length],
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationBegin={250}
                    animationEasing="ease-out"
                  >
                    {metrics.utilizationImpactData.map((_, index) => (
                      <Cell key={`util-impact-cell-${index}`} fill={UTIL_IMPACT_COLORS[index % UTIL_IMPACT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-muted-foreground">
                  Total {label}
                </span>
                <span className="text-2xl font-semibold">
                  {formatValue(metrics.totalMetric)}
                </span>
              </div>
            </div>

            <div className="w-full sm:w-48 space-y-3">
              {metrics.utilizationImpactData.map((bucket, index) => {
                const total = metrics.totalMetric || 1;
                const pct = total > 0 ? (bucket.value / total) * 100 : 0;
                const color = UTIL_IMPACT_COLORS[index % UTIL_IMPACT_COLORS.length];
                const formattedValue =
                  metricMode === 'cost'
                    ? `$${(bucket.value / 1000).toFixed(1)}k`
                    : `${(bucket.value / 1000).toFixed(1)}k ${unit}`;

                return (
                  <div key={bucket.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {bucket.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formattedValue}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="relative z-10">
        <ChartCard title="Highest Emission Lanes" description="Click a lane to drill into Lane Analysis." action={<span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => router.push('/lane-analysis')}>View All →</span>}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.lanes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
              <YAxis dataKey="id" type="category" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} width={150} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'Total CO2']} />
              <Bar
                dataKey="total_emissions_kg" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20}
                isAnimationActive={true} animationDuration={1200} animationBegin={600} animationEasing="ease-out"
                cursor="pointer"
                onClick={(data: any) => {
                  if (data?.id) {
                    const [origin] = data.id.split('-');
                    router.push(`/lane-analysis?region=${encodeURIComponent(origin)}`);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
