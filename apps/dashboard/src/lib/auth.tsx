import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  const signIn = async (email: string, password: string, emailCode?: string): Promise<LoginOutcome> => {
    try {
      const body: Record<string, string> = { email, password };
      if (emailCode) body.emailCode = emailCode;
      const r = await api.post<LoginResponse>("/auth/login", body);
      if (r.emailVerificationRequired) {
        return { ok: false, emailVerificationRequired: true, emailMasked: r.emailMasked };
      }
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
      setToken(r.token);
      setProfile(r.profile);
      return { ok: true };
    } catch (e) {
      clearToken();
      setProfile(null);
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
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, verifyRegistration, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de <AuthProvider>");
  return ctx;
}
