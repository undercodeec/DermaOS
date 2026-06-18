import { api } from "@/lib/api";
import type { Service } from "@/lib/types";

export type ServiceCategory = "consulta" | "tratamiento" | "procedimiento_estetico" | "estudio";

export interface ServicePayload {
  name: string;
  category: ServiceCategory;
  durationMin: number;
  price: number;
  vatRate: 0 | 15;
  active?: boolean;
}

export function listAllServices(): Promise<Service[]> {
  return api.get<Service[]>("/services");
}

export function createService(body: ServicePayload): Promise<Service> {
  return api.post<Service>("/services", body);
}

export function updateService(id: string, body: Partial<ServicePayload>): Promise<Service> {
  return api.patch<Service>(`/services/${id}`, body);
}
