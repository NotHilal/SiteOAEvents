// Two return trips: drop-off and collection, each starting at the depot.
export const DELIVERY_TRIP_COUNT = 4
export const DEFAULT_DELIVERY_PER_KM = 0.75

export function deliveryFee(distanceKm, perKm, baseFee = 0) {
  return Math.round((baseFee + DELIVERY_TRIP_COUNT * distanceKm * perKm) * 100) / 100
}
