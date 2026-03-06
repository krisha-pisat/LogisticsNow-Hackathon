import { useMemo, useState, useEffect } from 'react';
import { useFiltersStore } from '../store/useFiltersStore';
import { Shipment } from '../types';
import { fetchCSVShipments, getCachedShipments } from '../lib/mockShipmentGenerator';

export function useShipments() {
  const [data, setData] = useState<Shipment[]>(getCachedShipments() || []);
  const [isLoading, setIsLoading] = useState(data.length === 0);
  const filters = useFiltersStore();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const shipments = await fetchCSVShipments();
        if (mounted) {
          setData(shipments);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load shipment data:', err);
        if (mounted) setIsLoading(false);
      }
    }

    if (data.length === 0) {
      loadData();
    }
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(shipment => {
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
  }, [data, filters.dateRange, filters.region, filters.businessUnit, filters.vehicleType, filters.fuelType]);

  return {
    shipments: filteredData,
    totalShipments: filteredData.length,
    isLoading,
  };
}
