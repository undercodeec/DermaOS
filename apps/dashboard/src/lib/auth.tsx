import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, clearToken, ApiError } from "./api";
import type { Profile } from "./types";

export type LoginOutcome =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; emailVerificationRequired: true; emailMasked?: string };

export type RegisterOutcome =
  | { ok: true }
  | { ok: false; emailVerificationRequired: true; emailMasked?: string }
  | { ok: false; error: string };

interface LoginResponse {
  token?: string;
  profile?: Profile;
  emailVerificationRequired?: boolean;
  emailMasked?: string;
}

interface RegisterResponse {
  token?: string;
  profile?: Profile;
  emailVerificationRequired?: boolean;
  emailMasked?: string;
}

interface VerifyRegistrationResponse {
  token: string;
  profile: Profile;
}

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, emailCode?: string) => Promise<LoginOutcome>;
  signUp: (input: {
    clinicName: string;
    ruc?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<RegisterOutcome>;
  verifyRegistration: (adminEmail: string, emailCode: string) => Promise<LoginOutcome>;
  requestPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  confirmPasswordReset: (email: string, code: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
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
        queryClient.clear();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [queryClient]);

  useEffect(() => {
    const clearSession = () => {
      clearToken();
      setProfile(null);
      queryClient.clear();
    };
    window.addEventListener("derma:unauthorized", clearSession);
    return () => window.removeEventListener("derma:unauthorized", clearSession);
  }, [queryClient]);

  const signIn = async (email: string, password: string, emailCode?: string): Promise<LoginOutcome> => {
    try {
      const body: Record<string, string> = { email, password };
      if (emailCode) body.emailCode = emailCode;
      const r = await api.post<LoginResponse>("/auth/login", body);
      if (r.emailVerificationRequired) {
        return { ok: false, emailVerificationRequired: true, emailMasked: r.emailMasked };
      }
      if (r.token && r.profile) {
        queryClient.clear();
        setToken(r.token);
        setProfile(r.profile);
        return { ok: true };
      }
      return { ok: false, error: "Respuesta inesperada del servidor" };
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" };
    }
  };

  const signUp = async (input: {
    clinicName: string;
    ruc?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<RegisterOutcome> => {
    try {
      const payload = {
        clinicName: input.clinicName,
        ruc: input.ruc?.trim() || undefined,
        adminName: input.adminName,
        adminEmail: input.adminEmail,
        adminPassword: input.adminPassword,
      };
      const registered = await api.post<RegisterResponse>("/clinics/register", payload);
      if (registered.token && registered.profile) {
        queryClient.clear();
        setToken(registered.token);
        setProfile(registered.profile);
        return { ok: true };
      }
      if (registered.emailVerificationRequired) {
        return { ok: false, emailVerificationRequired: true, emailMasked: registered.emailMasked };
      }
      return { ok: false, error: "Respuesta inesperada del servidor" };
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" };
    }
  };

  const verifyRegistration = async (adminEmail: string, emailCode: string): Promise<LoginOutcome> => {
    try {
      const r = await api.post<VerifyRegistrationResponse>("/clinics/verify-email", { adminEmail, emailCode });
      queryClient.clear();
      setToken(r.token);
      setProfile(r.profile);
      return { ok: true };
    } catch (e) {
      clearToken();
      setProfile(null);
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await api.post("/auth/password-reset/request", { email });
      return { ok: true } as const;
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" } as const;
    }
  };

  const confirmPasswordReset = async (email: string, code: string, password: string) => {
    try {
      await api.post("/auth/password-reset/confirm", { email, code, password });
      return { ok: true } as const;
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : "Error de red" } as const;
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
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, verifyRegistration, requestPasswordReset, confirmPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de <AuthProvider>");
  return ctx;
}
