'use client';

import { useState, useMemo, useEffect } from 'react';
import { useShipments } from '@/hooks/useShipments';
import { simulateScenario } from '@/lib/scenario';
import { ChartCard } from '@/components/ui/chart-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Activity, Beaker, RotateCcw, Zap, Loader2, GitCompare, FileDown, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, CHART_TOOLTIP_STYLE } from '@/components/motion';
import { toast } from 'sonner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar
} from 'recharts';
import { FuelType, VehicleType } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

// Backend-aligned emission factors (kg CO₂ per ton-km)
const EMISSION_FACTOR_LOOKUP: Record<string, Record<string, number>> = {
    Electric: { Electric: 0.05, Petrol: 0.10, Diesel: 0.10 },
    Diesel: { Diesel: 0.45, Electric: 0.35, Petrol: 0.42 },
    Hybrid: { Petrol: 0.25, Diesel: 0.28, Electric: 0.12 },
};

function getEmissionFactor(vehicle: VehicleType, fuel: FuelType): number {
    return EMISSION_FACTOR_LOOKUP[vehicle]?.[fuel] ?? 0.30;
}

function co2KgBackendStyle(s: {
    weight_kg: number;
    distance_km: number;
    load_factor: number;
    emission_factor?: number;
    vehicle_type: VehicleType;
    fuel_type: FuelType;
}): number {
    const tonKm = (Number(s.weight_kg) / 1000) * Number(s.distance_km);
    const load = Math.max(0.01, Number(s.load_factor) || 0.5);
    const lfAdj = load < 0.8 ? (1 / load) : 1.0;
    // Use existing per-row factor when available (matches dashboard scale), otherwise look it up.
    const factor = (s.emission_factor != null ? Number(s.emission_factor) : undefined) ?? getEmissionFactor(s.vehicle_type, s.fuel_type);
    return tonKm * factor * lfAdj;
}

