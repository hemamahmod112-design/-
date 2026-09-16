import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type RegistrationType = "user" | "seller";

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: data => {
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: data => {
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, type: RegistrationType = "user") => {
      await registerMutation.mutateAsync({ name, email, password, type });
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? loginMutation.error ?? registerMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending, loginMutation.error, registerMutation.error]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    navigate(redirectPath);
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user, navigate]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    register,
    logout,
    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
  };
}
