import { describe, expect, it } from "vitest";
import { getSettings, listOrdersForCustomer, listProducts } from "./db";
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
      openId: null,
      name: "Regular User",
      email: "user@example.com",
      passwordHash: "$2a$12$fakeHashForTestingPurposesOnly000000000000000000000",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));
    await expect(caller.admin.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("customer orders access", () => {
  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(baseContext(null));
    await expect(caller.customer.orders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns only orders matching the customer email", async () => {
    const orders = await listOrdersForCustomer("SARA@EXAMPLE.COM");
    expect(orders).toHaveLength(1);
    expect(orders[0]?.customerEmail).toBe("sara@example.com");
  });
});
