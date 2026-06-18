import { api } from "@/lib/api";
import type { InventoryItem } from "@/lib/types";

export interface NewInventoryItem {
  name: string;
  type: "vial" | "principio_activo" | "insumo" | "farmaco";
  unit: string;
  stock?: number;
  minStock?: number;
  lotNumber?: string;
  expiryDate?: string;
}

export function listInventory(): Promise<InventoryItem[]> {
  return api.get<InventoryItem[]>("/inventory");
}

export function createInventoryItem(body: NewInventoryItem): Promise<InventoryItem> {
  return api.post<InventoryItem>("/inventory", body);
}

export function adjustInventory(id: string, delta: number): Promise<InventoryItem> {
  return api.patch<InventoryItem>(`/inventory/${id}/adjust`, { delta });
}
