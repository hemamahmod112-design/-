import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 80 }).notNull(),
  priceMinor: int("priceMinor").notNull(),
  compareAtMinor: int("compareAtMinor"),
  imageUrl: text("imageUrl"),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["active", "draft", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  totalMinor: int("totalMinor").notNull(),
  status: mysqlEnum("status", ["new", "processing", "shipped", "completed", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeSettings = mysqlTable("storeSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 80 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type StoreSetting = typeof storeSettings.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type InsertOrder = typeof orders.$inferInsert;
export type InsertStoreSetting = typeof storeSettings.$inferInsert;

export const seedProducts: Product[] = [
  { id: 1, name: "طقم عناية يومي بالبشرة", description: "روتين عناية عملي لبشرة نضرة", category: "الجمال والعناية", priceMinor: 12900, compareAtMinor: 16900, imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85", stock: 24, status: "active", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: "سماعات لاسلكية بإلغاء الضوضاء", description: "صوت واضح وبطارية طويلة", category: "إلكترونيات", priceMinor: 28900, compareAtMinor: 34900, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85", stock: 18, status: "active", createdAt: new Date(), updatedAt: new Date() },
  { id: 3, name: "حقيبة جلد طبيعي — إصدار محدود", description: "حقيبة عملية بلمسة فاخرة", category: "أزياء", priceMinor: 42000, compareAtMinor: 52000, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85", stock: 8, status: "active", createdAt: new Date(), updatedAt: new Date() },
  { id: 4, name: "طقم قهوة عربية فاخر", description: "تفاصيل أنيقة لضيافة لا تُنسى", category: "المنزل والمطبخ", priceMinor: 19500, compareAtMinor: 24000, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85", stock: 13, status: "active", createdAt: new Date(), updatedAt: new Date() },
];

export const seedOrders: Order[] = [
  { id: 1, orderNumber: "SN-1042", customerName: "سارة أحمد", customerEmail: "sara@example.com", totalMinor: 25800, status: "new", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, orderNumber: "SN-1039", customerName: "محمد علي", customerEmail: "mohamed@example.com", totalMinor: 28900, status: "processing", createdAt: new Date(), updatedAt: new Date() },
  { id: 3, orderNumber: "SN-1035", customerName: "ريم خالد", customerEmail: "reem@example.com", totalMinor: 8900, status: "shipped", createdAt: new Date(), updatedAt: new Date() },
];

export const defaultSettings = { currency: "SAR", currencySymbol: "ر.س", storeName: "سوقنا", shippingThresholdMinor: "25000" };
