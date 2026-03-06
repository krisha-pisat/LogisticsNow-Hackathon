import { Shipment } from '../types';

/**
 * Simplified Emission Factors (kg CO2 per ton-km)
 * Sources vary, providing mock standard values for simulation purposes.
 */
const EMISSION_FACTORS: Record<string, Record<string, number>> = {
  Truck: {
    Diesel: 0.105,
    Biodiesel: 0.08,
    Electric: 0.02,
    Hydrogen: 0.01,
  },
  Train: {
    Diesel: 0.03,
    Electric: 0.01,
  },
  Ship: {
    Diesel: 0.015,
  },
  Air: {
    'Sustainable Aviation Fuel': 0.6,
    Diesel: 1.25, // regular jet fuel mapped to diesel for schema simplicity
  },
} as any;

export function calculateShipmentCO2(shipment: Shipment): number {
  const { weight_kg, distance_km, vehicle_type, fuel_type, load_factor } = shipment;
  const ton = weight_kg / 1000;
  
  // Base factor or fallback to a standard truck diesel if missing
  const factor = EMISSION_FACTORS[vehicle_type]?.[fuel_type] || 0.1;
  
  // Load adjustment: lower load factor = less efficient per kg
  // E.g., at 0.5 load factor, the allocated emissions double.
  // Using a simplified model: factor * (1 + (1 - load_factor))
  const loadAdjustment = 1 + (1 - load_factor) * 0.5; // Up to 50% penalty for empty running
  
  return ton * distance_km * factor * loadAdjustment;
}

export function calculateESGScore(totalCO2: number, baselineCO2: number, avgLoad: number): number {
  if (baselineCO2 === 0) return 100; // prevent division by zero
  
  // Base formula: 100 * (1 - totalCO2 / baseline) * (avgLoad / 0.8)
  const emissionsRatio = totalCO2 / baselineCO2;
  const loadRatio = avgLoad / 0.8; // 0.8 is considered 'ideal' average load factor
  
  // Cap between 0 and 100
  const rawScore = 100 * (1.5 - emissionsRatio) * loadRatio; // adjusted anchor to make scores look realistic (60-95)
  return Math.min(Math.max(Math.round(rawScore), 0), 100);
}
