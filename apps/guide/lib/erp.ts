import type { Db, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";

type Money = number;

type PurchaseInput = {
  date: string | Date;
  supplier: string;
  bags_purchased: number;
  unit_price: Money;
  car_transport_cost?: Money;
  boat_transport_cost?: Money;
  other_costs?: Money;
};

export type PurchaseRecord = {
  _id: string;
  id: string;
  date: Date;
  supplier: string;
  bags_purchased: number;
  unit_price: Money;
  car_transport_cost: Money;
  boat_transport_cost: Money;
  other_costs: Money;
  total_landed_cost: Money;
  cost_per_bag: Money;
  created_at: Date;
};

export type InventoryRecord = {
  _id: string;
  id: string;
  purchase_id: string;
  bags_remaining: number;
  created_at: Date;
};

export type SaleRecord = {
  _id: string;
  id: string;
  date: Date;
  customer: string;
  bags_sold: number;
  price_per_bag: Money;
  total_sale_value: Money;
  purchase_id: string;
  payment_status: "paid" | "pending";
  profit: Money;
  created_at: Date;
};

export async function getErpDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "erp");
}

export function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}

export function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error("Invalid number");
  }
  return num;
}

export function calcPurchaseTotals(input: PurchaseInput) {
  const car = normalizeNumber(input.car_transport_cost, 0);
  const boat = normalizeNumber(input.boat_transport_cost, 0);
  const other = normalizeNumber(input.other_costs, 0);
  const unit = normalizeNumber(input.unit_price, 0);
  const bags = normalizeNumber(input.bags_purchased, 0);
  if (bags <= 0) {
    throw new Error("bags_purchased must be greater than 0");
  }
  if (unit < 0 || car < 0 || boat < 0 || other < 0) {
    throw new Error("Costs must be 0 or greater");
  }
  const total = unit * bags + car + boat + other;
  const costPerBag = total / bags;
  return {
    car_transport_cost: car,
    boat_transport_cost: boat,
    other_costs: other,
    unit_price: unit,
    bags_purchased: bags,
    total_landed_cost: total,
    cost_per_bag: costPerBag,
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function safeToArray<T extends Document>(cursor: Promise<T[]>) {
  return cursor;
}
