import type { Collection, Db } from "mongodb";
import clientPromise from "../mongodb";
import type { InventoryItem, Purchase, Sale } from "./types";

const DB_NAME = process.env.MONGODB_DB ?? "maio_erp";

let indexesPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db) {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db.collection<Purchase>("purchases").createIndex({ date: -1 }),
      db.collection<Purchase>("purchases").createIndex({ supplier: 1 }),
      db.collection<InventoryItem>("inventory").createIndex({ purchase_id: 1 }, { unique: true }),
      db.collection<InventoryItem>("inventory").createIndex({ purchase_date: 1 }),
      db.collection<Sale>("sales").createIndex({ date: -1 }),
      db.collection<Sale>("sales").createIndex({ customer: 1 }),
      db.collection<Sale>("sales").createIndex({ sale_group_id: 1 }),
      db.collection<Sale>("sales").createIndex({ purchase_id: 1 })
    ]).then(() => undefined);
  }
  await indexesPromise;
}

export async function getErpDb() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

export async function getErpCollections() {
  const db = await getErpDb();
  return {
    purchases: db.collection<Purchase>("purchases"),
    inventory: db.collection<InventoryItem>("inventory"),
    sales: db.collection<Sale>("sales")
  };
}
