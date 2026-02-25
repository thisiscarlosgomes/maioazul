export function computeTotalLandedCost(input: {
  unit_price: number;
  bags_purchased: number;
  car_transport_cost?: number;
  boat_transport_cost?: number;
  other_costs?: number;
}) {
  const car = input.car_transport_cost ?? 0;
  const boat = input.boat_transport_cost ?? 0;
  const other = input.other_costs ?? 0;
  return input.unit_price * input.bags_purchased + car + boat + other;
}

export function computeCostPerBag(totalLandedCost: number, bagsPurchased: number) {
  if (bagsPurchased <= 0) return 0;
  return totalLandedCost / bagsPurchased;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
