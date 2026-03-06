import { Shipment, ScenarioParams } from '../types';
import { calculateShipmentCO2 } from './emissions';

export function simulateScenario(shipments: Shipment[], params: ScenarioParams): Shipment[] {
  return shipments.map(s => {
    const updated = { ...s };

    // Apply vehicle swap if applicable
    if (params.targetVehicleType !== 'All') {
      // In a real scenario, applying logic like "Can this truck route become a train route?"
      // Here we just blindly apply it for simulation.
      updated.vehicle_type = params.targetVehicleType;
      
      // Auto-adjust fuel type if swapping to unassociated (e.g., Train doesn't use Aviation fuel)
      if (params.targetVehicleType === 'Train' && updated.fuel_type !== 'Electric') {
        updated.fuel_type = 'Diesel'; 
      }
    }

    if (params.targetFuelType !== 'All') {
      updated.fuel_type = params.targetFuelType;
    }

    // Apply load factor optimization
    if (updated.load_factor < params.minLoadFactor) {
      updated.load_factor = params.minLoadFactor; 
      // Theoretically, weight needs to increase or distance decrease if combining, but for
      // simplicity we just bump the load factor to see emission per shipment reduction.
    }

    // Recalculate emissions with new parameters
    updated.emissions_kg = calculateShipmentCO2(updated);

    return updated;
  });
}
