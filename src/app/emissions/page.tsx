'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateShipmentCO2, getShipmentMetric, getMetricLabel, getMetricUnit, DEFAULT_EMISSION_FACTORS, setEmissionFactors, resetEmissionFactors } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { useMemo, useState, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { CHART_TOOLTIP_STYLE } from '@/components/motion';
import { useFiltersStore } from '@/store/useFiltersStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
  ChevronDown, ChevronUp, Upload, Beaker, RotateCcw, SlidersHorizontal, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function EmissionsPage() {
  const { shipments } = useShipments();
  const router = useRouter();
  const { metricMode, addSelectedShipmentIds } = useFiltersStore();
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFactors, setShowFactors] = useState(false);
  const [factorMultiplier, setFactorMultiplier] = useState([100]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 10;

  // Apply factor adjustment
  const effectiveFactor = factorMultiplier[0] / 100;
  useMemo(() => {
    if (factorMultiplier[0] === 100) {
      resetEmissionFactors();
    } else {
      const adjusted: Record<string, Record<string, number>> = {};
      for (const [vType, fuels] of Object.entries(DEFAULT_EMISSION_FACTORS)) {
        adjusted[vType] = {};
        for (const [fType, factor] of Object.entries(fuels)) {
          adjusted[vType][fType] = factor * effectiveFactor;
        }
      }
      setEmissionFactors(adjusted);
    }
  }, [factorMultiplier, effectiveFactor]);

  const { tableData, barData, scatterData } = useMemo(() => {
    const list = shipments.map(s => ({
      ...s,
      metric: getShipmentMetric(s, metricMode),
    })).sort((a, b) => b.metric - a.metric);

    const vMap = new Map<string, number>();
    list.forEach(item => {
      vMap.set(item.vehicle_type, (vMap.get(item.vehicle_type) || 0) + item.metric);
    });
    const bar = Array.from(vMap.entries()).map(([name, metric]) => ({ name, metric }));

    const scatter = list.slice(0, 100).map(item => ({
      x: item.distance_km,
      y: item.metric,
      z: item.weight_kg,
      name: item.shipment_id,
      vehicle: item.vehicle_type
    }));

    return { tableData: list, barData: bar, scatterData: scatter };
  }, [shipments, metricMode, factorMultiplier]);

  const paginatedData = tableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const label = getMetricLabel(metricMode);
  const unit = getMetricUnit(metricMode);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Invalid file type', { description: 'Please upload a .csv file.' });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('CSV Parse Error', { description: results.errors[0].message });
          return;
        }
        const requiredFields = ['origin_city', 'destination_city', 'vehicle_type', 'weight_kg', 'distance_km'];
        const headers = results.meta.fields || [];
        const missing = requiredFields.filter(f => !headers.includes(f));
        if (missing.length > 0) {
          toast.error('Missing required columns', { description: `Missing: ${missing.join(', ')}` });
          return;
        }
        toast.success('CSV Imported', { description: `${results.data.length} records parsed. (Preview mode — data shown in console)` });
        console.log('%c[CSV Import]', 'color:#10B981;font-weight:bold', results.data);
      },
      error: (err) => {
        toast.error('Failed to parse CSV', { description: err.message });
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const sendToSimulation = () => {
    if (selectedIds.size === 0) {
      toast.warning('No shipments selected', { description: 'Select rows first.' });
      return;
    }
    addSelectedShipmentIds(Array.from(selectedIds));
    toast.success(`${selectedIds.size} shipments queued for simulation`);
    router.push('/simulation');
  };

  return (
    <div className="space-y-6">
      <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emissions Ledger</h1>
          <p className="text-muted-foreground text-sm">Detailed breakdown of {label.toLowerCase()} per shipment.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFactors(!showFactors)}>
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> Factors
          </Button>
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={sendToSimulation} className="bg-primary text-white">
              <Beaker className="w-3.5 h-3.5 mr-1.5" /> Simulate ({selectedIds.size})
            </Button>
          )}
        </div>
      </motion.div>

      {/* Emission Factor Slider */}
      <AnimatePresence>
        {showFactors && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-card border rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Emission Factor Multiplier</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm font-bold text-primary">{factorMultiplier[0]}%</span>
                <Button variant="ghost" size="sm" onClick={() => setFactorMultiplier([100])}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>
            </div>
            <Slider value={factorMultiplier} onValueChange={setFactorMultiplier} min={50} max={200} step={5} />
            <p className="text-xs text-muted-foreground">Adjusts all emission factors proportionally. 100% = default values.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title={`${label} by Vehicle Type`} description={`Total ${label.toLowerCase()} split by transportation mode.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(val: any) => [`${Number(val).toFixed(0)} ${unit}`, label]} />
              <Bar dataKey="metric" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive={true} animationDuration={1200} animationBegin={200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Distance vs ${label}`} description="Scatter analysis of haul lengths vs output (Top 100).">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" dataKey="x" name="Distance" unit="km" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="y" name={label} unit={unit.split(' ').pop()} stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <ZAxis type="number" dataKey="z" range={[20, 200]} name="Weight" unit="kg" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={CHART_TOOLTIP_STYLE} />
              <Scatter name="Shipments" data={scatterData} fill="#EF4444" fillOpacity={0.6} stroke="#EF4444" strokeWidth={1} isAnimationActive={true} animationDuration={800} animationBegin={400} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Shipment Table with Expandable Rows */}
      <ChartCard title="Shipment Log" className="border-none shadow-none bg-transparent">
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <input type="checkbox" className="rounded" onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(paginatedData.map(r => r.shipment_id)));
                      else setSelectedIds(new Set());
                    }} checked={paginatedData.length > 0 && paginatedData.every(r => selectedIds.has(r.shipment_id))} />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Origin</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Destination</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Mode</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Distance</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{label}</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {paginatedData.map((row, index) => (
                    <motion.tr key={row.shipment_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}
                      className="border-t hover:bg-primary/[0.03] transition-colors">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" className="rounded" checked={selectedIds.has(row.shipment_id)} onChange={() => toggleSelect(row.shipment_id)} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{row.shipment_id}</td>
                      <td className="px-3 py-2.5">{row.origin_city}</td>
                      <td className="px-3 py-2.5">{row.destination_city}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="bg-muted font-normal text-muted-foreground text-xs">{row.vehicle_type}</Badge></td>
                      <td className="px-3 py-2.5 text-right">{row.distance_km.toLocaleString()} km</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-brand-orange">{metricMode === 'cost' ? `$${row.metric.toFixed(0)}` : `${row.metric.toFixed(1)}`}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setExpandedRow(expandedRow === row.shipment_id ? null : row.shipment_id)} className="text-muted-foreground hover:text-foreground">
                          {expandedRow === row.shipment_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {/* Expandable detail row */}
                {expandedRow && paginatedData.find(r => r.shipment_id === expandedRow) && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-muted/30 p-4 border-t">
                        {(() => {
                          const row = paginatedData.find(r => r.shipment_id === expandedRow)!;
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Fuel Type</p>
                                <p className="font-medium">{row.fuel_type}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Weight</p>
                                <p className="font-medium">{row.weight_kg.toLocaleString()} kg</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Load Factor</p>
                                <p className={`font-medium ${row.load_factor < 0.5 ? 'text-brand-red' : 'text-primary'}`}>{(row.load_factor * 100).toFixed(0)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Urgency</p>
                                <p className="font-medium">{row.urgency_level}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Route</p>
                                <p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {row.origin_city} → {row.destination_city}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Date</p>
                                <p className="font-medium">{new Date(row.shipment_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">CO₂</p>
                                <p className="font-medium">{calculateShipmentCO2(row).toFixed(1)} kg</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Coords</p>
                                <p className="font-medium text-xs">{row.origin_coords.lat.toFixed(2)},{row.origin_coords.lng.toFixed(2)} → {row.destination_coords.lat.toFixed(2)},{row.destination_coords.lng.toFixed(2)}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <motion.button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm px-4 py-2 bg-card border rounded-md disabled:opacity-50 transition-all duration-200 hover:shadow-sm" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Previous</motion.button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(tableData.length / PAGE_SIZE)}</span>
          <motion.button disabled={page >= Math.ceil(tableData.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)} className="text-sm px-4 py-2 bg-card border rounded-md disabled:opacity-50 transition-all duration-200 hover:shadow-sm" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Next</motion.button>
        </div>
      </ChartCard>
    </div>
  );
}
