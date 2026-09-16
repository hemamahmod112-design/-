import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken, hashPassword, isValidEmail, isValidPassword, verifyPassword } from "./_core/localAuth";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createLocalUser, createProduct, deleteProduct, getSettings, getUserByEmail, listAllProducts, listOrders, listOrdersForCustomerById, listProducts, touchLastSignedIn, updateOrderStatus, updateProduct, updateSettings } from "./db";

const authInput = z.object({
  email: z.string().min(3).max(320),
  password: z.string().min(1),
});

const registerInput = authInput.extend({
  name: z.string().min(1).max(120),
  type: z.enum(["user", "seller"]).default("user"),
});

const productInput = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(2),
  priceMinor: z.number().int().positive(),
  compareAtMinor: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  stock: z.number().int().min(0),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(registerInput).mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();
      if (!isValidEmail(email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "بريد إلكتروني غير صالح" });
      }
      if (!isValidPassword(input.password)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور لازم تكون 8 أحرف على الأقل" });
      }
      const existing = await getUserByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل بالفعل" });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await createLocalUser({ name: input.name.trim(), email, passwordHash, requestedRole: input.type });
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب" });
      }

      const token = await createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user } as const;
    }),
    login: publicProcedure.input(authInput).mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();
      const user = await getUserByEmail(email);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      await touchLastSignedIn(user.id);
      const token = await createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  store: router({
    products: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional()).query(({ input }) => listProducts(input?.search, input?.category)),
    settings: publicProcedure.query(() => getSettings()),
  }),
  customer: router({
    orders: protectedProcedure.query(({ ctx }) => listOrdersForCustomerById(ctx.user.id)),
  }),
  admin: router({
    products: adminProcedure.query(() => listAllProducts()),
    createProduct: adminProcedure.input(productInput).mutation(({ input }) => createProduct(input)),
    updateProduct: adminProcedure.input(z.object({ id: z.number().int(), data: productInput.partial() })).mutation(({ input }) => updateProduct(input.id, input.data)),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => deleteProduct(input.id)),
    orders: adminProcedure.query(() => listOrders()),
    updateOrderStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["new", "processing", "shipped", "completed", "cancelled"]) })).mutation(({ input }) => updateOrderStatus(input.id, input.status)),
    settings: adminProcedure.query(() => getSettings()),
    updateSettings: adminProcedure.input(z.record(z.string(), z.string())).mutation(({ input }) => updateSettings(input)),
  }),
});

export type AppRouter = typeof appRouter;
