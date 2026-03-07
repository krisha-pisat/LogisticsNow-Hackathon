import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Package, Train, Clock, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OptimizationSuggestion, Shipment } from '@/types';
import { calculateShipmentCO2 } from '@/lib/emissions';

const SUGGESTION_ICONS: Record<OptimizationSuggestion['type'], React.ReactNode> = {
  consolidation: <Package className="w-4 h-4" />,
  mode_switch: <Train className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
};

const PRIORITY_COLORS: Record<OptimizationSuggestion['priority'], string> = {
  high: 'border-brand-red/30 bg-brand-red/5',
  medium: 'border-brand-orange/30 bg-brand-orange/5',
  low: 'border-border bg-card',
};

interface OptimizationSuggestionCardProps {
  suggestion: OptimizationSuggestion;
  shipments: Shipment[];
  onToggle: (id: string) => void;
}

export function OptimizationSuggestionCard({
  suggestion,
  shipments,
  onToggle,
}: OptimizationSuggestionCardProps) {
  const involvedShipments = useMemo(
    () =>
      suggestion.shipmentIds
        .map((id) => shipments.find((s) => s.shipment_id === id))
        .filter((s): s is Shipment => Boolean(s)),
    [shipments, suggestion.shipmentIds]
  );

  const beforeAfterStats = useMemo(() => {
    if (involvedShipments.length === 0) return null;

    const baselineCO2 = involvedShipments.reduce(
      (sum, s) => sum + calculateShipmentCO2(s),
      0
    );
    const afterCO2 = Math.max(0, baselineCO2 - suggestion.co2_savings_kg);

    const loadValues = involvedShipments
      .map((s) => s.load_factor)
      .filter((v): v is number => typeof v === 'number');

    let beforeAvgLoadPct: number | null = null;
    let afterLoadPct: number | null = null;

    if (loadValues.length > 0 && suggestion.type === 'consolidation') {
      const avgLoad = loadValues.reduce((a, b) => a + b, 0) / loadValues.length;
      const combinedLoad = Math.min(1, avgLoad * loadValues.length);
      beforeAvgLoadPct = avgLoad * 100;
      afterLoadPct = combinedLoad * 100;
    }

    const beforeTruckCount =
      suggestion.type === 'consolidation' ? involvedShipments.length : null;
    const afterTruckCount =
      suggestion.type === 'consolidation' && involvedShipments.length > 0 ? 1 : null;

    return {
      baselineCO2,
      afterCO2,
      beforeTruckCount,
      afterTruckCount,
      beforeAvgLoadPct,
      afterLoadPct,
    };
  }, [involvedShipments, suggestion.co2_savings_kg, suggestion.type]);

  return (
    <motion.div
      className={`border rounded-lg p-3 flex items-start gap-3 cursor-grab active:cursor-grabbing transition-colors ${
        suggestion.applied ? 'bg-primary/5 border-primary/30' : PRIORITY_COLORS[suggestion.priority]
      }`}
      whileHover={{ scale: 1.01 }}
      layout
    >
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary">{SUGGESTION_ICONS[suggestion.type]}</span>
          <p className="text-sm font-semibold truncate">{suggestion.title}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
        <div className="flex gap-3 text-xs">
          <span className="text-primary font-medium">
            -{suggestion.co2_savings_kg.toFixed(0)} kg CO₂
          </span>
          <span className="text-muted-foreground">
            -${suggestion.cost_savings_usd.toFixed(0)}
          </span>
          <span className="text-muted-foreground">{suggestion.shipmentIds.length} shipments</span>
        </div>

        {involvedShipments.length > 0 && (
          <div className="text-xs mt-2 text-muted-foreground">
            Shipments involved:
            <div className="mt-1 space-y-0.5">
              {involvedShipments.map((s) => {
                const loadPct =
                  typeof s.load_factor === 'number'
                    ? `${(s.load_factor * 100).toFixed(0)}%`
                    : null;

                return (
                  <div key={s.shipment_id} className="flex items-center gap-1.5">
                    <span>•</span>
                    <span className="truncate">
                      {s.shipment_id}
                      <span className="text-muted-foreground/80">
                        {typeof s.weight_kg === 'number' &&
                          ` | ${s.weight_kg.toLocaleString()} kg`}
                        {loadPct && ` | Load ${loadPct}`}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {beforeAfterStats && (
          <div className="mt-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-[11px]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-muted-foreground">Before → After</span>
              <span className="text-[10px] font-semibold text-primary">Impact</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
              {beforeAfterStats.beforeTruckCount !== null &&
                beforeAfterStats.afterTruckCount !== null && (
                  <div>
                    <div className="text-[10px] text-muted-foreground">Truck Count</div>
                    <div className="text-xs font-semibold">
                      {beforeAfterStats.beforeTruckCount} → {beforeAfterStats.afterTruckCount}
                    </div>
                  </div>
                )}

              {beforeAfterStats.beforeAvgLoadPct !== null &&
                beforeAfterStats.afterLoadPct !== null && (
                  <div>
                    <div className="text-[10px] text-muted-foreground">Average Load</div>
                    <div className="text-xs font-semibold">
                      {beforeAfterStats.beforeAvgLoadPct.toFixed(0)}% →{' '}
                      {beforeAfterStats.afterLoadPct.toFixed(0)}%
                    </div>
                  </div>
                )}

              <div>
                <div className="text-[10px] text-muted-foreground">CO₂</div>
                <div className="text-xs font-semibold">
                  {beforeAfterStats.baselineCO2.toFixed(0)}kg →{' '}
                  {beforeAfterStats.afterCO2.toFixed(0)}kg
                </div>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              CO₂ reduced:{' '}
              <span className="font-semibold text-primary">
                {suggestion.co2_savings_kg.toFixed(0)} kg
              </span>{' '}
              · Cost reduced:{' '}
              <span className="font-semibold">${suggestion.cost_savings_usd.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={suggestion.applied ? 'default' : 'outline'}
        className={`shrink-0 text-xs ${suggestion.applied ? 'bg-primary text-white' : ''}`}
        onClick={() => onToggle(suggestion.id)}
      >
        {suggestion.applied ? (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Applied
          </>
        ) : (
          'Apply'
        )}
      </Button>
    </motion.div>
  );
}

