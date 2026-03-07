import { Shipment, OptimizationSuggestion } from '../types';
import { calculateShipmentCO2, calculateShipmentCost } from './emissions';

/**
 * Generate optimization suggestions based on shipment data analysis
 */
export function generateOptimizationSuggestions(shipments: Shipment[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    let sugId = 0;

    // 1. CONSOLIDATION: Find same-lane, same-day shipments with low load factors
    const laneMap = new Map<string, Shipment[]>();
    shipments.forEach(s => {
        const key = `${s.origin_city}-${s.destination_city}-${s.shipment_date.split('T')[0]}`;
        if (!laneMap.has(key)) laneMap.set(key, []);
        laneMap.get(key)!.push(s);
    });

    laneMap.forEach((group, key) => {
        const lowLoadGroup = group.filter(s => s.load_factor < 0.6);
        if (lowLoadGroup.length >= 2) {
            const ids = lowLoadGroup.map(s => s.shipment_id);
            const currentCO2 = lowLoadGroup.reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
            const currentCost = lowLoadGroup.reduce((sum, s) => sum + calculateShipmentCost(s), 0);
            // Consolidating saves ~35% emissions by improving load factor
            const co2Savings = currentCO2 * 0.35;
            const costSavings = currentCost * 0.25;
            const [origin, dest] = key.split('-');

            suggestions.push({
                id: `OPT-${++sugId}`,
                type: 'consolidation',
                title: `Consolidate ${ids.length} shipments on ${origin} → ${dest}`,
                description: `${ids.length} under-loaded shipments on the same route and date can be merged into fewer, fuller trucks.`,
                shipmentIds: ids,
                co2_savings_kg: co2Savings,
                cost_savings_usd: costSavings,
                priority: co2Savings > 500 ? 'high' : co2Savings > 100 ? 'medium' : 'low',
                applied: false,
            });
        }
    });

    // 2. MODE SWITCH: Air freight for non-urgent → suggest switching to truck/train
    const airNonUrgent = shipments.filter(s => s.vehicle_type === 'Air' && s.urgency_level === 'Low');
    if (airNonUrgent.length > 0) {
        // Group by route
        const airRoutes = new Map<string, Shipment[]>();
        airNonUrgent.forEach(s => {
            const key = `${s.origin_city}-${s.destination_city}`;
            if (!airRoutes.has(key)) airRoutes.set(key, []);
            airRoutes.get(key)!.push(s);
        });

        airRoutes.forEach((group, route) => {
            const ids = group.map(s => s.shipment_id);
            const currentCO2 = group.reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
            const co2Savings = currentCO2 * 0.85; // Air→Train saves ~85%
            const costSavings = group.reduce((sum, s) => sum + calculateShipmentCost(s), 0) * 0.6;

            suggestions.push({
                id: `OPT-${++sugId}`,
                type: 'mode_switch',
                title: `Switch ${ids.length} air shipments to rail on ${route}`,
                description: `Low-urgency air freight can be shifted to rail, massively reducing emissions with minimal delivery impact.`,
                shipmentIds: ids,
                co2_savings_kg: co2Savings,
                cost_savings_usd: costSavings,
                priority: 'high',
                applied: false,
            });
        });
    }

    // 3. DELAY: Non-urgent shipments that could wait for a fuller truck
    const truckNonUrgent = shipments.filter(
        s => s.vehicle_type === 'Truck' && s.urgency_level === 'Low' && s.load_factor < 0.5
    );
    if (truckNonUrgent.length > 3) {
        const ids = truckNonUrgent.slice(0, 10).map(s => s.shipment_id);
        const currentCO2 = truckNonUrgent.slice(0, 10).reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
        const co2Savings = currentCO2 * 0.4;
        const costSavings = truckNonUrgent.slice(0, 10).reduce((sum, s) => sum + calculateShipmentCost(s), 0) * 0.3;

        suggestions.push({
            id: `OPT-${++sugId}`,
            type: 'delay',
            title: `Batch ${ids.length} low-priority truck shipments`,
            description: `Delay non-urgent truck shipments by 1-2 days to combine with other loads headed in the same direction.`,
            shipmentIds: ids,
            co2_savings_kg: co2Savings,
            cost_savings_usd: costSavings,
            priority: 'medium',
            applied: false,
        });
    }

    return suggestions.sort((a, b) => b.co2_savings_kg - a.co2_savings_kg);
}

/**
 * Calculate totals for applied suggestions
 */
export function calculateSuggestionTotals(suggestions: OptimizationSuggestion[]) {
    const applied = suggestions.filter(s => s.applied);
    return {
        totalCO2Savings: applied.reduce((sum, s) => sum + s.co2_savings_kg, 0),
        totalCostSavings: applied.reduce((sum, s) => sum + s.cost_savings_usd, 0),
        appliedCount: applied.length,
        totalCount: suggestions.length,
    };
}

/**
 * Generate Sankey diagram data for current vs optimized flow
 */
export function generateSankeyData(shipments: Shipment[], suggestions: OptimizationSuggestion[]) {
    // Group by vehicle type
    const modeGroups = new Map<string, { current: number; optimized: number }>();
    const shipmentById = new Map<string, Shipment>();

    shipments.forEach((s) => {
        shipmentById.set(s.shipment_id, s);
        const co2 = calculateShipmentCO2(s);
        if (!modeGroups.has(s.vehicle_type)) {
            modeGroups.set(s.vehicle_type, { current: 0, optimized: 0 });
        }
        const grp = modeGroups.get(s.vehicle_type)!;
        grp.current += co2;
        grp.optimized += co2;
    });

    // Apply suggestion impacts by distributing savings across involved vehicle types
    const appliedSuggestions = suggestions.filter((s) => s.applied && s.co2_savings_kg > 0);

    appliedSuggestions.forEach((sug) => {
        const involved: Shipment[] = [];

        sug.shipmentIds.forEach((id) => {
            const shipment = shipmentById.get(id);
            if (shipment) involved.push(shipment);
        });

        if (involved.length === 0) return;

        const totalCO2 = involved.reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
        if (totalCO2 <= 0) return;

        involved.forEach((s) => {
            const group = modeGroups.get(s.vehicle_type);
            if (!group) return;

            const co2 = calculateShipmentCO2(s);
            const share = co2 / totalCO2;
            const savingForThisShipment = sug.co2_savings_kg * share;

            group.optimized = Math.max(0, group.optimized - savingForThisShipment);
        });
    });

    return Array.from(modeGroups.entries()).map(([name, data]) => ({
        name,
        current: Math.max(0, Math.round(data.current)),
        optimized: Math.max(0, Math.round(data.optimized)),
        savings: Math.max(0, Math.round(data.current - data.optimized)),
    }));
}

/**
 * Fuel-type CO₂ savings (before vs after) to explain where reductions come from.
 */
export function generateFuelSavingsData(
    shipments: Shipment[],
    suggestions: OptimizationSuggestion[],
) {
    const fuelMap = new Map<
        string,
        {
            fuelType: string;
            baseline: number;
            optimized: number;
        }
    >();

    const shipmentById = new Map<string, Shipment>();

    // Baseline per fuel type
    shipments.forEach((s) => {
        shipmentById.set(s.shipment_id, s);
        const key = s.fuel_type;
        const co2 = calculateShipmentCO2(s);

        if (!fuelMap.has(key)) {
            fuelMap.set(key, {
                fuelType: key,
                baseline: 0,
                optimized: 0,
            });
        }

        const entry = fuelMap.get(key)!;
        entry.baseline += co2;
        entry.optimized += co2;
    });

    // Apply suggestion impacts by distributing savings across the fuel types
    const applied = suggestions.filter((s) => s.applied && s.co2_savings_kg > 0);

    applied.forEach((sug) => {
        const involved: Shipment[] = [];

        sug.shipmentIds.forEach((id) => {
            const shipment = shipmentById.get(id);
            if (shipment) involved.push(shipment);
        });

        if (involved.length === 0) return;

        const totalCO2 = involved.reduce((sum, s) => sum + calculateShipmentCO2(s), 0);
        if (totalCO2 <= 0) return;

        involved.forEach((s) => {
            const co2 = calculateShipmentCO2(s);
            const share = co2 / totalCO2;
            const savingForThisShipment = sug.co2_savings_kg * share;
            const key = s.fuel_type;
            const entry = fuelMap.get(key);
            if (!entry) return;
            entry.optimized = Math.max(0, entry.optimized - savingForThisShipment);
        });
    });

    const result = Array.from(fuelMap.values())
        .map((row) => {
            const baseline = Math.max(0, Math.round(row.baseline));
            const optimized = Math.max(0, Math.round(row.optimized));
            const savings = Math.max(0, baseline - optimized);
            const reductionPct = baseline > 0 ? (savings / baseline) * 100 : 0;

            return {
                fuelType: row.fuelType,
                baseline,
                optimized,
                savings,
                reductionPct,
            };
        })
        .filter((row) => row.savings > 0)
        .sort((a, b) => b.savings - a.savings);

    return result;
}

/**
 * Lane-level CO₂ savings (before vs after) to highlight where optimization works best.
 */
export function generateLaneSavingsData(
    shipments: Shipment[],
    suggestions: OptimizationSuggestion[],
) {
    const laneMap = new Map<
        string,
        {
            lane: string;
            baseline: number;
            optimized: number;
        }
    >();

    const shipmentById = new Map<string, Shipment>();

    // Baseline per lane
    shipments.forEach((s) => {
        shipmentById.set(s.shipment_id, s);
        const key = `${s.origin_city} → ${s.destination_city}`;
        const co2 = calculateShipmentCO2(s);

        if (!laneMap.has(key)) {
            laneMap.set(key, {
                lane: key,
                baseline: 0,
                optimized: 0,
            });
        }

        const laneEntry = laneMap.get(key)!;
        laneEntry.baseline += co2;
        laneEntry.optimized += co2;
    });

    // Apply suggestion impacts per lane (based on applied suggestions only)
    const applied = suggestions.filter((s) => s.applied && s.co2_savings_kg > 0);

    applied.forEach((sug) => {
        const laneKeys = new Set<string>();

        sug.shipmentIds.forEach((id) => {
            const shipment = shipmentById.get(id);
            if (!shipment) return;
            const key = `${shipment.origin_city} → ${shipment.destination_city}`;
            laneKeys.add(key);
        });

        if (laneKeys.size === 0) return;

        const perLaneSaving = sug.co2_savings_kg / laneKeys.size;

        laneKeys.forEach((key) => {
            const laneEntry = laneMap.get(key);
            if (!laneEntry) return;
            laneEntry.optimized = Math.max(0, laneEntry.optimized - perLaneSaving);
        });
    });

    const result = Array.from(laneMap.values())
        .map((lane) => {
            const baseline = Math.max(0, Math.round(lane.baseline));
            const optimized = Math.max(0, Math.round(lane.optimized));
            const savings = Math.max(0, baseline - optimized);
            return {
                lane: lane.lane,
                baseline,
                optimized,
                savings,
            };
        })
        .filter((row) => row.savings > 0)
        .sort((a, b) => b.savings - a.savings);

    return result;
}

