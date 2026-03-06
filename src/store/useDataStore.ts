/**
 * useDataStore — Zustand store for backend-processed shipment data
 * 
 * Holds the processed records from the Python backend,
 * summary stats, and loading/error state.
 */

import { create } from 'zustand';
import { Shipment } from '../types';
import { processDefaultDataset, processUploadedFile, BackendSummary } from '../lib/api';

interface ProcessedRecord extends Record<string, any> {
    // Backend-added fields
    calculated_co2_kg?: number;
    emission_per_ton_km?: number;
    validation_flag?: boolean;
    inefficiency_type?: string[];
    optimization_suggestion?: string;
    looked_up_emission_factor?: number;
}

interface DataState {
    /** Raw records from the backend */
    rawRecords: ProcessedRecord[];
    /** Mapped shipments for the frontend */
    shipments: Shipment[];
    /** Summary from the backend */
    summary: BackendSummary | null;
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Whether data has been loaded at least once */
    initialized: boolean;
    /** Load the default bundled CSV via the backend */
    loadDefaultData: () => Promise<void>;
    /** Upload a user CSV/Excel file via the backend */
    uploadFile: (file: File) => Promise<BackendSummary>;
}

// City coordinates for mapping
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    'İstanbul': { lat: 41.0082, lng: 28.9784 },
    'Ankara': { lat: 39.9334, lng: 32.8597 },
    'İzmir': { lat: 38.4237, lng: 27.1428 },
    'Bursa': { lat: 40.1885, lng: 29.0610 },
    'Antalya': { lat: 36.8969, lng: 30.7133 },
    'Adana': { lat: 36.9914, lng: 35.3308 },
    'Konya': { lat: 37.8746, lng: 32.4932 },
    'Gaziantep': { lat: 37.0662, lng: 37.3833 },
    'Kayseri': { lat: 38.7312, lng: 35.4787 },
    'Samsun': { lat: 41.2867, lng: 36.3300 },
};

function getCoords(city: string) {
    return CITY_COORDS[city] || { lat: 39.0, lng: 35.0 };
}

/**
 * Map a raw backend record into a Shipment for the frontend
 */
function mapRecordToShipment(rec: ProcessedRecord, index: number): Shipment {
    const id = rec.Shipment_ID ?? index + 1;
    const origin = String(rec.Origin_City || 'Unknown');
    const dest = String(rec.Destination_City || 'Unknown');

    return {
        shipment_id: `SHP-${String(id).padStart(4, '0')}`,
        origin_city: origin,
        destination_city: dest,
        origin_coords: getCoords(origin),
        destination_coords: getCoords(dest),
        vehicle_type: rec.vehicle_type || 'Diesel',
        fuel_type: rec.fuel_type || 'Diesel',
        weight_kg: Number(rec.Weight_kg) || 500,
        distance_km: Number(rec.Distance_km) || 100,
        load_factor: Number(rec.load_factor) || 0.5,
        shipment_date: new Date(Date.now() - (Number(id) % 30) * 86400000).toISOString(),
        urgency_level: rec.Customer_Segment === 'Kurumsal' && rec.On_Time === 0 ? 'High'
            : rec.Customer_Segment === 'Kurumsal' ? 'Medium' : 'Low',
        // CSV extras
        shipment_type: rec.Shipment_Type,
        customer_segment: rec.Customer_Segment,
        on_time: Number(rec.On_Time) || 0,
        traffic_intensity: Number(rec.traffic_intensity) || 0,
        avg_speed_kmph: Number(rec.avg_speed_kmph) || 0,
        capacity_kg: Number(rec.capacity_kg) || 0,
        emission_factor: rec.emission_factor != null ? Number(rec.emission_factor) : undefined,
        co2_emission_kg: rec.calculated_co2_kg != null ? Number(rec.calculated_co2_kg) : undefined,
        lane_id: rec.lane_id,
        // Backend-computed extras stored on the shipment
        emissions_kg: rec.calculated_co2_kg != null ? Number(rec.calculated_co2_kg) : undefined,
    };
}

export const useDataStore = create<DataState>((set, get) => ({
    rawRecords: [],
    shipments: [],
    summary: null,
    isLoading: false,
    error: null,
    initialized: false,

    loadDefaultData: async () => {
        if (get().initialized) return;
        set({ isLoading: true, error: null });
        try {
            const res = await processDefaultDataset();
            const shipments = res.data.map((rec, i) => mapRecordToShipment(rec, i));
            set({
                rawRecords: res.data,
                shipments,
                summary: res.summary,
                isLoading: false,
                initialized: true,
            });
        } catch (err: any) {
            console.error('Backend load failed:', err);
            set({ isLoading: false, error: err.message || 'Failed to load data from backend' });
        }
    },

    uploadFile: async (file: File) => {
        set({ isLoading: true, error: null });
        try {
            const res = await processUploadedFile(file);
            const shipments = res.data.map((rec, i) => mapRecordToShipment(rec, i));
            set({
                rawRecords: res.data,
                shipments,
                summary: res.summary,
                isLoading: false,
                initialized: true,
            });
            return res.summary;
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Upload failed' });
            throw err;
        }
    },
}));
