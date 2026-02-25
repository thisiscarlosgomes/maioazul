export type PaymentStatus = "paid" | "pending";

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  bags_purchased: number;
  unit_price: number;
  car_transport_cost: number;
  boat_transport_cost: number;
  other_costs: number;
  total_landed_cost: number;
  cost_per_bag: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  purchase_id: string;
  purchase_date: string;
  supplier: string;
  cost_per_bag: number;
  bags_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sale_group_id: string;
  date: string;
  customer: string;
  bags_sold: number;
  price_per_bag: number;
  total_sale_value: number;
  purchase_id: string;
  payment_status: PaymentStatus;
  cost_per_bag: number;
  profit: number;
  created_at: string;
  updated_at: string;
}
