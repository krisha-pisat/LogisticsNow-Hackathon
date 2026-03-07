'use client';

import { useShipments } from '@/hooks/useShipments';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useMemo, useState, useCallback } from 'react';
import { Settings, ArrowDown, Sparkles, DollarSign } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import CountUp from 'react-countup';
import { AnimatedProgress, CHART_TOOLTIP_STYLE, StaggerContainer, StaggerItem } from '@/components/motion';
import { generateOptimizationSuggestions, calculateSuggestionTotals, generateSankeyData, generateLaneSavingsData } from '@/lib/optimization';
import { calculateShipmentCO2 } from '@/lib/emissions';
import { OptimizationSuggestion } from '@/types';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { OptimizationSuggestionCard } from '@/components/optimization/OptimizationSuggestionCard';

export default function OptimizationPage() {
  const { shipments } = useShipments();
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [tradeoff, setTradeoff] = useState([50]); // 0 = min cost, 100 = min CO2

  // Generate suggestions once
  useMemo(() => {
    if (shipments.length > 0 && !initialized) {
      setSuggestions(generateOptimizationSuggestions(shipments));
      setInitialized(true);
    }
  }, [shipments, initialized]);

  const totals = useMemo(() => calculateSuggestionTotals(suggestions), [suggestions]);

  const baselineTotal = useMemo(() => {
    return shipments.reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
  }, [shipments]);

  const reductionPct = baselineTotal > 0 ? (totals.totalCO2Savings / baselineTotal) * 100 : 0;

  // Sankey-like flow comparison data
  const flowData = useMemo(() => generateSankeyData(shipments, suggestions), [shipments, suggestions]);

  // Lane-level CO₂ savings (top insight)
  const laneSavingsData = useMemo(
    () => generateLaneSavingsData(shipments, suggestions).slice(0, 8),
    [shipments, suggestions]
  );

  // Fleet-level "truck" (leg) count & load factor impact
  const fleetImpact = useMemo(() => {
    // Only look at shipments that are part of at least one *applied* suggestion
    const appliedSuggestions = suggestions.filter((s) => s.applied);
    if (appliedSuggestions.length === 0) return null;

    const appliedIds = new Set<string>();
    appliedSuggestions.forEach((sug) => {
      sug.shipmentIds.forEach((id) => appliedIds.add(id));
    });

    const appliedShipments = shipments.filter((s) => appliedIds.has(s.shipment_id));
    if (appliedShipments.length === 0) return null;

    // Treat each shipment as a "truck/leg" for this KPI
    const baselineTruckCount = appliedShipments.length;

    // Reductions from different suggestion types:
    // - consolidation: N shipments on same lane/day -> 1 vehicle  => reduce by (N - 1)
    // - mode_switch: mode change only (vehicle still used)        => no count change
    // - delay: scheduling change only                             => no count change
    let reducedTrucks = 0;

    appliedSuggestions.forEach((sug) => {
      const countInSuggestion = sug.shipmentIds.filter((id) => appliedIds.has(id)).length;

      if (countInSuggestion === 0) return;

      if (sug.type === 'consolidation' && countInSuggestion > 1) {
        reducedTrucks += countInSuggestion - 1;
      }
    });

    const afterTruckCount = Math.max(1, baselineTruckCount - reducedTrucks);
    const eliminated = Math.max(0, baselineTruckCount - afterTruckCount);

    // Derive average load from the same applied shipments, tolerant to string / numeric values
    const loadValues = appliedShipments
      .map((s) => {
        const raw: any = (s as any).load_factor;
        const v = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(v) ? v : null;
      })
      .filter((v): v is number => v !== null && v > 0);

    let baselineAvgLoadPct: number | null = null;
    let afterAvgLoadPct: number | null = null;

    if (loadValues.length > 0) {
      const avgLoad = loadValues.reduce((sum, v) => sum + v, 0) / loadValues.length;
      const afterAvgLoad = Math.min(1, avgLoad * (baselineTruckCount / afterTruckCount));
      baselineAvgLoadPct = avgLoad * 100;
      afterAvgLoadPct = afterAvgLoad * 100;
    }

    return {
      baselineTruckCount,
      afterTruckCount,
      eliminated,
      baselineAvgLoadPct,
      afterAvgLoadPct,
    };
  }, [shipments, suggestions]);

  const toggleSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, applied: !s.applied } : s));
  }, []);

  const applyAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, applied: true })));
    toast.success('All optimization suggestions applied');
  };

  return (
    <div className="space-y-6">
      <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight">Algorithmic Optimization</h1>
        <p className="text-muted-foreground text-sm">AI-driven routing and consolidation suggestions.</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Left: Engine + Stats */}
        <div className="md:col-span-1 space-y-4">
          <ChartCard title="Consolidation Engine">
            <div className="space-y-4 flex flex-col items-center justify-center text-center py-2">
              <motion.div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                <Settings className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold"><CountUp end={suggestions.length} duration={2} /></h3>
                <p className="text-muted-foreground text-sm">Suggestions generated</p>
              </div>
              <div className="w-full bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
                    <ArrowDown className="w-4 h-4 text-primary" />
                  </motion.div>
                  <p className="text-primary font-bold text-lg">
                    -<CountUp end={reductionPct} decimals={1} duration={2.5} />%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Projected Network Reduction</p>
                <AnimatedProgress value={reductionPct} max={100} color="#10B981" />
                <p className="text-xs text-muted-foreground">{totals.appliedCount} of {totals.totalCount} applied</p>
              </div>

              {/* Trade-off slider */}
              <div className="w-full space-y-2 px-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Optimization priority</Label>
                <Slider value={tradeoff} onValueChange={setTradeoff} min={0} max={100} step={5} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" /> Min Cost</span>
                  <span>Min CO₂</span>
                </div>
              </div>

              <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={applyAll}>
                  <Sparkles className="w-4 h-4 mr-2" /> Apply All Suggestions
                </Button>
              </motion.div>
            </div>
          </ChartCard>
        </div>

        {/* Right: Suggestions + Charts */}
        <div className="md:col-span-2 space-y-6">
          {/* Interactive Suggestion Cards */}
          <ChartCard title="Optimization Suggestions" description="Toggle or reorder suggestions. Drag to prioritize.">
          <Reorder.Group axis="y" values={suggestions} onReorder={setSuggestions} className="space-y-3 mt-2 max-h-[260px] overflow-y-auto pr-1" >
              {suggestions.map(sug => (
                <Reorder.Item key={sug.id} value={sug} className="list-none">
                  <OptimizationSuggestionCard
                    suggestion={sug}
                    shipments={shipments}
                    onToggle={toggleSuggestion}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </ChartCard>

          {/* Sankey-like flow comparison */}
          <ChartCard title="Current vs Optimized Flow" description="Emissions by transport mode — before and after applied suggestions.">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={flowData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any) => [`${Number(val).toFixed(0)} kg`, '']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="current" name="Current" fill="#111827" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={true} animationDuration={1200} animationBegin={200} animationEasing="ease-out" />
                <Bar dataKey="optimized" name="Optimized" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={true} animationDuration={1200} animationBegin={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Lane-level CO₂ savings */}
          <ChartCard
            title="Lane CO₂ Savings"
            description="Routes where applied optimizations deliver the highest emissions reduction."
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                layout="vertical"
                data={laneSavingsData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="lane"
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(val: any) => [`${Number(val).toFixed(0)} kg`, 'CO₂ savings']}
                />
                <Bar
                  dataKey="savings"
                  name="CO₂ savings"
                  fill="#16A34A"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationBegin={300}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Fleet-wide truck count reduction */}
          {fleetImpact && (
            <ChartCard
              title="Fleet Impact"
              description="Truck count and load factor improvement from applied consolidations."
            >
              <div className="flex flex-col items-center justify-center gap-4 text-sm pt-1">
                <div className="grid grid-cols-2 gap-8 items-center w-full max-w-md">
                  <div className="text-center">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      Trucks (Before)
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {fleetImpact.baselineTruckCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      Trucks (After)
                    </div>
                    <div className="mt-1 text-xl font-semibold text-emerald-600">
                      {fleetImpact.afterTruckCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {fleetImpact.baselineAvgLoadPct != null &&
                  fleetImpact.afterAvgLoadPct != null && (
                    <div className="grid grid-cols-2 gap-8 items-center w-full max-w-md">
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Avg Load (Before)
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {fleetImpact.baselineAvgLoadPct.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Avg Load (After)
                        </div>
                        <div className="mt-1 text-lg font-semibold text-emerald-600">
                          {fleetImpact.afterAvgLoadPct.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}

                <div className="text-xs font-semibold text-emerald-700 mt-1">
                  ↓ {fleetImpact.eliminated.toLocaleString()} trucks eliminated
                </div>
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}