import { Shipment } from '../types';
import { calculateShipmentCO2 } from './emissions';

export interface LaneAggregation {
  id: string; // origin-destination
  origin_city: string;
  destination_city: string;
  total_weight_kg: number;
  total_emissions_kg: number;
  shipment_count: number;
  avg_load_factor: number;
  origin_coords: { lat: number; lng: number };
  destination_coords: { lat: number; lng: number };
}

export function aggregateByLane(shipments: Shipment[]): LaneAggregation[] {
  const map = new Map<string, LaneAggregation>();

  shipments.forEach(s => {
    const laneId = `${s.origin_city}-${s.destination_city}`;
    const emissions = s.emissions_kg || calculateShipmentCO2(s);

    if (!map.has(laneId)) {
      map.set(laneId, {
        id: laneId,
        origin_city: s.origin_city,
        destination_city: s.destination_city,
        total_weight_kg: 0,
        total_emissions_kg: 0,
        shipment_count: 0,
        avg_load_factor: 0,
        origin_coords: s.origin_coords,
        destination_coords: s.destination_coords,
      });
    }

    const lane = map.get(laneId)!;
    lane.total_weight_kg += s.weight_kg;
    lane.total_emissions_kg += emissions;
    lane.shipment_count += 1;
    // We will average it after the loop
    lane.avg_load_factor += s.load_factor; 
  });

  // Finalize averages and return
  return Array.from(map.values()).map(lane => ({
    ...lane,
    avg_load_factor: lane.avg_load_factor / lane.shipment_count
  })).sort((a, b) => b.total_emissions_kg - a.total_emissions_kg); // Sort by highest emissions
}

export function aggregateByDate(shipments: Shipment[]): { date: string, emissions: number, weight: number }[] {
  const map = new Map<string, { emissions: number, weight: number }>();

  shipments.forEach(s => {
    const date = s.shipment_date.split('T')[0]; // simple YYYY-MM-DD
    const emissions = s.emissions_kg || calculateShipmentCO2(s);

    if (!map.has(date)) {
      map.set(date, { emissions: 0, weight: 0 });
    }

    const entry = map.get(date)!;
    entry.emissions += emissions;
    entry.weight += s.weight_kg;
  });

  return Array.from(map.entries()).map(([date, data]) => ({
    date,
    emissions: data.emissions,
    weight: data.weight
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
