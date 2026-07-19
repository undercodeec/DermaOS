import { API_BASE } from "@/lib/api";

const TOKEN_KEY = "derma_platform_token";

export interface PlatformProfile {
  email: string;
  role: "superadmin";
}

export interface PlatformLoginResponse {
  token: string;
  profile: PlatformProfile;
}

export interface PlatformClinic {
  id: string;
  name: string;
  ruc: string | null;
  active: boolean;
  createdAt: string;
  status: "pending_verification" | "trialing" | "active" | "expired" | "suspended";
  rawStatus: string;
  verifiedAt: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  daysLeft: number;
  allowedModules: string[];
  notes: string;
  admins: { id: string; fullName: string; email: string; active: boolean; role: string }[];
}

export interface PlatformPaymentLink {
  id: string;
  link: string;
  amount: string;
  months: number;
  clientTransactionId: string;
}

export function getPlatformToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function setPlatformToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearPlatformToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getPlatformToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.error) msg = json.error;
    } catch {
      /* body no json */
    }
    if (res.status === 401) clearPlatformToken();
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function loginPlatform(email: string, password: string) {
  return request<PlatformLoginResponse>("/platform/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function listPlatformClinics() {
  return request<PlatformClinic[]>("/platform/clinics");
}

export function startTrial(id: string, days = 7, allowedModules?: string[]) {
  return request<PlatformClinic>(`/platform/clinics/${id}/trial`, {
    method: "POST",
    body: JSON.stringify({ days, allowedModules }),
  });
}

export function extendSubscription(id: string, months = 1) {
  return request<PlatformClinic>(`/platform/clinics/${id}/extend`, {
    method: "POST",
    body: JSON.stringify({ months }),
  });
}

export function updateClinicAccess(
  id: string,
  input: { status?: string; active?: boolean; allowedModules?: string[]; notes?: string | null },
) {
  return request<PlatformClinic>(`/platform/clinics/${id}/access`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createSubscriptionPaymentLink(id: string, amount: number, months = 1) {
  return request<PlatformPaymentLink>(`/platform/clinics/${id}/payment-link`, {
    method: "POST",
    body: JSON.stringify({ amount, months }),
  });
}
