"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode, useContext } from "react";

import { getMe, isAuthenticated, UserProfile } from "@/lib/api-client";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: getMe,
    enabled: isAuthenticated(),
    retry: false,
    staleTime: 60_000,
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
