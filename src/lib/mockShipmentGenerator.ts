import { Shipment, FuelType, VehicleType, UrgencyLevel } from '../types';

const CITIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970 },
  { name: 'San Jose', lat: 37.3382, lng: -121.8863 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', lat: 39.7392, lng: -104.9903 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589 },
];

const VEHICLES: VehicleType[] = ['Truck', 'Train', 'Ship', 'Air'];
const FUELS: Record<string, FuelType[]> = {
  Truck: ['Diesel', 'Electric', 'Hydrogen', 'Biodiesel'],
  Train: ['Diesel', 'Electric'],
  Ship: ['Diesel'],
  Air: ['Diesel', 'Sustainable Aviation Fuel'],
};

const URGENCY: UrgencyLevel[] = ['High', 'Medium', 'Low'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function generateMockShipments(count = 1000): Shipment[] {
  const shipments: Shipment[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const origin = randomChoice(CITIES);
    let destination = randomChoice(CITIES);
    while (destination.name === origin.name) {
      destination = randomChoice(CITIES);
    }

    const vehicle_type = randomChoice(VEHICLES);
    const fuel_type = randomChoice(FUELS[vehicle_type]);
    const urgency_level = randomChoice(URGENCY);
    const weight_kg = randomInt(500, 25000);
    const distance_km = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng) * (1 + (Math.random() * 0.1)); // Add 0-10% routing overhead
    const load_factor = +(Math.random() * (1 - 0.3) + 0.3).toFixed(2); // 0.3 to 1.0
    
    // Pick a date in the last 30 days
    const daysAgo = randomInt(0, 30);
    const shipment_date = new Date(today.getTime() - (daysAgo * 24 * 60 * 60 * 1000)).toISOString();

    shipments.push({
      shipment_id: `SHP-${10000 + i}`,
      origin_city: origin.name,
      origin_coords: { lat: origin.lat, lng: origin.lng },
      destination_city: destination.name,
      destination_coords: { lat: destination.lat, lng: destination.lng },
      vehicle_type,
      fuel_type,
      weight_kg,
      distance_km: Math.round(distance_km),
      load_factor,
      shipment_date,
      urgency_level,
    });
  }

  return shipments;
}