export default function SimulationPage() {
    const { shipments } = useShipments();
    const router = useRouter();
    const [targetVehicle, setTargetVehicle] = useState<VehicleType | 'None'>('None');
    const [targetFuel, setTargetFuel] = useState<FuelType | 'None'>('None');
    const [loadFactorBoost, setLoadFactorBoost] = useState([0]);
    const [simulated, setSimulated] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [routeDialogOpen, setRouteDialogOpen] = useState(false);

    const fuelOptions = useMemo<FuelType[]>(() => {
        const base: FuelType[] = ['Diesel', 'Petrol', 'Electric'];
        if (targetVehicle === 'Electric') return ['Electric'];
        if (targetVehicle === 'Diesel') return ['Diesel', 'Petrol'];
        if (targetVehicle === 'Hybrid') return base;
        return base;
    }, [targetVehicle]);

    useEffect(() => {
        if (targetFuel !== 'None' && !fuelOptions.includes(targetFuel)) {
            setTargetFuel('None');
        }
    }, [fuelOptions, targetFuel]);

    const baselineMetrics = useMemo(() => {
        let totalCO2 = 0;
        let totalLoad = 0;
        const timeMap = new Map<string, number>();
        shipments.forEach(s => {
            const co2 = co2KgBackendStyle(s);
            totalCO2 += co2;
            totalLoad += Number(s.load_factor) || 0;
            const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
            timeMap.set(dateStr, (timeMap.get(dateStr) || 0) + co2);
        });
        const timeSeries = Array.from(timeMap.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, baseline]) => ({ date, baseline, simulated: baseline }));
        const avgLoad = shipments.length > 0 ? (totalLoad / shipments.length) : 0;
        return { totalCO2, avgLoad, timeSeries };
    }, [shipments]);

    const simulatedMetrics = useMemo(() => {
        if (!simulated) return { totalCO2: baselineMetrics.totalCO2, avgLoad: baselineMetrics.avgLoad, diff: 0, percentChange: 0, timeSeries: baselineMetrics.timeSeries };
        const projectedData = simulateScenario(shipments, {
            targetVehicleType: targetVehicle !== 'None' ? (targetVehicle as VehicleType) : 'All',
            targetFuelType: targetFuel !== 'None' ? (targetFuel as FuelType) : 'All',
            minLoadFactor: loadFactorBoost[0] / 100
        });
        let simTotalCO2 = 0;
        let simTotalLoad = 0;
        const simTimeMap = new Map<string, number>();
        projectedData.forEach(s => {
            // Recompute factor under the simulated technology choice.
            const co2 = co2KgBackendStyle({
                ...s,
                emission_factor: getEmissionFactor(s.vehicle_type, s.fuel_type),
            });
            simTotalCO2 += co2;
            simTotalLoad += Number(s.load_factor) || 0;
            const dateStr = new Date(s.shipment_date).toISOString().split('T')[0];
            simTimeMap.set(dateStr, (simTimeMap.get(dateStr) || 0) + co2);
        });
        const combinedTimeSeries = baselineMetrics.timeSeries.map(day => ({
            ...day,
            simulated: simTimeMap.get(day.date) || 0
        }));
        const diff = baselineMetrics.totalCO2 - simTotalCO2;
        const percentChange = (diff / baselineMetrics.totalCO2) * 100;
        const avgLoad = projectedData.length > 0 ? (simTotalLoad / projectedData.length) : 0;
        return { totalCO2: simTotalCO2, avgLoad, diff, percentChange, timeSeries: combinedTimeSeries };
    }, [shipments, simulated, targetVehicle, targetFuel, loadFactorBoost, baselineMetrics]);

    const handleRunSimulation = () => {
        setIsRunning(true);
        setTimeout(() => { setSimulated(true); setIsRunning(false); }, 800);
    };

    const exportReport = () => {
        if (!simulated) {
            toast.warning('Run a simulation first, then open the ESG report to export a styled PDF.');
            return;
        }
        router.push('/reports');
    };

    // Route-level comparison data (top 8 lanes by savings)
    const laneComparison = useMemo(() => {
        if (!simulated || shipments.length === 0) return [];

        const params = {
            targetVehicleType: targetVehicle !== 'None' ? (targetVehicle as VehicleType) : 'All',
            targetFuelType: targetFuel !== 'None' ? (targetFuel as FuelType) : 'All',
            minLoadFactor: loadFactorBoost[0] / 100,
        };

        const projected = simulateScenario(shipments, params);

        const baselineLane = new Map<string, number>();
        const simulatedLane = new Map<string, number>();

        shipments.forEach(s => {
            const lane = s.lane_id || `${s.origin_city}_${s.destination_city}`;
            const co2 = co2KgBackendStyle(s);
            baselineLane.set(lane, (baselineLane.get(lane) || 0) + co2);
        });

        projected.forEach(s => {
            const lane = s.lane_id || `${s.origin_city}_${s.destination_city}`;
            const co2 = co2KgBackendStyle({ ...s, emission_factor: getEmissionFactor(s.vehicle_type, s.fuel_type) });
            simulatedLane.set(lane, (simulatedLane.get(lane) || 0) + co2);
        });

        const rows = Array.from(baselineLane.entries()).map(([lane, base]) => {
            const sim = simulatedLane.get(lane) ?? base;
            return {
                lane,
                baseline: base,
                simulated: sim,
                savings: base - sim,
            };
        });

        return rows
            .filter(r => r.lane && r.lane !== 'Unknown')
            .sort((a, b) => (b.savings) - (a.savings))
            .slice(0, 10)
            .map(r => ({ ...r, laneLabel: r.lane.replace('_', ' → ') }));
    }, [simulated, shipments, targetVehicle, targetFuel, loadFactorBoost]);

    return (
        <div className="space-y-6">
            <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">What-If Simulation</h1>
                    <p className="text-muted-foreground text-sm">Model the impact of fleet upgrades and capacity tuning.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRouteDialogOpen(true)} disabled={!simulated}>
                        <GitCompare className="w-3.5 h-3.5 mr-1" /> Compare by route
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportReport}>
                        <FileDown className="w-3.5 h-3.5 mr-1" /> Open ESG PDF
                    </Button>
                </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-4 items-start">
                <div className="md:col-span-1 space-y-6">
                    <ChartCard title="Scenario Parameters" description="Adjust variables to forecast network changes.">
                        <div className="space-y-6 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Vehicle)</Label>
                                <Select value={targetVehicle} onValueChange={(val: any) => setTargetVehicle(val)}>
                                    <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">Keep Existing</SelectItem>
                                        <SelectItem value="Diesel">All Diesel Vehicles</SelectItem>
                                        <SelectItem value="Electric">All Electric Vehicles</SelectItem>
                                        <SelectItem value="Hybrid">All Hybrid Vehicles</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Fuel)</Label>
                                <Select value={targetFuel} onValueChange={(val: any) => setTargetFuel(val)}>
                                    <SelectTrigger><SelectValue placeholder="Select fuel..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">Keep Existing</SelectItem>
                                        {fuelOptions.map((f) => (
                                            <SelectItem key={f} value={f}>
                                                {f === 'Diesel' && 'Diesel Fuel'}
                                                {f === 'Petrol' && 'Petrol Fuel'}
                                                {f === 'Electric' && 'Electric Grid'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Force Capacity Boost</Label>
                                    <motion.span className="text-sm font-bold text-primary" key={loadFactorBoost[0]} initial={{ scale: 1.2, color: '#3B82F6' }} animate={{ scale: 1, color: '#10B981' }} transition={{ duration: 0.3 }}>+{loadFactorBoost[0]}%</motion.span>
                                </div>
                                <Slider defaultValue={[0]} max={50} step={5} value={loadFactorBoost} onValueChange={setLoadFactorBoost} />
                                <p className="text-[10px] text-muted-foreground">Simulates consolidating shipments so underutilized vehicles run at a higher load factor.</p>
                                <AnimatedProgress value={loadFactorBoost[0]} max={50} color="#3B82F6" />
                            </div>

                            <div className="pt-4 space-y-2">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button onClick={handleRunSimulation} className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isRunning}>
                                        {isRunning ? (
                                            <motion.span className="flex items-center" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...
                                            </motion.span>
                                        ) : (
                                            <><Zap className="w-4 h-4 mr-2" /> Run Simulation</>
                                        )}
                                    </Button>
                                </motion.div>
                                <AnimatePresence>
                                    {simulated && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                            <Button onClick={() => { setSimulated(false); setTargetVehicle('None'); setTargetFuel('None'); setLoadFactorBoost([0]); }} variant="ghost" className="w-full text-muted-foreground">
                                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </ChartCard>
                </div>

                <div className="md:col-span-3 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard title="Baseline Output" value={`${(baselineMetrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k kg`} numericValue={baselineMetrics.totalCO2 / 1000} decimals={1} suffix="k kg" icon={<Activity className="h-4 w-4" />} />
                        <KpiCard
                            title="Forecast Output (Simulated)"
                            value={`${(simulatedMetrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k kg`}
                            numericValue={simulatedMetrics.totalCO2 / 1000} decimals={1} suffix="k kg"
                            icon={<Beaker className="h-4 w-4" />}
                            trend={simulatedMetrics.percentChange > 0 ? "down" : (simulatedMetrics.percentChange < 0 ? "up" : "neutral")}
                            trendValue={simulated ? `${Math.abs(simulatedMetrics.percentChange).toFixed(1)}%` : "0%"}
                            inverseTrendColors={true}
                            className={simulated ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : ""}
                        />
                        <KpiCard
                            title="Avg Load Factor (Baseline)"
                            value={`${(baselineMetrics.avgLoad * 100).toFixed(1)}%`}
                            numericValue={baselineMetrics.avgLoad * 100}
                            decimals={1}
                            suffix="%"
                            icon={<Truck className="h-4 w-4" />}
                        />
                        <KpiCard
                            title="Avg Load Factor (Forecast)"
                            value={`${(simulatedMetrics.avgLoad * 100).toFixed(1)}%`}
                            numericValue={simulatedMetrics.avgLoad * 100}
                            decimals={1}
                            suffix="%"
                            icon={<Truck className="h-4 w-4" />}
                            trend={simulatedMetrics.avgLoad > baselineMetrics.avgLoad ? "up" : (simulatedMetrics.avgLoad < baselineMetrics.avgLoad ? "down" : "neutral")}
                            trendValue={simulated ? `${Math.abs((simulatedMetrics.avgLoad - baselineMetrics.avgLoad) * 100).toFixed(1)}%` : "0%"}
                            inverseTrendColors={false}
                        />
                    </div>
                    <ChartCard title="Projected Emissions Trajectory" description="Temporal comparison of baseline vs modeled scenario.">
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={simulatedMetrics.timeSeries} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} kg`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                                <Legend />
                                <Line type="monotone" dataKey="baseline" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={1500} animationBegin={200} animationEasing="ease-out" />
                                {simulated && (
                                    <Line type="monotone" dataKey="simulated" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} isAnimationActive={true} animationDuration={1500} animationBegin={800} animationEasing="ease-out" />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Baseline Output</span> is the total modeled CO₂ for your current shipments using their existing vehicle, fuel,
                        emission factor and load factor (low utilization gets a higher penalty). <span className="font-semibold">Forecast Output</span> reruns the same shipments
                        with your selected fleet migration and capacity boost, then recomputes CO₂ using the backend-aligned factor lookup so it matches the Dashboard scale.
                    </p>

                    <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Route-level impact</DialogTitle>
                                <DialogDescription>
                                    Top routes ranked by CO₂ reduction between baseline and this scenario.
                                </DialogDescription>
                            </DialogHeader>

                            {!simulated || laneComparison.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    Run a simulation first, then reopen this view to compare baseline vs simulated emissions by route.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={laneComparison} layout="vertical" margin={{ top: 5, right: 24, left: 90, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                                <XAxis
                                                    type="number"
                                                    stroke="#9CA3AF"
                                                    fontSize={11}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                                                />
                                                <YAxis
                                                    type="category"
                                                    dataKey="laneLabel"
                                                    stroke="#9CA3AF"
                                                    fontSize={11}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    width={110}
                                                />
                                                <Tooltip
                                                    contentStyle={CHART_TOOLTIP_STYLE}
                                                    formatter={(val: number) => [`${(val / 1000).toFixed(2)}k kg`, 'CO₂']}
                                                />
                                                <Legend />
                                                <Bar dataKey="baseline" name="Baseline" fill="#9CA3AF" radius={[0, 4, 4, 0]} maxBarSize={24} />
                                                <Bar dataKey="simulated" name="Simulated" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        {laneComparison.slice(0, 6).map((r) => (
                                            <div key={r.lane} className="flex justify-between items-center bg-muted/40 rounded px-2 py-1.5">
                                                <span className="font-medium truncate" title={r.laneLabel}>{r.laneLabel}</span>
                                                <span className="text-primary font-semibold shrink-0 ml-1">
                                                    −{((r.savings / r.baseline) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
