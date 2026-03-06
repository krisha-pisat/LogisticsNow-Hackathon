import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFiltersStore } from '../store/useFiltersStore';

export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { dateRange, region, businessUnit, vehicleType, fuelType, 
    setDateRange, setRegion, setBusinessUnit, setVehicleType, setFuelType } = useFiltersStore();

  // Initialize from searchParams on mount
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const r = searchParams.get('region');
    const bu = searchParams.get('bu');
    const vType = searchParams.get('vType');
    const fType = searchParams.get('fType');

    if (from || to) {
      setDateRange({ from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
    }
    if (r) setRegion(r);
    if (bu) setBusinessUnit(bu);
    if (vType) setVehicleType(vType);
    if (fType) setFuelType(fType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync to searchParams when state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (dateRange.from) params.set('from', dateRange.from.toISOString());
    else params.delete('from');
    
    if (dateRange.to) params.set('to', dateRange.to.toISOString());
    else params.delete('to');

    if (region && region !== 'All') params.set('region', region);
    else params.delete('region');

    if (businessUnit && businessUnit !== 'All') params.set('bu', businessUnit);
    else params.delete('bu');

    if (vehicleType && vehicleType !== 'All') params.set('vType', vehicleType);
    else params.delete('vType');

    if (fuelType && fuelType !== 'All') params.set('fType', fuelType);
    else params.delete('fType');

    const newQueryString = params.toString();
    const basePath = window.location.pathname;

    // Use router.replace to avoid clogging the history stack unnecessarily on every filter change
    if (newQueryString !== searchParams.toString()) {
      router.replace(`${basePath}?${newQueryString}`);
    }
  }, [dateRange, region, businessUnit, vehicleType, fuelType, router, searchParams]);
}
