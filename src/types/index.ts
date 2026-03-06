export type UrgencyLevel = 'High' | 'Medium' | 'Low';
export type FuelType = 'Diesel' | 'Electric' | 'Hydrogen' | 'Sustainable Aviation Fuel' | 'Biodiesel';
export type VehicleType = 'Truck' | 'Train' | 'Ship' | 'Air';

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
  shipment_date: string; // ISO String for easier serialization
  urgency_level: UrgencyLevel;
  // Computed fields
  emissions_kg?: number;
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
