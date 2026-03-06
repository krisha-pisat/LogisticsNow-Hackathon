import { create } from 'zustand';
import { DashboardFilters, DateRange } from '../types';

interface FiltersState extends DashboardFilters {
  setDateRange: (range: DateRange) => void;
  setRegion: (region: string) => void;
  setBusinessUnit: (unit: string) => void;
  setVehicleType: (type: string) => void;
  setFuelType: (type: string) => void;
  resetFilters: () => void;
}

const initialState = {
  dateRange: { from: undefined, to: undefined },
  region: 'All',
  businessUnit: 'All',
  vehicleType: 'All',
  fuelType: 'All',
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialState,
  setDateRange: (range) => set({ dateRange: range }),
  setRegion: (region) => set({ region }),
  setBusinessUnit: (unit) => set({ businessUnit: unit }),
  setVehicleType: (type) => set({ vehicleType: type }),
  setFuelType: (type) => set({ fuelType: type }),
  resetFilters: () => set(initialState),
}));
