import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken, ApiError } from "./api";
import type { Profile } from "./types";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get<{ profile: Profile }>("/auth/me")
      .then((r) => {
        if (mounted) setProfile(r.profile);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const r = await api.post<{ token: string; profile: Profile }>("/auth/login", {
        email,
        password,
      });
      setToken(r.token);
      setProfile(r.profile);
      return { error: null };
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : "Error de red" };
    }
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearToken();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de <AuthProvider>");
  return ctx;
}
