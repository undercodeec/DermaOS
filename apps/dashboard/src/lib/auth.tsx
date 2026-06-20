import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken, ApiError } from "./api";
import type { Profile } from "./types";

export type LoginOutcome =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; mfaRequired: true }
  | { ok: false; mfaSetup: true; secret: string; otpauthUrl: string };

interface LoginResponse {
  token?: string;
  profile?: Profile;
  mfaRequired?: boolean;
  mfaSetup?: boolean;
  secret?: string;
  otpauthUrl?: string;
}

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, totpCode?: string) => Promise<LoginOutcome>;
  verifyMfaSetup: (email: string, password: string, totpCode: string) => Promise<LoginOutcome>;
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

  const signIn = async (email: string, password: string, totpCode?: string): Promise<LoginOutcome> => {
    try {
      const body: Record<string, string> = { email, password };
      if (totpCode) body.totpCode = totpCode;
      const r = await api.post<LoginResponse>("/auth/login", body);
      if (r.mfaSetup && r.secret && r.otpauthUrl) {
        return { ok: false, mfaSetup: true, secret: r.secret, otpauthUrl: r.otpauthUrl };
      }
      if (r.mfaRequired) return { ok: false, mfaRequired: true };
      if (r.token && r.profile) {
        setToken(r.token);
        setProfile(r.profile);
        return { ok: true };
      }
      return { ok: false, error: "Respuesta inesperada del servidor" };
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" };
    }
  };

  const verifyMfaSetup = async (email: string, password: string, totpCode: string): Promise<LoginOutcome> => {
    try {
      const r = await api.post<LoginResponse>("/auth/mfa/verify-setup", { email, password, totpCode });
      if (r.token && r.profile) {
        setToken(r.token);
        setProfile(r.profile);
        return { ok: true };
      }
      return { ok: false, error: "Respuesta inesperada" };
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" };
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
    <AuthContext.Provider value={{ profile, loading, signIn, verifyMfaSetup, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de <AuthProvider>");
  return ctx;
}
