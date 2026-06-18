import { api } from "@/lib/api";
import type { Invoice } from "@/lib/types";

export function listInvoices(): Promise<Invoice[]> {
  return api.get<Invoice[]>("/invoices");
}

export function getInvoice(id: string): Promise<Invoice> {
  return api.get<Invoice>(`/invoices/${id}`);
}

export function advanceInvoice(id: string): Promise<Invoice> {
  return api.patch<Invoice>(`/invoices/${id}/advance`);
}
