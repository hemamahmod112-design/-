import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionTokenFromRequest, verifySessionToken } from "./localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = getSessionTokenFromRequest(opts.req);
    const session = await verifySessionToken(token);
    if (session) {
      user = (await db.getUserById(session.userId)) ?? null;
    }
  } catch (error) {
    // المصادقة اختيارية بالنسبة للإجراءات العامة (publicProcedure).
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
