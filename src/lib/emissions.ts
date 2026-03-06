import { Shipment } from '../types';

/**
 * Emission Factors (kg CO2 per ton-km)
 * Adjustable via UI sliders - start with defaults
 */
export const DEFAULT_EMISSION_FACTORS: Record<string, Record<string, number>> = {
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
    Diesel: 1.25,
  },
};

// NOx factors (kg NOx per ton-km) - simplified
const NOX_FACTORS: Record<string, Record<string, number>> = {
  Truck: { Diesel: 0.0012, Biodiesel: 0.0008, Electric: 0.0001, Hydrogen: 0.00005 },
  Train: { Diesel: 0.0004, Electric: 0.00005 },
  Ship: { Diesel: 0.0008 },
  Air: { 'Sustainable Aviation Fuel': 0.003, Diesel: 0.006 },
};

// Cost per ton-km (USD)
const COST_FACTORS: Record<string, Record<string, number>> = {
  Truck: { Diesel: 0.12, Biodiesel: 0.14, Electric: 0.09, Hydrogen: 0.18 },
  Train: { Diesel: 0.04, Electric: 0.035 },
  Ship: { Diesel: 0.02 },
  Air: { 'Sustainable Aviation Fuel': 0.85, Diesel: 0.75 },
};

// Mutable factors that can be adjusted by sliders
let currentFactors = structuredClone(DEFAULT_EMISSION_FACTORS);

export function getEmissionFactors() {
  return currentFactors;
}

export function setEmissionFactors(factors: Record<string, Record<string, number>>) {
  currentFactors = factors;
}

export function resetEmissionFactors() {
  currentFactors = structuredClone(DEFAULT_EMISSION_FACTORS);
}

export function calculateShipmentCO2(shipment: Shipment, customFactors?: Record<string, Record<string, number>>): number {
  const { weight_kg, distance_km, vehicle_type, fuel_type, load_factor } = shipment;
  const ton = weight_kg / 1000;
  const factors = customFactors || currentFactors;
  const factor = factors[vehicle_type]?.[fuel_type] || 0.1;
  const loadAdjustment = 1 + (1 - load_factor) * 0.5;
  return ton * distance_km * factor * loadAdjustment;
}

export function calculateShipmentNOx(shipment: Shipment): number {
  const { weight_kg, distance_km, vehicle_type, fuel_type, load_factor } = shipment;
  const ton = weight_kg / 1000;
  const factor = NOX_FACTORS[vehicle_type]?.[fuel_type] || 0.001;
  const loadAdjustment = 1 + (1 - load_factor) * 0.3;
  return ton * distance_km * factor * loadAdjustment;
}

export function calculateShipmentCost(shipment: Shipment): number {
  const { weight_kg, distance_km, vehicle_type, fuel_type, load_factor } = shipment;
  const ton = weight_kg / 1000;
  const factor = COST_FACTORS[vehicle_type]?.[fuel_type] || 0.1;
  // Higher load factor = lower per-unit cost
  const loadDiscount = 1 - (load_factor - 0.5) * 0.3;
  return ton * distance_km * factor * loadDiscount;
}

export function getShipmentMetric(shipment: Shipment, mode: 'co2' | 'nox' | 'cost'): number {
  switch (mode) {
    case 'co2': return calculateShipmentCO2(shipment);
    case 'nox': return calculateShipmentNOx(shipment);
    case 'cost': return calculateShipmentCost(shipment);
  }
}

export function getMetricUnit(mode: 'co2' | 'nox' | 'cost'): string {
  switch (mode) {
    case 'co2': return 'kg CO₂';
    case 'nox': return 'kg NOx';
    case 'cost': return 'USD';
  }
}

export function getMetricLabel(mode: 'co2' | 'nox' | 'cost'): string {
  switch (mode) {
    case 'co2': return 'CO₂ Emissions';
    case 'nox': return 'NOx Emissions';
    case 'cost': return 'Logistics Cost';
  }
}

export function calculateESGScore(totalCO2: number, baselineCO2: number, avgLoad: number): number {
  if (baselineCO2 === 0) return 100;
  const emissionsRatio = totalCO2 / baselineCO2;
  const loadRatio = avgLoad / 0.8;
  const rawScore = 100 * (1.5 - emissionsRatio) * loadRatio;
  return Math.min(Math.max(Math.round(rawScore), 0), 100);
}
