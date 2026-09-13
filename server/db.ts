import { and, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { defaultSettings, InsertProduct, orders, products, seedOrders, seedProducts, storeSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// أول مستخدم يتسجل في المنصة (أو أي مستخدم بريده يطابق OWNER_EMAIL) يترقّى تلقائياً لـ admin.
export async function createLocalUser(input: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured (DATABASE_URL missing)");

  const email = input.email.toLowerCase();
  const [{ value: existingCount }] = await db.select({ value: count() }).from(users);
  const isFirstUser = existingCount === 0;
  const isOwnerEmail = ENV.ownerEmail !== "" && email === ENV.ownerEmail.toLowerCase();
  const role: "user" | "admin" = isFirstUser || isOwnerEmail ? "admin" : "user";

  const result = await db.insert(users).values({ name: input.name, email, passwordHash: input.passwordHash, role, lastSignedIn: new Date() });
  return getUserById(Number(result[0].insertId));
}

export async function touchLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
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

export async function listOrdersForCustomer(email: string) {
  const db = await getDb();
  if (!db) return seedOrders.filter(order => order.customerEmail?.toLowerCase() === email.toLowerCase());
  return db.select().from(orders).where(eq(orders.customerEmail, email.toLowerCase())).orderBy(desc(orders.createdAt));
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

export async function listOrdersForCustomerById(userId: number) {
  const user = await getUserById(userId);
  return user?.email ? listOrdersForCustomer(user.email) : [];
}
