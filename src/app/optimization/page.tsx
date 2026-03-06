'use client';

import { useShipments } from '@/hooks/useShipments';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useMemo, useState, useCallback } from 'react';
import { Settings, CheckCircle2, ArrowDown, Sparkles, GripVertical, Package, Train, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import CountUp from 'react-countup';
import { AnimatedProgress, CHART_TOOLTIP_STYLE, StaggerContainer, StaggerItem } from '@/components/motion';
import { generateOptimizationSuggestions, calculateSuggestionTotals, generateSankeyData } from '@/lib/optimization';
import { calculateShipmentCO2 } from '@/lib/emissions';
import { OptimizationSuggestion } from '@/types';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  consolidation: <Package className="w-4 h-4" />,
  mode_switch: <Train className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-brand-red/30 bg-brand-red/5',
  medium: 'border-brand-orange/30 bg-brand-orange/5',
  low: 'border-border bg-card',
};

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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Engine + Stats */}
        <div className="md:col-span-1 space-y-4">
          <ChartCard title="Consolidation Engine">
            <div className="space-y-6 flex flex-col items-center justify-center text-center h-full pt-8">
              <motion.div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                <Settings className="w-10 h-10 text-primary" />
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
            <Reorder.Group axis="y" values={suggestions} onReorder={setSuggestions} className="space-y-3 mt-2 max-h-[400px] overflow-y-auto pr-1">
              {suggestions.map(sug => (
                <Reorder.Item key={sug.id} value={sug} className="list-none">
                  <motion.div
                    className={`border rounded-lg p-3 flex items-start gap-3 cursor-grab active:cursor-grabbing transition-colors ${sug.applied ? 'bg-primary/5 border-primary/30' : PRIORITY_COLORS[sug.priority]}`}
                    whileHover={{ scale: 1.01 }}
                    layout
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary">{SUGGESTION_ICONS[sug.type]}</span>
                        <p className="text-sm font-semibold truncate">{sug.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{sug.description}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-primary font-medium">-{sug.co2_savings_kg.toFixed(0)} kg CO₂</span>
                        <span className="text-muted-foreground">-${sug.cost_savings_usd.toFixed(0)}</span>
                        <span className="text-muted-foreground">{sug.shipmentIds.length} shipments</span>
                      </div>
                    </div>
                    <Button
                      size="sm" variant={sug.applied ? "default" : "outline"}
                      className={`shrink-0 text-xs ${sug.applied ? 'bg-primary text-white' : ''}`}
                      onClick={() => toggleSuggestion(sug.id)}
                    >
                      {sug.applied ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Applied</> : 'Apply'}
                    </Button>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </ChartCard>

          {/* Sankey-like flow comparison */}
          <ChartCard title="Current vs Optimized Flow" description="Emissions by transport mode — before and after applied suggestions.">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any) => [`${Number(val).toFixed(0)} kg`, '']} />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#111827" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={true} animationDuration={1200} animationBegin={200} animationEasing="ease-out" />
                <Bar dataKey="optimized" name="Optimized" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={true} animationDuration={1200} animationBegin={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
