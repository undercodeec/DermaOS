import { api } from "@/lib/api";
import type {
  ClinicalMetrics,
  ClinicalRecord,
  Consent,
  ConsentTemplate,
  Invoice,
  InvoiceLine,
  Package,
  PackageBalance,
  Patient,
  PatientBackground,
  PatientCounts,
  Photo,
  Procedure,
  Professional,
  RxItem,
  Service,
} from "@/lib/types";

export function listPatients(filter: string): Promise<Patient[]> {
  const q = filter.trim();
  return api.get<Patient[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

export function getPatient(id: string): Promise<Patient | null> {
  return api.get<Patient>(`/patients/${id}`).catch((e) => {
    if (e?.status === 404) return null;
    throw e;
  });
}

export function getPatientCounts(id: string): Promise<PatientCounts> {
  return api.get<PatientCounts>(`/patients/${id}/counts`);
}

export interface NewPatientInput {
  first_name: string;
  last_name: string;
  id_type: string;
  id_number: string;
  birth_date: string;
  sex: string;
  email?: string;
  phone?: string;
  city?: string;
  background: PatientBackground;
}

export function createPatient(input: NewPatientInput): Promise<Patient> {
  return api.post<Patient>("/patients", input);
}

// ----- Catálogos -----
export function listProfessionals(): Promise<Professional[]> {
  return api.get<Professional[]>("/professionals");
}
export function listServices(): Promise<Service[]> {
  return api.get<Service[]>("/services");
}
export function listConsentTemplates(): Promise<ConsentTemplate[]> {
  return api.get<ConsentTemplate[]>("/consent-templates");
}
export function listPackages(opts: { activeOnly?: boolean } = {}): Promise<Package[]> {
  return api.get<Package[]>(opts.activeOnly ? "/packages?active=1" : "/packages");
}

// ----- Evolución -----
export interface NewEvolucionInput {
  professionalId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  cie10Codes: string[];
  clinicalMetrics?: ClinicalMetrics;
}
export function createEvolucion(patientId: string, input: NewEvolucionInput): Promise<ClinicalRecord> {
  return api.post<ClinicalRecord>(`/patients/${patientId}/evolucion`, input);
}
export function updateEvolucion(patientId: string, rid: string, input: Partial<NewEvolucionInput>): Promise<ClinicalRecord> {
  return api.patch<ClinicalRecord>(`/patients/${patientId}/evolucion/${rid}`, input);
}
export function deleteEvolucion(patientId: string, rid: string): Promise<null> {
  return api.del<null>(`/patients/${patientId}/evolucion/${rid}`);
}

// ----- Recetas -----
export interface NewRecetaInput {
  professionalId: string;
  templateId?: string;
  items: RxItem[];
}
export function createReceta(patientId: string, input: NewRecetaInput): Promise<ClinicalRecord> {
  return api.post<ClinicalRecord>(`/patients/${patientId}/recetas`, input);
}
export function updateReceta(patientId: string, rid: string, input: Partial<NewRecetaInput>): Promise<ClinicalRecord> {
  return api.patch<ClinicalRecord>(`/patients/${patientId}/recetas/${rid}`, input);
}
export function deleteReceta(patientId: string, rid: string): Promise<null> {
  return api.del<null>(`/patients/${patientId}/recetas/${rid}`);
}

// ----- Consents -----
export function createConsent(patientId: string, templateId: string): Promise<Consent> {
  return api.post<Consent>(`/patients/${patientId}/consents`, { templateId });
}
export function signConsent(consentId: string, signaturePath?: string): Promise<Consent> {
  return api.post<Consent>(`/consents/${consentId}/sign`, { signaturePath });
}
export function listSignedConsents(patientId: string): Promise<Consent[]> {
  return api.get<Consent[]>(`/patients/${patientId}/consents?signed=1`);
}

// ----- Procedures -----
export interface NewProcedureInput {
  serviceId: string;
  professionalId: string;
  consentId: string;
  productUsed?: string;
  units?: number;
  lotNumber?: string;
  expiry?: string;
  injectionAreas: string[];
  notes?: string;
}
export function createProcedure(patientId: string, input: NewProcedureInput): Promise<Procedure> {
  return api.post<Procedure>(`/patients/${patientId}/procedures`, input);
}

// ----- Package balances -----
export interface SellPackageInput {
  packageId: string;
  sellerProfessionalId?: string | null;
  initialPayment?: number;
  method?: string;
  note?: string;
}
export function sellPackage(patientId: string, input: SellPackageInput): Promise<PackageBalance> {
  return api.post<PackageBalance>(`/patients/${patientId}/balances`, input);
}

export interface AbonoInput {
  amount: number;
  method: string;
  note?: string;
}
export function addAbono(balanceId: string, input: AbonoInput) {
  return api.post(`/balances/${balanceId}/abonos`, input);
}

// ----- Invoices -----
export interface NewInvoiceInput {
  customerName?: string;
  lines: InvoiceLine[];
}
export function createInvoice(patientId: string, input: NewInvoiceInput): Promise<Invoice> {
  return api.post<Invoice>(`/patients/${patientId}/invoices`, input);
}

// ----- Photos -----
export function uploadPhoto(form: FormData): Promise<Photo> {
  return api.post<Photo>("/photos", form);
}
