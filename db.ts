import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { defaultSettings, InsertProduct, InsertUser, orders, products, seedOrders, seedProducts, storeSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProducts(search?: string, category?: string) {
  const db = await getDb();
  if (!db) return seedProducts.filter(p => p.status === "active" && (!search || p.name.includes(search) || p.category.includes(search)) && (!category || category === "الكل" || p.category === category));
  const conditions = [eq(products.status, "active")];
  if (search) conditions.push(or(like(products.name, `%${search}%`), like(products.category, `%${search}%`)) as typeof conditions[number]);
  if (category && category !== "الكل") conditions.push(eq(products.category, category));
  const result = await db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));
  return result.length ? result : seedProducts.filter(p => p.status === "active" && (!search || p.name.includes(search) || p.category.includes(search)) && (!category || category === "الكل" || p.category === category));
}

export async function listAllProducts() {
  const db = await getDb();
  if (!db) return seedProducts;
  const result = await db.select().from(products).orderBy(desc(products.updatedAt));
  return result.length ? result : seedProducts;
}

export async function createProduct(input: InsertProduct) {
  const db = await getDb();
  if (!db) return { ...input, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as typeof seedProducts[number];
  const result = await db.insert(products).values(input);
  return { ...input, id: Number(result[0].insertId), createdAt: new Date(), updatedAt: new Date() } as typeof seedProducts[number];
}

export async function updateProduct(id: number, input: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return { id, ...input };
  await db.update(products).set(input).where(eq(products.id, id));
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return true;
  await db.delete(products).where(eq(products.id, id));
  return true;
}

export async function listOrders() {
  const db = await getDb();
  if (!db) return seedOrders;
  const result = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return result.length ? result : seedOrders;
}

export async function updateOrderStatus(id: number, status: "new" | "processing" | "shipped" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return { id, status };
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getSettings() {
  const db = await getDb();
  if (!db) return defaultSettings;
  const rows = await db.select().from(storeSettings);
  return rows.reduce((acc, row) => ({ ...acc, [row.settingKey]: row.settingValue }), defaultSettings);
}

export async function updateSettings(values: Record<string, string>) {
  const db = await getDb();
  if (!db) return { ...defaultSettings, ...values };
  for (const [settingKey, settingValue] of Object.entries(values)) {
    await db.insert(storeSettings).values({ settingKey, settingValue }).onDuplicateKeyUpdate({ set: { settingValue } });
  }
  return getSettings();
}
