'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LaneAggregation } from '@/lib/aggregation';

interface MapComponentProps {
  lanes: LaneAggregation[];
}

// Temporary mapping of standard cities to coordinates for simulation purposes
// Actual app will use the DB coords attached to shipment models.
const CITY_COORDS: Record<string, [number, number]> = {
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Houston': [29.7604, -95.3698],
  'Phoenix': [33.4484, -112.0740],
};

function getCoords(city: string): [number, number] {
  return CITY_COORDS[city] || [39.8283, -98.5795]; // Center US default
}

function AnimatedMarker({ start, end, color }: { start: [number, number], end: [number, number], color: string }) {
  const [pos, setPos] = useState<[number, number]>(start);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 4000 + Math.random() * 4000; // Random duration between 4-8s
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      let progress = (timestamp - startTimestamp) / duration;
      
      if (progress >= 1) {
        progress = 0;
        startTimestamp = timestamp;
      }
      
      setPos([
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress
      ]);
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [start, end]);

  return <CircleMarker center={pos} radius={3} color="#ffffff" weight={1} fillColor={color} fillOpacity={1} className="z-50 shadow-lg glow-pulse" />;
}

export default function MapComponent({ lanes }: MapComponentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Leaflet icon fix
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  if (!mounted) return <div className="w-full h-[400px] bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground">Loading Map...</div>;

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
      {lanes.map(lane => {
        const start = getCoords(lane.origin_city);
        const end = getCoords(lane.destination_city);
        
        // Emphasize lanes with higher emissions
        const weight = Math.max(2, Math.min(10, lane.total_emissions_kg / 1000));
        const color = lane.total_emissions_kg > 50000 ? '#EF4444' : (lane.total_emissions_kg > 20000 ? '#F59E0B' : '#10B981');

        return (
          <div key={lane.id}>
            <Polyline positions={[start, end]} color={color} weight={weight} opacity={0.4} className="path-animation" />
            <AnimatedMarker start={start} end={end} color={color} />
            <CircleMarker center={start} radius={5} color={color} fillColor={color} fillOpacity={1}>
              <Popup>
                <strong>{lane.origin_city}</strong> to <strong>{lane.destination_city}</strong><br/>
                Emissions: {(lane.total_emissions_kg / 1000).toFixed(1)}k kg CO2<br/>
                Shipments: {lane.shipment_count}
              </Popup>
            </CircleMarker>
            <CircleMarker center={end} radius={5} color={color} fillColor={color} fillOpacity={1} />
          </div>
        );
      })}
    </MapContainer>
  );
}
