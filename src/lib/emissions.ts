import { Shipment } from '../types';

/**
 * Emission Factors (kg CO2 per ton-km)
 * Keys cover both original types (Truck/Train/Ship/Air) AND CSV types (Diesel/Electric/Hybrid)
 */
export const DEFAULT_EMISSION_FACTORS: Record<string, Record<string, number>> = {
  // Original vehicle types
  Truck: { Diesel: 0.105, Biodiesel: 0.08, Electric: 0.02, Hydrogen: 0.01, Petrol: 0.12 },
  Train: { Diesel: 0.03, Electric: 0.01, Petrol: 0.035 },
  Ship: { Diesel: 0.015, Petrol: 0.018 },
  Air: { 'Sustainable Aviation Fuel': 0.6, Diesel: 1.25, Petrol: 1.3 },
  // CSV vehicle types (Diesel/Electric/Hybrid refer to engine type, not fuel)
  Diesel: { Diesel: 0.105, Electric: 0.08, Petrol: 0.12 },
  Electric: { Electric: 0.02, Petrol: 0.05, Diesel: 0.05 },
  Hybrid: { Petrol: 0.07, Diesel: 0.065, Electric: 0.04 },
};

// NOx factors (kg NOx per ton-km)
const NOX_FACTORS: Record<string, Record<string, number>> = {
  Truck: { Diesel: 0.0012, Biodiesel: 0.0008, Electric: 0.0001, Hydrogen: 0.00005, Petrol: 0.0015 },
  Train: { Diesel: 0.0004, Electric: 0.00005, Petrol: 0.0005 },
  Ship: { Diesel: 0.0008, Petrol: 0.001 },
  Air: { 'Sustainable Aviation Fuel': 0.003, Diesel: 0.006, Petrol: 0.007 },
  Diesel: { Diesel: 0.0012, Electric: 0.0008, Petrol: 0.0015 },
  Electric: { Electric: 0.0001, Petrol: 0.0003, Diesel: 0.0003 },
  Hybrid: { Petrol: 0.0008, Diesel: 0.0007, Electric: 0.0002 },
};

// Cost per ton-km (USD)
const COST_FACTORS: Record<string, Record<string, number>> = {
  Truck: { Diesel: 0.12, Biodiesel: 0.14, Electric: 0.09, Hydrogen: 0.18, Petrol: 0.13 },
  Train: { Diesel: 0.04, Electric: 0.035, Petrol: 0.045 },
  Ship: { Diesel: 0.02, Petrol: 0.025 },
  Air: { 'Sustainable Aviation Fuel': 0.85, Diesel: 0.75, Petrol: 0.8 },
  Diesel: { Diesel: 0.12, Electric: 0.09, Petrol: 0.13 },
  Electric: { Electric: 0.07, Petrol: 0.09, Diesel: 0.09 },
  Hybrid: { Petrol: 0.10, Diesel: 0.095, Electric: 0.075 },
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
  // If CSV already has a pre-computed co2_emission_kg, use it when no custom factors are applied
  if (!customFactors && shipment.co2_emission_kg && shipment.co2_emission_kg > 0) {
    return shipment.co2_emission_kg;
  }

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
