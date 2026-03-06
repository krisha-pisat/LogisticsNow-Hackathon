import { Shipment, VehicleType, FuelType, UrgencyLevel } from '../types';

/**
 * Turkish city coordinates for map rendering
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'İstanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'İzmir': { lat: 38.4237, lng: 27.1428 },
  'Bursa': { lat: 40.1885, lng: 29.0610 },
  'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Adana': { lat: 36.9914, lng: 35.3308 },
  'Konya': { lat: 37.8746, lng: 32.4932 },
  'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Kayseri': { lat: 38.7312, lng: 35.4787 },
  'Samsun': { lat: 41.2867, lng: 36.3300 },
};

function getCoords(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] || { lat: 39.0, lng: 35.0 };
}

/**
 * Generate a deterministic shipment date from shipment ID
 * Spread across last 30 days
 */
function generateDate(id: number): string {
  const now = new Date('2026-03-01');
  const daysAgo = id % 30;
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Map urgency from customer segment + on_time
 */
function deriveUrgency(segment: string, onTime: number): UrgencyLevel {
  if (segment === 'Kurumsal' && onTime === 0) return 'High';
  if (segment === 'Kurumsal') return 'Medium';
  return 'Low';
}

// Cached parsed data
let cachedShipments: Shipment[] | null = null;
let csvText: string | null = null;

/**
 * Parse CSV text into Shipment array
 */
function parseCSVToShipments(text: string): Shipment[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const shipments: Shipment[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 5) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });

    const id = parseInt(row['Shipment_ID']) || i;
    const loadFactor = parseFloat(row['load_factor']);
    const co2 = parseFloat(row['co2_emission_kg']);

    shipments.push({
      shipment_id: `SHP-${String(id).padStart(4, '0')}`,
      origin_city: row['Origin_City'] || 'Unknown',
      destination_city: row['Destination_City'] || 'Unknown',
      origin_coords: getCoords(row['Origin_City']),
      destination_coords: getCoords(row['Destination_City']),
      vehicle_type: (row['vehicle_type'] as VehicleType) || 'Diesel',
      fuel_type: (row['fuel_type'] as FuelType) || 'Diesel',
      weight_kg: parseFloat(row['Weight_kg']) || 500,
      distance_km: parseFloat(row['Distance_km']) || 100,
      load_factor: isNaN(loadFactor) ? 0.5 : loadFactor,
      shipment_date: generateDate(id),
      urgency_level: deriveUrgency(row['Customer_Segment'] || 'Bireysel', parseInt(row['On_Time']) || 1),
      // CSV extras
      shipment_type: row['Shipment_Type'] as any,
      customer_segment: row['Customer_Segment'],
      on_time: parseInt(row['On_Time']) || 0,
      traffic_intensity: parseFloat(row['traffic_intensity']) || 0,
      avg_speed_kmph: parseFloat(row['avg_speed_kmph']) || 0,
      capacity_kg: parseFloat(row['capacity_kg']) || 0,
      emission_factor: isNaN(parseFloat(row['emission_factor'])) ? undefined : parseFloat(row['emission_factor']),
      co2_emission_kg: isNaN(co2) ? undefined : co2,
      lane_id: row['lane_id'],
    });
  }

  return shipments;
}

/**
 * Synchronous data access — parses embedded CSV data
 */
export function generateMockShipments(): Shipment[] {
  if (cachedShipments) return cachedShipments;

  // Will be populated by the async loader or by the embedded data
  return [];
}

/**
 * Async loader for fetching CSV from public folder
 */
export async function fetchCSVShipments(): Promise<Shipment[]> {
  if (cachedShipments) return cachedShipments;

  try {
    const response = await fetch('/carbon_intelligence_dataset.csv');
    const text = await response.text();
    cachedShipments = parseCSVToShipments(text);
    return cachedShipments;
  } catch (err) {
    console.error('Failed to load CSV:', err);
    return [];
  }
}

/**
 * Set cached data (useful for SSR or initial load)
 */
export function setCachedShipments(data: Shipment[]) {
  cachedShipments = data;
}

export function getCachedShipments(): Shipment[] | null {
  return cachedShipments;
}

export { CITY_COORDS };
