import { api } from "@/lib/api";
import type { Professional, Role } from "@/lib/types";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  mfaEnabled: boolean;
  professionalId: string | null;
  lastAccess: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  cat: string;
  label: string;
  at: string;
  ip: string | null;
  user: { fullName: string; role: Role } | null;
}

export interface PayphoneConfig {
  configured: boolean;
  provider: "payphone";
  mode: "manual";
  ruc: string;
  storeId: string;
  status: "missing" | "active" | "disabled";
  hasToken: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

export interface SavePayphoneConfigInput {
  ruc?: string | null;
  storeId: string;
  token?: string;
  status: "active" | "disabled";
}

export function listUsers(): Promise<AdminUser[]> {
  return api.get<AdminUser[]>("/admin/users");
}

export interface NewAdminUserInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  active?: boolean;
  mfaEnabled?: boolean;
  professionalId?: string | null;
}

export interface UpdateAdminUserInput {
  fullName?: string;
  email?: string;
  password?: string;
  role?: Role;
  active?: boolean;
  mfaEnabled?: boolean;
  professionalId?: string | null;
}

export function createUser(input: NewAdminUserInput): Promise<AdminUser> {
  return api.post<AdminUser>("/admin/users", input);
}

export function patchUser(
  id: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  return api.patch<AdminUser>(`/admin/users/${id}`, input);
}

export function listAdminProfessionals(): Promise<Professional[]> {
  return api.get<Professional[]>("/professionals");
}

export interface AuditFilter {
  cat?: string;
  from?: string;
  to?: string;
  take?: number;
}

export function listAuditLogs(filter: AuditFilter = {}): Promise<AuditLogEntry[]> {
  const qs = new URLSearchParams();
  Object.entries(filter).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return api.get<AuditLogEntry[]>(`/admin/audit-logs${q ? `?${q}` : ""}`);
}

export function getPayphoneConfig(): Promise<PayphoneConfig> {
  return api.get<PayphoneConfig>("/admin/payphone");
}

export function savePayphoneConfig(input: SavePayphoneConfigInput): Promise<PayphoneConfig> {
  return api.put<PayphoneConfig>("/admin/payphone", input);
}
