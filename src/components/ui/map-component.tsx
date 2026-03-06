'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LaneAggregation } from '@/lib/aggregation';

interface MapComponentProps {
  lanes: LaneAggregation[];
  selectedLaneId?: string | null;
  onLaneSelect?: (laneId: string) => void;
}

// City coordinates mapping
const CITY_COORDS: Record<string, [number, number]> = {
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Houston': [29.7604, -95.3698],
  'Phoenix': [33.4484, -112.0740],
};

function getCoords(city: string): [number, number] {
  return CITY_COORDS[city] || [39.8283, -98.5795];
}

// Color based on emissions level
function getEmissionColor(emissions: number): string {
  if (emissions > 50000) return '#EF4444';
  if (emissions > 20000) return '#F59E0B';
  return '#10B981';
}

// ─── Animated Route Line: draws progressively using rAF ───
function AnimatedRoute({
  start, end, color, weight, delay = 0, isSelected, onHover, onSelect
}: {
  start: [number, number]; end: [number, number]; color: string; weight: number;
  delay?: number; isSelected?: boolean; onHover?: (hovering: boolean) => void; onSelect?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const duration = 1500; // 1.5s draw duration
        const p = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - p, 3);
        setProgress(eased);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [delay]);

  // Generate intermediate points for the progressive draw
  const positions = useMemo(() => {
    if (progress <= 0) return [];
    const steps = 20;
    const numPoints = Math.max(2, Math.ceil(steps * progress));
    const points: [number, number][] = [];

    // Add slight curve using Bezier midpoint
    const midLat = (start[0] + end[0]) / 2 + (end[1] - start[1]) * 0.1;
    const midLng = (start[1] + end[1]) / 2 - (end[0] - start[0]) * 0.1;

    for (let i = 0; i < numPoints; i++) {
      const t = i / (steps - 1);
      // Quadratic Bezier interpolation for curved routes
      const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * midLat + t * t * end[0];
      const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLng + t * t * end[1];
      points.push([lat, lng]);
    }
    return points;
  }, [progress, start, end]);

  const handleMouseOver = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);

  const handleMouseOut = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  if (positions.length < 2) return null;

  return (
    <>
      {/* Glow layer for selected/hovered routes */}
      {(isSelected || isHovered) && (
        <Polyline
          positions={positions}
          pathOptions={{
            color,
            weight: weight + 8,
            opacity: 0.15,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}
      {/* Main route line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight: isSelected || isHovered ? weight + 2 : weight,
          opacity: isSelected ? 0.9 : isHovered ? 0.8 : 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
        eventHandlers={{
          mouseover: handleMouseOver,
          mouseout: handleMouseOut,
          click: onSelect,
        }}
      />
    </>
  );
}

// ─── Vehicle marker that moves along the route using rAF ───
function VehicleMarker({ start, end, color }: { start: [number, number]; end: [number, number]; color: string }) {
  const [pos, setPos] = useState<[number, number]>(start);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 4000 + Math.random() * 4000;
    let animationId: number;

    // Bezier midpoint for curved path
    const midLat = (start[0] + end[0]) / 2 + (end[1] - start[1]) * 0.1;
    const midLng = (start[1] + end[1]) / 2 - (end[0] - start[0]) * 0.1;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      let progress = (timestamp - startTimestamp) / duration;

      if (progress >= 1) {
        progress = 0;
        startTimestamp = timestamp;
      }

      // Move along quadratic Bezier curve
      const t = progress;
      const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * midLat + t * t * end[0];
      const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLng + t * t * end[1];
      setPos([lat, lng]);

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [start, end]);

  return (
    <>
      {/* Pulse ring around vehicle */}
      <CircleMarker
        center={pos}
        radius={8}
        pathOptions={{
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.15,
          weight: 0,
        }}
        className="marker-pulse-ring"
      />
      {/* Vehicle dot */}
      <CircleMarker
        center={pos}
        radius={3}
        pathOptions={{
          color: '#ffffff',
          weight: 1.5,
          fillColor: color,
          fillOpacity: 1,
        }}
      />
    </>
  );
}

// ─── Map Controller for smooth zoom ───
function MapController({ selectedLane, lanes }: { selectedLane: string | null; lanes: LaneAggregation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLane) return;

    const lane = lanes.find(l => l.id === selectedLane);
    if (!lane) return;

    const start = getCoords(lane.origin_city);
    const end = getCoords(lane.destination_city);

    const L = require('leaflet');
    const bounds = L.latLngBounds([start, end]);
    map.flyToBounds(bounds, {
      padding: [60, 60],
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [selectedLane, lanes, map]);

  return null;
}

// ─── Pulsing Endpoint Marker ───
function PulsingEndpoint({ center, color, label }: { center: [number, number]; color: string; label?: string }) {
  return (
    <>
      {/* Outer pulse ring */}
      <CircleMarker
        center={center}
        radius={10}
        pathOptions={{
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.12,
          weight: 0,
        }}
        className="marker-pulse-ring"
      />
      {/* Inner solid dot */}
      <CircleMarker
        center={center}
        radius={5}
        pathOptions={{
          fillColor: color,
          color: '#ffffff',
          fillOpacity: 1,
          weight: 2,
        }}
      >
        {label && (
          <Popup>
            <span className="text-xs font-semibold">{label}</span>
          </Popup>
        )}
      </CircleMarker>
    </>
  );
}

export default function MapComponent({ lanes, selectedLaneId, onLaneSelect }: MapComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredLane, setHoveredLane] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] rounded-lg overflow-hidden relative">
        <div className="absolute inset-0 skeleton-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Loading Map...
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapController selectedLane={selectedLaneId || null} lanes={lanes} />

      {lanes.map((lane, index) => {
        const start = getCoords(lane.origin_city);
        const end = getCoords(lane.destination_city);
        const weight = Math.max(2, Math.min(8, lane.total_emissions_kg / 5000));
        const color = getEmissionColor(lane.total_emissions_kg);
        const isSelected = selectedLaneId === lane.id;

        return (
          <div key={lane.id}>
            {/* Animated route with progressive drawing */}
            <AnimatedRoute
              start={start}
              end={end}
              color={color}
              weight={weight}
              delay={index * 150} // Stagger by rank
              isSelected={isSelected}
              onHover={(hovering) => setHoveredLane(hovering ? lane.id : null)}
              onSelect={() => onLaneSelect?.(lane.id)}
            />

            {/* Moving vehicle marker */}
            <VehicleMarker start={start} end={end} color={color} />

            {/* Pulsing origin & destination endpoints */}
            <PulsingEndpoint center={start} color={color} label={`${lane.origin_city} → ${lane.destination_city}\n${(lane.total_emissions_kg / 1000).toFixed(1)}k kg CO₂ | ${lane.shipment_count} shipments`} />
            <PulsingEndpoint center={end} color={color} />
          </div>
        );
      })}
    </MapContainer>
  );
}
