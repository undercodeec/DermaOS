import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

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

export function listUsers(): Promise<AdminUser[]> {
  return api.get<AdminUser[]>("/admin/users");
}

export function patchUser(
  id: string,
  input: { active?: boolean; mfaEnabled?: boolean; role?: Role },
): Promise<AdminUser> {
  return api.patch<AdminUser>(`/admin/users/${id}`, input);
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
