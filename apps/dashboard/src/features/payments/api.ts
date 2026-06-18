import { api } from "@/lib/api";
import type { Invoice, PackageBalance, Payment, PaymentConcept } from "@/lib/types";

export interface ListPaymentsParams {
  patientId?: string;
  status?: string;
}

export function listPayments(params: ListPaymentsParams = {}): Promise<Payment[]> {
  const qs = new URLSearchParams();
  if (params.patientId) qs.set("patientId", params.patientId);
  if (params.status) qs.set("status", params.status);
  const q = qs.toString();
  return api.get<Payment[]>(`/payments${q ? `?${q}` : ""}`);
}

export interface CreatePaymentInput {
  patientId: string;
  conceptType: PaymentConcept;
  conceptRefId?: string | null;
  conceptLabel: string;
  amount: number;
  note?: string;
}

export function createPayment(input: CreatePaymentInput): Promise<Payment> {
  return api.post<Payment>("/payments", input);
}

export function markPaymentSent(id: string, via: "whatsapp" | "email"): Promise<Payment> {
  return api.patch<Payment>(`/payments/${id}/sent`, { via });
}

export function markPaymentPaid(id: string): Promise<Payment> {
  return api.patch<Payment>(`/payments/${id}/paid`);
}

export function voidPayment(id: string): Promise<Payment> {
  return api.patch<Payment>(`/payments/${id}/void`);
}

export function listPatientBalances(patientId: string): Promise<PackageBalance[]> {
  return api.get<PackageBalance[]>(`/patients/${patientId}/balances`);
}

export function listPatientInvoices(patientId: string): Promise<Invoice[]> {
  return api.get<Invoice[]>(`/patients/${patientId}/invoices`);
}
