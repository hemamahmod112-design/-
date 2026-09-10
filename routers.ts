import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createProduct, deleteProduct, getSettings, listAllProducts, listOrders, listProducts, updateOrderStatus, updateProduct, updateSettings } from "./db";

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
