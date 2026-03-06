'use client';

import { useState, useMemo } from 'react';
import { useShipments } from '@/hooks/useShipments';
import { simulateScenario } from '@/lib/scenario';
import { calculateShipmentCO2 } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Activity, Beaker, RotateCcw, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FuelType, VehicleType } from '@/types';

export default function SimulationPage() {
  const { shipments } = useShipments();

  const [targetVehicle, setTargetVehicle] = useState<VehicleType | 'None'>('None');
  const [targetFuel, setTargetFuel] = useState<FuelType | 'None'>('None');
  const [loadFactorBoost, setLoadFactorBoost] = useState([0]); // 0 to 30% boost
  const [simulated, setSimulated] = useState(false);

  // Baseline calculations
  const baselineMetrics = useMemo(() => {
    let totalCO2 = 0;
    const timeMap = new Map<string, number>();

    shipments.forEach(s => {
      const co2 = calculateShipmentCO2(s);
      totalCO2 += co2;
      const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
      timeMap.set(dateStr, (timeMap.get(dateStr) || 0) + co2);
    });

    const timeSeries = Array.from(timeMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, baseline]) => ({ date, baseline, simulated: baseline }));

    return { totalCO2, timeSeries };
  }, [shipments]);

  // Projected calculations
  const simulatedMetrics = useMemo(() => {
    if (!simulated) return { totalCO2: baselineMetrics.totalCO2, diff: 0, percentChange: 0, timeSeries: baselineMetrics.timeSeries };
    
    const projectedData = simulateScenario(shipments, {
        targetVehicleType: targetVehicle !== 'None' ? (targetVehicle as VehicleType) : 'All',
        targetFuelType: targetFuel !== 'None' ? (targetFuel as FuelType) : 'All',
        minLoadFactor: loadFactorBoost[0] / 100 // convert % to decimal
    });

    let simTotalCO2 = 0;
    const simTimeMap = new Map<string, number>();

    projectedData.forEach(s => {
      const co2 = calculateShipmentCO2(s);
      simTotalCO2 += co2;
      const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
      simTimeMap.set(dateStr, (simTimeMap.get(dateStr) || 0) + co2);
    });

    const combinedTimeSeries = baselineMetrics.timeSeries.map(day => ({
        ...day,
        simulated: simTimeMap.get(day.date) || 0
    }));

    const diff = baselineMetrics.totalCO2 - simTotalCO2;
    const percentChange = (diff / baselineMetrics.totalCO2) * 100;

    return { totalCO2: simTotalCO2, diff, percentChange, timeSeries: combinedTimeSeries };
  }, [shipments, simulated, targetVehicle, targetFuel, loadFactorBoost, baselineMetrics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">What-If Simulation</h1>
        <p className="text-muted-foreground text-sm">Model the impact of fleet upgrades and capacity tuning.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-6">
          <ChartCard title="Scenario Parameters" description="Adjust variables to forecast network changes.">
            <div className="space-y-6 pt-2">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Vehicle)</Label>
                    <Select value={targetVehicle} onValueChange={(val: any) => setTargetVehicle(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="None">Keep Existing</SelectItem>
                            <SelectItem value="Truck">All Trucks</SelectItem>
                            <SelectItem value="Train">All Trains</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Fuel)</Label>
                    <Select value={targetFuel} onValueChange={(val: any) => setTargetFuel(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select fuel..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="None">Keep Existing</SelectItem>
                            <SelectItem value="Electric">Electric (EV)</SelectItem>
                            <SelectItem value="Hydrogen">Hydrogen Fuel Cell</SelectItem>
                            <SelectItem value="Sustainable Aviation Fuel">Sustainable Aviation Fuel (SAF)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Force Capacity Boost</Label>
                        <span className="text-sm font-bold text-brand-blue">+{loadFactorBoost[0]}%</span>
                    </div>
                    <Slider 
                        defaultValue={[0]} 
                        max={30} 
                        step={1} 
                        value={loadFactorBoost}
                        onValueChange={setLoadFactorBoost}
                    />
                </div>

                <div className="pt-4 space-y-2">
                    <Button onClick={() => setSimulated(true)} className="w-full bg-brand-blue hover:bg-brand-blue/90">
                        <Zap className="w-4 h-4 mr-2" /> Run Simulation
                    </Button>
                    {simulated && (
                        <Button onClick={() => {
                            setSimulated(false);
                            setTargetVehicle('None');
                            setTargetFuel('None');
                            setLoadFactorBoost([0]);
                        }} variant="ghost" className="w-full text-muted-foreground">
                            <RotateCcw className="w-4 h-4 mr-2" /> Reset
                        </Button>
                    )}
                </div>
            </div>
          </ChartCard>
        </div>

        <div className="md:col-span-3 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <KpiCard
                    title="Baseline Output"
                    value={`${(baselineMetrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k kg`}
                    numericValue={baselineMetrics.totalCO2 / 1000}
                    decimals={1}
                    suffix="k kg"
                    icon={<Activity className="h-4 w-4" />}
                />
                <KpiCard
                    title="Forecast Output (Simulated)"
                    value={`${(simulatedMetrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k kg`}
                    numericValue={simulatedMetrics.totalCO2 / 1000}
                    decimals={1}
                    suffix="k kg"
                    icon={<Beaker className="h-4 w-4" />}
                    trend={simulatedMetrics.percentChange > 0 ? "down" : (simulatedMetrics.percentChange < 0 ? "up" : "neutral")}
                    trendValue={simulated ? `${Math.abs(simulatedMetrics.percentChange).toFixed(1)}%` : "0%"}
                    inverseTrendColors={true}
                    className={simulated ? "border-brand-blue/50 bg-brand-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : ""}
                />
            </div>

            <ChartCard title="Projected Emissions Trajectory" description="Temporal comparison of baseline vs modeled scenario.">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={simulatedMetrics.timeSeries} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} kg`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="baseline" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />
                        {simulated && (
                            <Line type="monotone" dataKey="simulated" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
      </div>
    </div>
  );
}
