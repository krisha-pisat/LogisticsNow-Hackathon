'use client';

import { useShipments } from '@/hooks/useShipments';
import { aggregateByLane } from '@/lib/aggregation';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable } from '@/components/ui/data-table';
import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHART_TOOLTIP_STYLE } from '@/components/motion';
import { AlertTriangle, ExternalLink, MapPin, X, Route, Search, TrendingUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MapComponent = dynamic(() => import('@/components/ui/map-component'), { ssr: false });

/** Return lane IDs that share origin or destination with filtered OD, lower emissions first */
function getAlternateLanesForOD(
  allLanes: { id: string; origin_city: string; destination_city: string; total_emissions_kg: number }[],
  originFilter: string,
  destinationFilter: string,
  primaryLaneIds: Set<string>,
  limit = 10
): string[] {
  const sameOrigin = allLanes.filter(
    (l) => l.origin_city === originFilter && !primaryLaneIds.has(l.id)
  );
  const sameDest = allLanes.filter(
    (l) => l.destination_city === destinationFilter && !primaryLaneIds.has(l.id)
  );
  const combined = [...sameOrigin, ...sameDest].sort(
    (a, b) => a.total_emissions_kg - b.total_emissions_kg
  );
  const seen = new Set<string>();
  return combined.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  }).slice(0, limit).map((l) => l.id);
}

