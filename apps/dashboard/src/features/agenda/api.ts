import { api } from "@/lib/api";
import type { Appointment, AppointmentCoverage, AppointmentKind, AppointmentStatus } from "@/lib/types";

export interface ListAppointmentsParams {
  from?: string;
  to?: string;
  professionalId?: string;
}

export function listAppointments(params: ListAppointmentsParams = {}): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.professionalId) qs.set("professionalId", params.professionalId);
  const q = qs.toString();
  return api.get<Appointment[]>(`/appointments${q ? `?${q}` : ""}`);
}

export interface CreateAppointmentInput {
  patientId: string;
  serviceId: string;
  professionalId: string;
  startAt: string;
  endAt?: string;
  kind: AppointmentKind;
  notes?: string | null;
}

export function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  return api.post<Appointment>("/appointments", input);
}

export interface PatchAppointmentInput {
  status?: AppointmentStatus;
  notes?: string | null;
  startAt?: string;
  endAt?: string;
  professionalId?: string;
}

export function patchAppointment(id: string, input: PatchAppointmentInput): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}`, input);
}

export function deleteAppointment(id: string): Promise<null> {
  return api.del<null>(`/appointments/${id}`);
}

export function getCoverage(id: string): Promise<AppointmentCoverage> {
  return api.get<AppointmentCoverage>(`/appointments/${id}/coverage`);
}
