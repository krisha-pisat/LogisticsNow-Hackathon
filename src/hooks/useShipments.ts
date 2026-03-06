import { useMemo, useState, useEffect } from 'react';
import { useFiltersStore } from '../store/useFiltersStore';
import { Shipment } from '../types';
import { generateMockShipments } from '../lib/mockShipmentGenerator';

// Singleton in-memory mock store
let MOCK_DATA: Shipment[] | null = null;

export function useShipments() {
  const [data, setData] = useState<Shipment[]>([]);
  const filters = useFiltersStore();

  useEffect(() => {
    // Only generate once per session
    if (!MOCK_DATA) {
      MOCK_DATA = generateMockShipments(1000);
    }
    setData(MOCK_DATA);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(shipment => {
      // Date filter
      if (filters.dateRange?.from && new Date(shipment.shipment_date) < filters.dateRange.from) return false;
      if (filters.dateRange?.to && new Date(shipment.shipment_date) > filters.dateRange.to) return false;

      // Region filter (treating origin OR destination here for simplicity)
      if (filters.region !== 'All') {
        // e.g., if region is "West", one would map state to region. 
        // We'll treat our "region" filter directly passing city names for this demo.
        if (shipment.origin_city !== filters.region && shipment.destination_city !== filters.region) {
            return false;
        }
      }

      // Bu type... our mock data doesn't have business unit yet, skip or mock it
      // if (filters.businessUnit !== 'All' && shipment.business_unit !== filters.businessUnit) return false;

      // Vehicle
      if (filters.vehicleType !== 'All' && shipment.vehicle_type !== filters.vehicleType) return false;

      // Fuel
      if (filters.fuelType !== 'All' && shipment.fuel_type !== filters.fuelType) return false;

      return true;
    });
  }, [data, filters.dateRange, filters.region, filters.businessUnit, filters.vehicleType, filters.fuelType]);

  return {
    shipments: filteredData,
    totalShipments: filteredData.length,
    isLoading: data.length === 0,
  };
}