export default function LaneAnalysisPage() {
  const { shipments } = useShipments();
  const router = useRouter();
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState<string | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);
  const [lastClickedCity, setLastClickedCity] = useState<string | null>(null);

  const lanes = useMemo(() => {
    return aggregateByLane(shipments).sort(
      (a, b) => b.total_emissions_kg - a.total_emissions_kg
    );
  }, [shipments]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    lanes.forEach((l) => {
      set.add(l.origin_city);
      set.add(l.destination_city);
    });
    return Array.from(set).sort();
  }, [lanes]);

  const filteredLanes = useMemo(() => {
    let list = lanes;
    if (originFilter) list = list.filter((l) => l.origin_city === originFilter);
    if (destinationFilter)
      list = list.filter((l) => l.destination_city === destinationFilter);
    return list;
  }, [lanes, originFilter, destinationFilter]);

  const primaryLaneIds = useMemo(() => new Set(filteredLanes.map((l) => l.id)), [filteredLanes]);

  const alternateLaneIdList = useMemo(() => {
    if (!originFilter || !destinationFilter) return [];
    return getAlternateLanesForOD(
      lanes,
      originFilter,
      destinationFilter,
      primaryLaneIds,
      10
    );
  }, [lanes, originFilter, destinationFilter, primaryLaneIds]);

  const alternateLanes = useMemo(
    () => alternateLaneIdList.map((id) => lanes.find((l) => l.id === id)).filter(Boolean) as typeof lanes,
    [lanes, alternateLaneIdList]
  );

  const alternateLaneIds = useMemo(() => new Set(alternateLaneIdList), [alternateLaneIdList]);

  const bestRoutesBetweenOD = useMemo(() => {
    if (!originFilter || !destinationFilter) return filteredLanes;
    return [...filteredLanes].sort((a, b) => a.total_emissions_kg - b.total_emissions_kg);
  }, [filteredLanes, originFilter, destinationFilter]);

  const topLanes = filteredLanes.slice(0, 10);
  const worstLane = filteredLanes[0];
  const hasODFilter = Boolean(originFilter && destinationFilter);

  const kpis = useMemo(() => {
    const totalCO2 = filteredLanes.reduce((s, l) => s + l.total_emissions_kg, 0);
    const avgLoad = filteredLanes.length
      ? filteredLanes.reduce((s, l) => s + l.avg_load_factor, 0) / filteredLanes.length
      : 0;
    return {
      totalLanes: filteredLanes.length,
      totalCO2t: totalCO2 / 1000,
      worstCO2t: worstLane ? worstLane.total_emissions_kg / 1000 : 0,
      avgLoadPct: avgLoad * 100,
    };
  }, [filteredLanes, worstLane]);

  const handleLaneSelect = useCallback(
    (id: string) => {
      setSelectedLane(id && id !== selectedLane ? id : null);
    },
    [selectedLane]
  );

  const handleMapClick = useCallback((_lat: number, _lng: number, city: string | null) => {
    setLastClickedCity(city);
  }, []);

  const setOriginFromClick = useCallback(() => {
    if (lastClickedCity) {
      setOriginFilter(lastClickedCity);
      setLastClickedCity(null);
    }
  }, [lastClickedCity]);

  const setDestinationFromClick = useCallback(() => {
    if (lastClickedCity) {
      setDestinationFilter(lastClickedCity);
      setLastClickedCity(null);
    }
  }, [lastClickedCity]);

  const clearODFilter = useCallback(() => {
    setOriginFilter(null);
    setDestinationFilter(null);
    setLastClickedCity(null);
  }, []);

  const columns = [
    { key: 'origin_city', title: 'Origin' },
    { key: 'destination_city', title: 'Destination' },
    { key: 'shipment_count', title: 'Trips', align: 'right' as const },
    {
      key: 'avg_load_factor',
      title: 'Avg Load (%)',
      align: 'right' as const,
      render: (r: any) => (
        <span className={r.avg_load_factor < 0.5 ? 'text-red-600' : ''}>
          {(r.avg_load_factor * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'total_emissions_kg',
      title: 'Total CO₂ (kg)',
      align: 'right' as const,
      render: (row: any) => (
        <span className="font-semibold text-amber-600">
          {row.total_emissions_kg.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'center' as const,
      render: (row: any) => (
        <button
          onClick={() =>
            router.push(`/emissions?region=${encodeURIComponent(row.origin_city)}`)
          }
          className="text-primary hover:underline text-xs flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> View
        </button>
      ),
    },
  ];

  const highestEmissionLanesStyle = { width: '100%', height: '300px' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lane Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Corridors by emissions. Click a route on the map for details.
          </p>
        </div>
      </motion.div>

      {/* Bento row 1: KPI cards + Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">Total lanes</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{kpis.totalLanes}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Total CO₂</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-600">{kpis.totalCO2t.toFixed(1)} t</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Worst lane</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.worstCO2t.toFixed(1)} t</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="text-xs font-medium text-muted-foreground">Avg load</div>
          <p className="mt-1 text-2xl font-bold text-primary">{kpis.avgLoadPct.toFixed(0)}%</p>
        </motion.div>
        {/* Filter card - Horizon style */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="col-span-2 lg:col-span-1 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={originFilter ?? 'all'} onValueChange={(v) => setOriginFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                {uniqueCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destinationFilter ?? 'all'} onValueChange={(v) => setDestinationFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                <SelectValue placeholder="Dest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dest.</SelectItem>
                {uniqueCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(originFilter || destinationFilter) && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearODFilter}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {lastClickedCity && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">{lastClickedCity}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={setOriginFromClick}>Origin</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={setDestinationFromClick}>Dest</Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Worst lane + Best route alerts */}
      {worstLane && !hasODFilter && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-red-800 dark:text-red-200">
                Highest emissions: {worstLane.origin_city} → {worstLane.destination_city}
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                {worstLane.shipment_count} trips · {(worstLane.total_emissions_kg / 1000).toFixed(1)}t CO₂
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => router.push(`/emissions?region=${encodeURIComponent(worstLane.origin_city)}`)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {hasODFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-primary/10 border border-primary/20 p-3"
          >
            <p className="text-sm font-semibold text-primary">
              {bestRoutesBetweenOD.length === 0
                ? `No direct lane: ${originFilter} → ${destinationFilter}.`
                : `Best route(s) ${originFilter} → ${destinationFilter}. Alternates in blue on map.`}
            </p>
            {bestRoutesBetweenOD.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {bestRoutesBetweenOD.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.origin_city} → {l.destination_city}</span>
                    <span className="font-medium text-foreground">{(l.total_emissions_kg / 1000).toFixed(2)} t CO₂</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento row 2: Map (large) + Active lanes sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">Live corridor map</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click a route for details. Green = lower emissions, red = higher.</p>
          </div>
          <div className="relative">
            <MapComponent
              lanes={lanes}
              selectedLaneId={selectedLane}
              onLaneSelect={handleLaneSelect}
              originFilter={originFilter}
              destinationFilter={destinationFilter}
              onMapClick={handleMapClick}
              alternateLanes={alternateLanes}
            />
          </div>
        </motion.div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex-1 flex flex-col min-h-0"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                {hasODFilter ? 'Selected & alternate lanes' : 'Top lanes by CO₂'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              {(hasODFilter ? [...filteredLanes, ...alternateLanes] : topLanes).slice(0, 14).map((lane) => {
                const isAlternate = alternateLaneIds.has(lane.id);
                const isSelected = selectedLane === lane.id;
                return (
                  <button
                    key={lane.id}
                    type="button"
                    onClick={() => handleLaneSelect(isSelected ? '' : lane.id)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/15 border-l-2 border-l-primary' : ''}`}
                  >
                    <span className="text-xs font-medium truncate">{lane.origin_city} → {lane.destination_city}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(lane.total_emissions_kg / 1000).toFixed(1)}t</span>
                    {isAlternate && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Alt</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedLane && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-primary/10 border border-primary/20 p-3"
              >
                <p className="text-xs font-medium text-primary mb-1">Selected route</p>
                <p className="text-sm font-semibold truncate">{selectedLane.replace(/-/g, ' → ')}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/emissions?region=${encodeURIComponent(selectedLane.split('-')[0])}`)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Emissions
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedLane(null)}>Clear</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bento row 3: Full-width table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm">Lane data table</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Filter by origin/destination above.</p>
        </div>
        <DataTable
          columns={columns}
          data={filteredLanes}
          keyField="id"
          className="border-none shadow-none max-h-[280px] overflow-y-auto w-full"
        />
      </motion.div>
    </div>
  );
}
