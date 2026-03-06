import { Shipment } from '../types';

export interface InefficientShipment extends Shipment {
  inefficiency_score: number;
  reasons: string[];
}

export function detectInefficiencies(shipments: Shipment[]): InefficientShipment[] {
  return shipments
    .filter(s => s.load_factor < 0.5 || (s.vehicle_type === 'Air' && s.urgency_level === 'Low'))
    .map(s => {
      const reasons: string[] = [];
      let score = 0;

      if (s.load_factor < 0.5) {
        reasons.push(`Low Load Factor (${(s.load_factor * 100).toFixed(0)}%)`);
        score += (0.5 - s.load_factor) * 10; // weight lower load factor more
      }
      if (s.vehicle_type === 'Air' && s.urgency_level === 'Low') {
        reasons.push('Low Urgency Air Freight');
        score += 5; // significant penalty
      }

      // Multiply by distance to account for absolute waste
      score *= (s.distance_km / 1000); 

      return {
        ...s,
        inefficiency_score: score,
        reasons,
      };
    });
}

export function rankInefficiencies(shipments: Shipment[]): InefficientShipment[] {
  return detectInefficiencies(shipments).sort((a, b) => b.inefficiency_score - a.inefficiency_score);
}
