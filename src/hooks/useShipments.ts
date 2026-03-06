import { useMemo } from 'react';
import { useFiltersStore } from '../store/useFiltersStore';
import { useDataStore } from '../store/useDataStore';

export function useShipments() {
  const { shipments: allShipments, isLoading, summary, error, initialized } = useDataStore();
  const filters = useFiltersStore();

  // No auto-load — data only appears after user uploads a CSV

  const filteredData = useMemo(() => {
    return allShipments.filter(shipment => {
      // Date filter
      if (filters.dateRange?.from && new Date(shipment.shipment_date) < filters.dateRange.from) return false;
      if (filters.dateRange?.to && new Date(shipment.shipment_date) > filters.dateRange.to) return false;

      // Region filter (origin OR destination matches city name)
      if (filters.region !== 'All') {
        if (shipment.origin_city !== filters.region && shipment.destination_city !== filters.region) {
          return false;
        }
      }

      // Customer segment as business unit
      if (filters.businessUnit !== 'All' && shipment.customer_segment !== filters.businessUnit) return false;

      // Vehicle type
      if (filters.vehicleType !== 'All' && shipment.vehicle_type !== filters.vehicleType) return false;

      // Fuel type
      if (filters.fuelType !== 'All' && shipment.fuel_type !== filters.fuelType) return false;

      return true;
    });
  }, [allShipments, filters.dateRange, filters.region, filters.businessUnit, filters.vehicleType, filters.fuelType]);

  return {
    shipments: filteredData,
    totalShipments: filteredData.length,
    isLoading,
    summary,
    error,
    initialized,
  };
}
