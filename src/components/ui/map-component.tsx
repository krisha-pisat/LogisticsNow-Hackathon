'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LaneAggregation } from '@/lib/aggregation';
import { getCoordsTuple, getNearestCity } from '@/lib/cities';
import { Button } from '@/components/ui/button';
import { Zap, MapPin, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MapComponentProps {
  lanes: LaneAggregation[];
  selectedLaneId?: string | null;
  onLaneSelect?: (laneId: string) => void;
  originFilter?: string | null;
  destinationFilter?: string | null;
  onMapClick?: (lat: number, lng: number, city: string | null) => void;
  /** When OD is selected, these lanes are drawn as "alternate" routes (dashed, different color) */
  alternateLanes?: LaneAggregation[];
}

function getEmissionColor(emissions: number, minE: number, maxE: number): string {
  if (maxE <= minE) return '#10B981';
  const t = (emissions - minE) / (maxE - minE);
  if (t <= 0.25) return interpolateHex('#10B981', '#84CC16', t / 0.25);
  if (t <= 0.5) return interpolateHex('#84CC16', '#F59E0B', (t - 0.25) / 0.25);
  if (t <= 0.75) return interpolateHex('#F59E0B', '#EF4444', (t - 0.5) / 0.25);
  return interpolateHex('#EF4444', '#7F1D1D', (t - 0.75) / 0.25);
}

function interpolateHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function getLaneCoords(lane: LaneAggregation): { start: [number, number]; end: [number, number] } {
  const start: [number, number] = lane.origin_coords
    ? [lane.origin_coords.lat, lane.origin_coords.lng]
    : getCoordsTuple(lane.origin_city);
  const end: [number, number] = lane.destination_coords
    ? [lane.destination_coords.lat, lane.destination_coords.lng]
    : getCoordsTuple(lane.destination_city);
  return { start, end };
}

function getAlternativeLanes(
  lanes: LaneAggregation[],
  currentLane: LaneAggregation,
  limit = 6
): LaneAggregation[] {
  const sameOrigin = lanes.filter(
    (l) => l.origin_city === currentLane.origin_city && l.id !== currentLane.id
  );
  const sameDest = lanes.filter(
    (l) => l.destination_city === currentLane.destination_city && l.id !== currentLane.id
  );
  const combined = [...sameOrigin, ...sameDest].sort(
    (a, b) => a.total_emissions_kg - b.total_emissions_kg
  );
  const seen = new Set<string>();
  return combined.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  }).slice(0, limit);
}

function curvePoints(start: [number, number], end: [number, number], steps = 20): [number, number][] {
  const midLat = (start[0] + end[0]) / 2 + (end[1] - start[1]) * 0.08;
  const midLng = (start[1] + end[1]) / 2 - (end[0] - start[0]) * 0.08;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * midLat + t * t * end[0];
    const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLng + t * t * end[1];
    points.push([lat, lng]);
  }
  return points;
}

// Route line: fixed weight to avoid hover flicker; glow is non-interactive so click goes to main line
function RouteLine({
  start,
  end,
  color,
  weight,
  isSelected,
  isHovered,
  onHover,
  onSelect,
  dashed = false,
}: {
  start: [number, number];
  end: [number, number];
  color: string;
  weight: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onHover?: (v: boolean) => void;
  onSelect?: () => void;
  dashed?: boolean;
}) {
  const positions = useMemo(() => curvePoints(start, end), [start, end]);
  const showGlow = isSelected || isHovered;
  const opacity = isSelected ? 0.95 : isHovered ? 0.88 : 0.78;

  const handleClick = useCallback(
    (e: { originalEvent?: Event }) => {
      e.originalEvent?.stopPropagation();
      onSelect?.();
    },
    [onSelect]
  );

  return (
    <>
      {showGlow && (
        <Polyline
          positions={positions}
          pathOptions={{
            color,
            weight: weight + 10,
            opacity: 0.25,
            lineCap: 'round',
            lineJoin: 'round',
            // @ts-expect-error Leaflet PathOptions includes interactive
            interactive: false,
          }}
        />
      )}
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          opacity,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: dashed ? '8, 8' : undefined,
        }}
        eventHandlers={{
          mouseover: () => onHover?.(true),
          mouseout: () => onHover?.(false),
          click: handleClick,
        }}
      />
    </>
  );
}

