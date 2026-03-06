'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LaneAggregation } from '@/lib/aggregation';

interface LaneMapProps {
  lanes: LaneAggregation[];
}

export default function LaneMap({ lanes }: LaneMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-muted animate-pulse rounded-md" />;

  // Center on US approximately
  const center: [number, number] = [39.8283, -98.5795];

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border z-10 relative">
      <MapContainer center={center} zoom={4} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {lanes.map((lane) => {
          // Weight thickness based on emissions relative to max (max arbitrary 10k for now)
          const weight = Math.min(Math.max((lane.total_emissions_kg / 5000) * 3, 1.5), 8);
          
          return (
            <div key={lane.id}>
              {/* Origin Marker */}
              <CircleMarker 
                center={[lane.origin_coords.lat, lane.origin_coords.lng]} 
                radius={4} 
                pathOptions={{ fillColor: '#3B82F6', color: '#1D4ED8', fillOpacity: 0.8 }}
              />
              {/* Dest Marker */}
              <CircleMarker 
                center={[lane.destination_coords.lat, lane.destination_coords.lng]} 
                radius={4} 
                pathOptions={{ fillColor: '#10B981', color: '#047857', fillOpacity: 0.8 }}
              />
              {/* Line */}
              <Polyline 
                positions={[
                  [lane.origin_coords.lat, lane.origin_coords.lng],
                  [lane.destination_coords.lat, lane.destination_coords.lng]
                ]}
                pathOptions={{ color: '#EF4444', weight, opacity: 0.6 }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <p className="font-bold">{lane.origin_city} &rarr; {lane.destination_city}</p>
                    <p>{lane.shipment_count} shipments</p>
                    <p>{(lane.total_emissions_kg / 1000).toFixed(1)}t CO₂e</p>
                    <p>{(lane.avg_load_factor * 100).toFixed(0)}% avg load</p>
                  </div>
                </Tooltip>
              </Polyline>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
