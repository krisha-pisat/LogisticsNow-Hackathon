'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useShipments } from '@/hooks/useShipments';
import { simulateScenario } from '@/lib/scenario';
import { calculateShipmentCO2 } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Activity, Beaker, RotateCcw, Zap, Loader2, Save, GitCompare, FileDown, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, CHART_TOOLTIP_STYLE } from '@/components/motion';
import { toast } from 'sonner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar
} from 'recharts';
import { FuelType, VehicleType, SavedScenario } from '@/types';

const STORAGE_KEY = 'cioa-saved-scenarios';

function loadSavedScenarios(): SavedScenario[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
}

function saveScenariosToStorage(scenarios: SavedScenario[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export default function SimulationPage() {
    const { shipments } = useShipments();
    const [targetVehicle, setTargetVehicle] = useState<VehicleType | 'None'>('None');
    const [targetFuel, setTargetFuel] = useState<FuelType | 'None'>('None');
    const [loadFactorBoost, setLoadFactorBoost] = useState([0]);
    const [simulated, setSimulated] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
    const [compareMode, setCompareMode] = useState(false);

    useEffect(() => {
        setSavedScenarios(loadSavedScenarios());
    }, []);

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

    const simulatedMetrics = useMemo(() => {
        if (!simulated) return { totalCO2: baselineMetrics.totalCO2, diff: 0, percentChange: 0, timeSeries: baselineMetrics.timeSeries };
        const projectedData = simulateScenario(shipments, {
            targetVehicleType: targetVehicle !== 'None' ? (targetVehicle as VehicleType) : 'All',
            targetFuelType: targetFuel !== 'None' ? (targetFuel as FuelType) : 'All',
            minLoadFactor: loadFactorBoost[0] / 100
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

    const handleRunSimulation = () => {
        setIsRunning(true);
        setTimeout(() => { setSimulated(true); setIsRunning(false); }, 800);
    };

    const handleSaveScenario = () => {
        if (!simulated) { toast.warning('Run simulation first'); return; }
        const name = `Scenario ${savedScenarios.length + 1}`;
        const scenario: SavedScenario = {
            id: `SCN-${Date.now()}`,
            name,
            params: {
                targetVehicleType: targetVehicle !== 'None' ? (targetVehicle as VehicleType) : 'All',
                targetFuelType: targetFuel !== 'None' ? (targetFuel as FuelType) : 'All',
                minLoadFactor: loadFactorBoost[0] / 100,
            },
            baselineCO2: baselineMetrics.totalCO2,
            simulatedCO2: simulatedMetrics.totalCO2,
            percentChange: simulatedMetrics.percentChange,
            timestamp: new Date().toISOString(),
        };
        const updated = [...savedScenarios, scenario];
        setSavedScenarios(updated);
        saveScenariosToStorage(updated);
        toast.success(`"${name}" saved`);
    };

    const deleteScenario = (id: string) => {
        const updated = savedScenarios.filter(s => s.id !== id);
        setSavedScenarios(updated);
        saveScenariosToStorage(updated);
        toast.info('Scenario deleted');
    };

    const exportReport = () => {
        if (!simulated) { toast.warning('Run simulation first'); return; }
        const report = {
            generated: new Date().toISOString(),
            baseline_co2: baselineMetrics.totalCO2,
            simulated_co2: simulatedMetrics.totalCO2,
            reduction_pct: simulatedMetrics.percentChange,
            params: { vehicle: targetVehicle, fuel: targetFuel, loadBoost: loadFactorBoost[0] },
            savedScenarios,
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `CIOA_Simulation_Report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Scenario report exported');
    };

    // Comparison chart data
    const comparisonData = useMemo(() => {
        if (!compareMode || savedScenarios.length === 0) return [];
        return savedScenarios.map(s => ({
            name: s.name,
            baseline: s.baselineCO2,
            simulated: s.simulatedCO2,
            savings: s.baselineCO2 - s.simulatedCO2,
        }));
    }, [compareMode, savedScenarios]);

    return (
        <div className="space-y-6">
            <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">What-If Simulation</h1>
                    <p className="text-muted-foreground text-sm">Model the impact of fleet upgrades and capacity tuning.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSaveScenario}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setCompareMode(!compareMode)}><GitCompare className="w-3.5 h-3.5 mr-1" /> Compare ({savedScenarios.length})</Button>
                    <Button variant="outline" size="sm" onClick={exportReport}><FileDown className="w-3.5 h-3.5 mr-1" /> Export</Button>
                </div>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-4">
                <div className="md:col-span-1 space-y-6">
                    <ChartCard title="Scenario Parameters" description="Adjust variables to forecast network changes.">
                        <div className="space-y-6 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Vehicle)</Label>
                                <Select value={targetVehicle} onValueChange={(val: any) => setTargetVehicle(val)}>
                                    <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">Keep Existing</SelectItem>
                                        <SelectItem value="Truck">All Trucks</SelectItem>
                                        <SelectItem value="Train">All Trains</SelectItem>
                                        <SelectItem value="Ship">All Ships</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Migrate Fleet To (Fuel)</Label>
                                <Select value={targetFuel} onValueChange={(val: any) => setTargetFuel(val)}>
                                    <SelectTrigger><SelectValue placeholder="Select fuel..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">Keep Existing</SelectItem>
                                        <SelectItem value="Electric">Electric (EV)</SelectItem>
                                        <SelectItem value="Hydrogen">Hydrogen Fuel Cell</SelectItem>
                                        <SelectItem value="Biodiesel">Biodiesel</SelectItem>
                                        <SelectItem value="Sustainable Aviation Fuel">Sustainable Aviation Fuel (SAF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Force Capacity Boost</Label>
                                    <motion.span className="text-sm font-bold text-primary" key={loadFactorBoost[0]} initial={{ scale: 1.2, color: '#3B82F6' }} animate={{ scale: 1, color: '#10B981' }} transition={{ duration: 0.3 }}>+{loadFactorBoost[0]}%</motion.span>
                                </div>
                                <Slider defaultValue={[0]} max={30} step={1} value={loadFactorBoost} onValueChange={setLoadFactorBoost} />
                                <AnimatedProgress value={loadFactorBoost[0]} max={30} color="#3B82F6" />
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

                <div className="md:col-span-3 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <ChartCard title="Projected Emissions Trajectory" description="Temporal comparison of baseline vs modeled scenario.">
                        <ResponsiveContainer width="100%" height={300}>
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

                    {/* Saved Scenarios Comparison */}
                    <AnimatePresence>
                        {compareMode && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <ChartCard title="Scenario Comparison" description={`${savedScenarios.length} saved scenarios`}>
                                    {savedScenarios.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">No saved scenarios yet. Run a simulation and click "Save".</p>
                                    ) : (
                                        <>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                                    <Legend />
                                                    <Bar dataKey="baseline" name="Baseline" fill="#9CA3AF" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                    <Bar dataKey="simulated" name="Simulated" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                            <div className="mt-3 space-y-2">
                                                {savedScenarios.map(s => (
                                                    <div key={s.id} className="flex justify-between items-center bg-muted/30 rounded-md p-2 text-xs">
                                                        <span className="font-medium">{s.name}</span>
                                                        <span className="text-primary">-{s.percentChange.toFixed(1)}%</span>
                                                        <span className="text-muted-foreground">{new Date(s.timestamp).toLocaleDateString()}</span>
                                                        <button onClick={() => deleteScenario(s.id)} className="text-muted-foreground hover:text-brand-red transition-colors">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </ChartCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