function MapController({
  selectedLane,
  lanes,
  alternateLanes,
}: {
  selectedLane: string | null;
  lanes: LaneAggregation[];
  alternateLanes: LaneAggregation[];
}) {
  const map = useMap();
  useEffect(() => {
    const all = [...lanes, ...alternateLanes];
    if (all.length === 0) return;
    if (selectedLane) {
      const lane = lanes.find((l) => l.id === selectedLane) ?? alternateLanes.find((l) => l.id === selectedLane);
      if (lane) {
        const { start, end } = getLaneCoords(lane);
        const L = require('leaflet');
        map.flyToBounds(L.latLngBounds([start, end]), {
          padding: [60, 60],
          duration: 1,
          easeLinearity: 0.25,
        });
        return;
      }
    }
    const L = require('leaflet');
    const bounds = L.latLngBounds(
      all.flatMap((l) => {
        const { start, end } = getLaneCoords(l);
        return [start, end];
      })
    );
    map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, easeLinearity: 0.25 });
  }, [selectedLane, lanes, alternateLanes, map]);
  return null;
}

/** Floating route details panel (reliable, no Leaflet popup) */
function RouteDetailsPanel({
  lane,
  allLanes,
  onSelectLane,
  onClose,
}: {
  lane: LaneAggregation;
  allLanes: LaneAggregation[];
  onSelectLane: (id: string) => void;
  onClose: () => void;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const alternatives = useMemo(() => getAlternativeLanes(allLanes, lane), [allLanes, lane]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="absolute top-4 right-4 z-[1000] w-[300px] rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {lane.origin_city} → {lane.destination_city}
            </p>
            <p className="text-xs text-muted-foreground">
              {(lane.total_emissions_kg / 1000).toFixed(2)} t CO₂ · {lane.shipment_count} trips
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">CO₂ emissions</span>
          <span className="font-medium text-destructive">{(lane.total_emissions_kg / 1000).toFixed(2)} t</span>
          <span className="text-muted-foreground">Avg load</span>
          <span className="font-medium">{(lane.avg_load_factor * 100).toFixed(0)}%</span>
        </div>
        <Button
          size="sm"
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setShowAlternatives((v) => !v)}
        >
          <Zap className="w-3.5 h-3.5" />
          {showAlternatives ? 'Hide alternatives' : 'Show lower-emission routes'}
        </Button>
        <AnimatePresence>
          {showAlternatives && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-muted-foreground mt-2 mb-1.5">Alternate corridors:</p>
              <ul className="space-y-1">
                {alternatives.length === 0 ? (
                  <li className="text-xs text-muted-foreground italic">None in dataset.</li>
                ) : (
                  alternatives.map((alt) => (
                    <li
                      key={alt.id}
                      className="flex items-center justify-between gap-2 text-xs py-1 pr-1 rounded hover:bg-muted/80"
                    >
                      <span className="truncate">
                        {alt.origin_city} → {alt.destination_city}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {(alt.total_emissions_kg / 1000).toFixed(1)}t
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-primary shrink-0"
                        onClick={() => onSelectLane(alt.id)}
                      >
                        View
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function MapComponent({
  lanes,
  selectedLaneId,
  onLaneSelect,
  originFilter,
  destinationFilter,
  onMapClick,
  alternateLanes = [],
}: MapComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredLane, setHoveredLane] = useState<string | null>(null);

  const filteredLanes = useMemo(() => {
    let list = lanes;
    if (originFilter) list = list.filter((l) => l.origin_city === originFilter);
    if (destinationFilter) list = list.filter((l) => l.destination_city === destinationFilter);
    return list;
  }, [lanes, originFilter, destinationFilter]);

  const primarySet = useMemo(() => new Set(filteredLanes.map((l) => l.id)), [filteredLanes]);
  const alternateSet = useMemo(() => new Set(alternateLanes.map((l) => l.id)), [alternateLanes]);

  const { minE, maxE } = useMemo(() => {
    const all = [...filteredLanes];
    if (all.length === 0) return { minE: 0, maxE: 1 };
    const vals = all.map((l) => l.total_emissions_kg);
    return { minE: Math.min(...vals), maxE: Math.max(...vals) };
  }, [filteredLanes]);

  useEffect(() => {
    setMounted(true);
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const handleMapClick = useCallback(
    (e: { latlng: { lat: number; lng: number } }) => {
      const city = getNearestCity(e.latlng.lat, e.latlng.lng);
      onMapClick?.(e.latlng.lat, e.latlng.lng, city);
    },
    [onMapClick]
  );

  if (!mounted) {
    return (
      <div className="w-full h-[520px] rounded-xl overflow-hidden bg-muted/40 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading map…</span>
      </div>
    );
  }

  const selectedLane = selectedLaneId
    ? filteredLanes.find((l) => l.id === selectedLaneId) ?? alternateLanes.find((l) => l.id === selectedLaneId)
    : null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Horizon-style search bar above map */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-lg bg-white/95 shadow-sm border border-gray-200/80 px-3 py-2 min-w-[180px]">
        <Search className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-xs text-gray-500">Route emissions</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Low" />
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Medium" />
        <span className="w-2 h-2 rounded-full bg-red-700 shrink-0" title="High" />
      </div>

      {/* Floating route details panel - shows when a route is selected */}
      <AnimatePresence>
        {selectedLane && (
          <RouteDetailsPanel
            lane={selectedLane}
            allLanes={lanes}
            onSelectLane={(id) => onLaneSelect?.(id)}
            onClose={() => onLaneSelect?.('')}
          />
        )}
      </AnimatePresence>

      {mounted && (
        <MapContainer
          center={[39.5, 32.5]}
          zoom={5}
          style={{ height: '520px', width: '100%', borderRadius: '0.75rem' }}
          scrollWheelZoom={true}
          className="z-0"
          eventHandlers={onMapClick ? { click: handleMapClick } : undefined}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          />

          <MapController
            selectedLane={selectedLaneId || null}
            lanes={filteredLanes}
            alternateLanes={alternateLanes}
          />

          {/* Alternate routes first (dashed, blue) so primary draws on top */}
          {alternateLanes.map((lane) => {
            const { start, end } = getLaneCoords(lane);
            const isSelected = selectedLaneId === lane.id;
            const isHovered = hoveredLane === lane.id;
            return (
              <div key={`alt-${lane.id}`}>
                <RouteLine
                  start={start}
                  end={end}
                  color="#3B82F6"
                  weight={3}
                  dashed={true}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onHover={(v) => setHoveredLane(v ? lane.id : null)}
                  onSelect={() => onLaneSelect?.(lane.id)}
                />
              </div>
            );
          })}

          {/* Primary routes (emission-colored, solid) */}
          {filteredLanes.map((lane, index) => {
            const { start, end } = getLaneCoords(lane);
            const weight = Math.max(4, Math.min(14, 3 + lane.total_emissions_kg / 3500));
            const color = getEmissionColor(lane.total_emissions_kg, minE, maxE);
            const isSelected = selectedLaneId === lane.id;
            const isHovered = hoveredLane === lane.id;
            return (
              <div key={lane.id}>
                <RouteLine
                  start={start}
                  end={end}
                  color={color}
                  weight={weight}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onHover={(v) => setHoveredLane(v ? lane.id : null)}
                  onSelect={() => onLaneSelect?.(lane.id)}
                />
                <CircleMarker
                  center={start}
                  radius={6}
                  pathOptions={{
                    fillColor: color,
                    color: '#fff',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
                <CircleMarker
                  center={end}
                  radius={6}
                  pathOptions={{
                    fillColor: color,
                    color: '#fff',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              </div>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
