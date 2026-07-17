import { API_BASE } from "@/lib/api";

const KEY = "derma_platform_key";

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

export function getPlatformKey() {
  return sessionStorage.getItem(KEY) ?? "";
}

export function setPlatformKey(key: string) {
  sessionStorage.setItem(KEY, key);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-platform-key": getPlatformKey(),
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
    throw new Error(msg);
  }
  return (await res.json()) as T;
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
