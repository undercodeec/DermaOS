import { api } from "@/lib/api";
import type { Package, PackageBalanceWithPatient } from "@/lib/types";

export interface PackagePayload {
  name: string;
  serviceId: string;
  sessions: number;
  price: number;
  intervalDays: number;
  validityDays: number;
}

export function listAllPackages(): Promise<Package[]> {
  return api.get<Package[]>("/packages");
}

export function listAllBalances(): Promise<PackageBalanceWithPatient[]> {
  return api.get<PackageBalanceWithPatient[]>("/packages/balances");
}

export function createPackage(body: PackagePayload): Promise<Package> {
  return api.post<Package>("/packages", body);
}

export function updatePackage(id: string, body: Partial<PackagePayload> & { active?: boolean }): Promise<Package> {
  return api.patch<Package>(`/packages/${id}`, body);
}
