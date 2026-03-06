export type UrgencyLevel = 'High' | 'Medium' | 'Low';
export type FuelType = 'Diesel' | 'Electric' | 'Hydrogen' | 'Sustainable Aviation Fuel' | 'Biodiesel' | 'Petrol';
export type VehicleType = 'Truck' | 'Train' | 'Ship' | 'Air' | 'Diesel' | 'Electric' | 'Hybrid';
export type ShipmentType = 'Kara' | 'Hava' | 'Deniz';
export type MetricMode = 'co2' | 'nox' | 'cost';

export interface Shipment {
  shipment_id: string;
  origin_city: string;
  origin_coords: { lat: number; lng: number };
  destination_city: string;
  destination_coords: { lat: number; lng: number };
  vehicle_type: VehicleType;
  fuel_type: FuelType;
  weight_kg: number;
  distance_km: number;
  load_factor: number;
  shipment_date: string;
  urgency_level: UrgencyLevel;
  // Extra fields from CSV
  shipment_type?: ShipmentType;
  customer_segment?: string;
  on_time?: number;
  traffic_intensity?: number;
  avg_speed_kmph?: number;
  capacity_kg?: number;
  emission_factor?: number;
  co2_emission_kg?: number;
  lane_id?: string;
  // Computed fields
  emissions_kg?: number;
  nox_kg?: number;
  cost_usd?: number;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DashboardFilters {
  dateRange: DateRange;
  region: string;
  businessUnit: string;
  vehicleType: string;
  fuelType: string;
}

export interface ScenarioParams {
  targetVehicleType: VehicleType | 'All';
  targetFuelType: FuelType | 'All';
  minLoadFactor: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  params: ScenarioParams;
  baselineCO2: number;
  simulatedCO2: number;
  percentChange: number;
  timestamp: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'consolidation' | 'mode_switch' | 'delay';
  title: string;
  description: string;
  shipmentIds: string[];
  co2_savings_kg: number;
  cost_savings_usd: number;
  priority: 'high' | 'medium' | 'low';
  applied: boolean;
}
