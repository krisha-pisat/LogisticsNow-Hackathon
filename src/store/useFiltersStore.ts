import { create } from 'zustand';
import { DashboardFilters, DateRange, MetricMode } from '../types';

interface FiltersState extends DashboardFilters {
  metricMode: MetricMode;
  selectedShipmentIds: string[];
  setDateRange: (range: DateRange) => void;
  setRegion: (region: string) => void;
  setBusinessUnit: (unit: string) => void;
  setVehicleType: (type: string) => void;
  setFuelType: (type: string) => void;
  setMetricMode: (mode: MetricMode) => void;
  setSelectedShipmentIds: (ids: string[]) => void;
  addSelectedShipmentIds: (ids: string[]) => void;
  resetFilters: () => void;
}

const initialState = {
  dateRange: { from: undefined, to: undefined } as DateRange,
  region: 'All',
  businessUnit: 'All',
  vehicleType: 'All',
  fuelType: 'All',
  metricMode: 'co2' as MetricMode,
  selectedShipmentIds: [] as string[],
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialState,
  setDateRange: (range) => set({ dateRange: range }),
  setRegion: (region) => set({ region }),
  setBusinessUnit: (unit) => set({ businessUnit: unit }),
  setVehicleType: (type) => set({ vehicleType: type }),
  setFuelType: (type) => set({ fuelType: type }),
  setMetricMode: (mode) => set({ metricMode: mode }),
  setSelectedShipmentIds: (ids) => set({ selectedShipmentIds: ids }),
  addSelectedShipmentIds: (ids) => set((state) => ({
    selectedShipmentIds: [...new Set([...state.selectedShipmentIds, ...ids])]
  })),
  resetFilters: () => set(initialState),
}));
