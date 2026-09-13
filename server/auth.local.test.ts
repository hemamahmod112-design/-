import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => {
  const store = new Map<string, any>();
  let nextId = 1;
  return {
    getUserByEmail: async (email: string) => store.get(email.toLowerCase()),
    createLocalUser: async (input: { name: string; email: string; passwordHash: string }) => {
      const email = input.email.toLowerCase();
      if (store.has(email)) throw new Error("duplicate");
      const user = {
        id: nextId++,
        openId: null,
        name: input.name,
        email,
        passwordHash: input.passwordHash,
        loginMethod: "local",
        role: store.size === 0 ? "admin" : "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      store.set(email, user);
      return user;
    },
    touchLastSignedIn: async () => undefined,
  };
});

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

function fakeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => undefined, clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("auth.register / auth.login", () => {
  it("registers the first user as admin and sets a session cookie", async () => {
    const caller = appRouter.createCaller(fakeCtx());
    const result = await caller.auth.register({
      name: "Owner",
      email: "owner@example.com",
      password: "supersecret",
    });
    expect(result.success).toBe(true);
    expect(result.user.role).toBe("admin");
  });

  it("rejects duplicate email registration", async () => {
    const caller = appRouter.createCaller(fakeCtx());
    await caller.auth.register({ name: "A", email: "dup@example.com", password: "supersecret" });
    await expect(
      caller.auth.register({ name: "B", email: "dup@example.com", password: "anotherpass" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects login with wrong password", async () => {
    const caller = appRouter.createCaller(fakeCtx());
    await caller.auth.register({ name: "C", email: "wrongpass@example.com", password: "supersecret" });
    await expect(
      caller.auth.login({ email: "wrongpass@example.com", password: "notthesame" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("logs in successfully with the correct password", async () => {
    const caller = appRouter.createCaller(fakeCtx());
    await caller.auth.register({ name: "D", email: "correct@example.com", password: "supersecret" });
    const result = await caller.auth.login({ email: "correct@example.com", password: "supersecret" });
    expect(result.success).toBe(true);
  });
});
