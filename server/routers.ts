import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { User } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken, hashPassword, isValidEmail, isValidPassword, verifyPassword } from "./_core/localAuth";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router, sellerProcedure } from "./_core/trpc";
import { createLocalUser, createProduct, createStoreForOwner, deleteProduct, deleteProductForStore, getSettings, getStoreByOwnerId, getUserByEmail, listAllProducts, listOrders, listOrdersForCustomerById, listProducts, listProductsForStore, touchLastSignedIn, updateOrderStatus, updateProduct, updateProductForStore, updateSettings } from "./db";

const authInput = z.object({ email: z.string().min(3).max(320), password: z.string().min(1) });
const registerInput = authInput.extend({ name: z.string().min(1).max(120), type: z.enum(["user", "seller"]).default("user") });
const productInput = z.object({
  name: z.string().trim().min(2).max(180), description: z.string().max(5000).optional(), category: z.string().trim().min(2).max(80),
  priceMinor: z.number().int().positive(), compareAtMinor: z.number().int().positive().optional(), imageUrl: z.string().url().optional(),
  stock: z.number().int().min(0), status: z.enum(["active", "draft", "archived"]).default("active"),
});
const settingsInput = z.object({ currency: z.enum(["SAR", "AED", "USD", "EGP"]).optional(), currencySymbol: z.string().max(8).optional(), storeName: z.string().trim().min(2).max(120).optional() }).strict();
const storeInput = z.object({ name: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط"), description: z.string().max(5000).optional(), logoUrl: z.string().url().optional() });

/** Only safe, non-sensitive user fields may cross the API boundary. */
function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? toPublicUser(opts.ctx.user) : null),
    register: publicProcedure.input(registerInput).mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase(); const name = input.name.trim();
      if (!isValidEmail(email)) throw new TRPCError({ code: "BAD_REQUEST", message: "بريد إلكتروني غير صالح" });
      if (name.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "الاسم يجب أن يكون حرفين على الأقل" });
      if (!isValidPassword(input.password)) throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور لازم تكون 8 أحرف على الأقل" });
      if (await getUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل بالفعل" });
      const user = await createLocalUser({ name, email, passwordHash: await hashPassword(input.password), requestedRole: input.type });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب" });
      const token = await createSessionToken(user.id); const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user: toPublicUser(user) } as const;
    }),
    login: publicProcedure.input(authInput).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email.trim().toLowerCase());
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      await touchLastSignedIn(user.id); const token = await createSessionToken(user.id); const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user: toPublicUser(user) } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  store: router({
    products: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional()).query(({ input }) => listProducts(input?.search, input?.category)),
    settings: publicProcedure.query(() => getSettings()),
  }),
  customer: router({ orders: protectedProcedure.query(({ ctx }) => listOrdersForCustomerById(ctx.user.id)) }),
  seller: router({
    me: sellerProcedure.query(({ ctx }) => getStoreByOwnerId(ctx.user.id)),
    createStore: sellerProcedure.input(storeInput).mutation(async ({ input, ctx }) => {
      if (await getStoreByOwnerId(ctx.user.id)) throw new TRPCError({ code: "CONFLICT", message: "لديك متجر مسجل بالفعل" });
      try { return createStoreForOwner({ ...input, ownerId: ctx.user.id }); }
      catch (error) { if (String(error).toLowerCase().includes("duplicate")) throw new TRPCError({ code: "CONFLICT", message: "رابط المتجر مستخدم بالفعل" }); throw error; }
    }),
    products: sellerProcedure.query(async ({ ctx }) => { const store = await getStoreByOwnerId(ctx.user.id); return store ? listProductsForStore(store.id) : []; }),
    createProduct: sellerProcedure.input(productInput).mutation(async ({ input, ctx }) => { const store = await getStoreByOwnerId(ctx.user.id); if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "أنشئ متجرك أولاً" }); return createProduct({ ...input, storeId: store.id }); }),
    updateProduct: sellerProcedure.input(z.object({ id: z.number().int(), data: productInput.partial() })).mutation(async ({ input, ctx }) => { const store = await getStoreByOwnerId(ctx.user.id); if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "أنشئ متجرك أولاً" }); const result = await updateProductForStore(store.id, input.id, input.data); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود في متجرك" }); return result; }),
    deleteProduct: sellerProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { const store = await getStoreByOwnerId(ctx.user.id); if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "أنشئ متجرك أولاً" }); return deleteProductForStore(store.id, input.id); }),
  }),
  admin: router({
    products: adminProcedure.query(() => listAllProducts()),
    createProduct: adminProcedure.input(productInput).mutation(({ input }) => createProduct(input)),
    updateProduct: adminProcedure.input(z.object({ id: z.number().int(), data: productInput.partial() })).mutation(({ input }) => updateProduct(input.id, input.data)),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => deleteProduct(input.id)),
    orders: adminProcedure.query(() => listOrders()),
    updateOrderStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["new", "processing", "shipped", "completed", "cancelled"]) })).mutation(({ input }) => updateOrderStatus(input.id, input.status)),
    settings: adminProcedure.query(() => getSettings()),
    updateSettings: adminProcedure.input(settingsInput).mutation(({ input }) => updateSettings(Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === "string")))),
  }),
});

export type AppRouter = typeof appRouter;
