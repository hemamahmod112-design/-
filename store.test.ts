import { describe, expect, it } from "vitest";
import { getSettings, listProducts } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = (user: TrpcContext["user"]): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

describe("store catalog", () => {
  it("returns currency settings with a safe default", async () => {
    const settings = await getSettings();
    expect(settings.currency).toBe("SAR");
    expect(settings.currencySymbol).toBe("ر.س");
  });

  it("returns an array for public product search", async () => {
    const products = await listProducts("سماعات");
    expect(Array.isArray(products)).toBe(true);
  });
});

describe("admin access", () => {
  it("rejects a regular user from admin product procedures", async () => {
    const caller = appRouter.createCaller(baseContext({
      id: 99,
      openId: "regular-user",
      name: "Regular User",
      email: "user@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));
    await expect(caller.admin.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
