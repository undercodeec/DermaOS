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

export interface AdminProfessional extends Professional {
  users: Array<Pick<AdminUser, "id" | "fullName" | "email" | "role">>;
}

export interface NewProfessionalInput {
  name: string;
  specialty: string;
  registrationNo: string;
  color: string;
  userId?: string | null;
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

export interface ClinicBranding {
  name: string;
  ruc: string | null;
  logoData: string | null;
}

export interface AdminConsentTemplate {
  id: string;
  kind: "clinico" | "imagen";
  title: string;
  procedureType: string;
  body: string;
  status: "borrador" | "aprobada" | "archivada";
  seriesId: string;
  version: number;
  sourceName: string | null;
  sourceMime: string | null;
  sourceSha256: string | null;
  hasSource: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  allowedRoles: Array<"admin" | "profesional" | "esteticista">;
}

export interface ConsentTemplateInput {
  kind: "clinico" | "imagen";
  title: string;
  procedureType: string;
  body: string;
  allowedRoles: Array<"admin" | "profesional" | "esteticista">;
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

export function listAdminProfessionals(): Promise<AdminProfessional[]> {
  return api.get<AdminProfessional[]>("/admin/professionals");
}

export function createProfessional(input: NewProfessionalInput): Promise<AdminProfessional> {
  return api.post<AdminProfessional>("/admin/professionals", input);
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

export function getClinicBranding(): Promise<ClinicBranding> {
  return api.get<ClinicBranding>("/admin/clinic-branding");
}

export function uploadClinicLogo(file: File): Promise<{ logoData: string }> {
  const data = new FormData();
  data.append("file", file);
  return api.post<{ logoData: string }>("/admin/clinic-branding/logo", data);
}

export function removeClinicLogo(): Promise<null> {
  return api.del<null>("/admin/clinic-branding/logo");
}

export function listAdminConsentTemplates(): Promise<AdminConsentTemplate[]> {
  return api.get<AdminConsentTemplate[]>("/admin/consent-templates");
}

export function createConsentTemplate(input: ConsentTemplateInput): Promise<AdminConsentTemplate> {
  return api.post<AdminConsentTemplate>("/admin/consent-templates", input);
}

export function updateConsentTemplate(id: string, input: ConsentTemplateInput): Promise<AdminConsentTemplate> {
  return api.patch<AdminConsentTemplate>(`/admin/consent-templates/${id}`, input);
}

export function importConsentTemplate(input: Omit<ConsentTemplateInput, "body"> & { file: File }): Promise<AdminConsentTemplate> {
  const data = new FormData();
  data.append("file", input.file);
  data.append("kind", input.kind);
  data.append("title", input.title);
  data.append("procedureType", input.procedureType);
  data.append("allowedRoles", JSON.stringify(input.allowedRoles));
  return api.post<AdminConsentTemplate>("/admin/consent-templates/import", data);
}

export function approveConsentTemplate(id: string): Promise<AdminConsentTemplate> {
  return api.post<AdminConsentTemplate>(`/admin/consent-templates/${id}/approve`);
}

export function newConsentTemplateVersion(id: string): Promise<AdminConsentTemplate> {
  return api.post<AdminConsentTemplate>(`/admin/consent-templates/${id}/new-version`);
}

export function archiveConsentTemplate(id: string): Promise<AdminConsentTemplate> {
  return api.post<AdminConsentTemplate>(`/admin/consent-templates/${id}/archive`);
}

export function deleteConsentTemplate(id: string): Promise<null> {
  return api.del<null>(`/admin/consent-templates/${id}`);
}

export async function downloadConsentTemplateSource(template: AdminConsentTemplate) {
  const response = await api.raw(`/admin/consent-templates/${template.id}/source`);
  const blob = await response.blob();
  downloadBlob(blob, template.sourceName || "documento-original");
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
