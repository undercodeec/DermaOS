// Tipos compartidos con el backend Express (mantener sincronizados con Prisma schema).

export type Role = "admin" | "recepcion" | "profesional" | "esteticista" | "contador";

export type AppointmentStatus =
  | "agendada" | "confirmada" | "en_sala" | "atendida" | "no_show" | "cancelada";
export type AppointmentKind = "consulta_nueva" | "control" | "procedimiento";
export type ConsentStatus = "pendiente" | "firmado" | "revocado";
export type ConsentKind = "clinico" | "imagen";
export type InvoiceStatus = "borrador" | "generada" | "firmada" | "autorizada" | "rechazada";
export type PaymentStatus = "pendiente" | "pagado" | "anulado";
export type PaymentConcept = "libre" | "deposito" | "paquete" | "factura";
export type PhotoKind = "basal" | "control";
export type ClinicalRecordType = "evolucion" | "receta";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  active: boolean;
  professionalId: string | null;
  lastAccess: string | null;
  createdAt: string;
}

export interface PatientBackground {
  skinType: "I" | "II" | "III" | "IV" | "V" | "VI";
  usesSunscreen: boolean;
  sunscreenSpf?: number;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  familyHistory: string[];
  dermatologicalHistory: string[];
  smoker: boolean;
  notes?: string;
}

// El backend serializa con snake_case (para consistencia con SQL/JSON externo).
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  id_type: string;
  id_number: string;
  birth_date: string;
  sex: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  next_appointment: string | null;
  background: PatientBackground;
  created_at: string;
}

export interface SearchPatient {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
}

export interface PatientCounts {
  evolucion: number;
  recetas: number;
  fotos: number;
  consentimientos: number;
  procedimientos: number;
  paquetes: number;
  facturas: number;
}

export interface Kpis {
  citasHoy: number;
  ingresos: number;
  pacientes: number;
  alertas: number;
  charts?: {
    ingresosPorMes: ChartPoint[];
    citasPorEstado: ChartPoint[];
    serviciosMasVendidos: ChartPoint[];
    pacientesNuevosPorMes: ChartPoint[];
  };
  period?: { from: string; to: string };
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ReportNote {
  id: string;
  title: string;
  body: string | null;
  metricKey: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  status: "abierta" | "resuelta";
  createdAt: string;
  resolvedAt: string | null;
  createdByName: string;
}

export interface RxItem {
  ingredients: { name: string; concentration: string }[];
  vehicle: string;
  quantity: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions: string;
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  professionalId: string;
  type: ClinicalRecordType;
  date: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  cie10Codes: string[];
  prescription: {
    templateId?: string;
    diagnosis?: string;
    warnings?: string;
    items?: RxItem[];
    clinicalMetrics?: ClinicalMetrics;
  } | null;
  professional: Pick<Professional, "id" | "name" | "specialty" | "registrationNo"> | null;
}

export interface ClinicalMetrics {
  severity: number;
  pain: number;
  pruritus: number;
  inflammation: number;
  satisfaction: number;
}

export interface Photo {
  id: string;
  patientId: string;
  takenAt: string;
  bodyArea: string;
  lesionTag: string;
  caption: string;
  kind: PhotoKind;
  createdById: string | null;
}

export interface ConsentTemplate {
  id: string;
  kind: ConsentKind;
  title: string;
  procedureType: string;
  body: string;
  status?: "borrador" | "aprobada" | "archivada";
  seriesId?: string;
  version?: number;
  approvedAt?: string | null;
  allowedRoles?: Role[];
}

export interface Consent {
  id: string;
  patientId: string;
  templateId: string;
  status: ConsentStatus;
  signedAt: string | null;
  signaturePath: string | null;
  procedureId: string | null;
  templateTitle: string | null;
  templateBody: string | null;
  templateKind: ConsentKind | null;
  templateVersion: number | null;
  signedIp: string | null;
  signedUserAgent: string | null;
  signedByUserId: string | null;
  signedByUserName: string | null;
  patientName: string | null;
  patientIdType: string | null;
  patientIdNumber: string | null;
  patientBirthDate: string | null;
  clinicName: string | null;
  clinicRuc: string | null;
  contentHash: string | null;
  signatureHash: string | null;
  pdfHash: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  revokedByUserId: string | null;
  events: ConsentEvent[];
  template: ConsentTemplate | null;
}

export interface ConsentEvent {
  id: string;
  kind: "adenda" | "correccion" | "revocacion";
  body: string;
  createdById: string | null;
  createdByName: string;
  at: string;
  ip: string | null;
  previousHash: string | null;
  chainSequence: number;
  hash: string;
}

export interface Procedure {
  id: string;
  patientId: string;
  serviceId: string;
  professionalId: string;
  date: string;
  productUsed: string | null;
  units: number | null;
  lotNumber: string | null;
  injectionAreas: string[];
  notes: string | null;
  service: { name: string } | null;
  professional: { name: string } | null;
}

export interface PackageBalance {
  id: string;
  patientId: string;
  packageId: string;
  soldAt: string;
  sessionsTotal: number;
  sessionsUsed: number;
  price: string; // Prisma Decimal viene como string en JSON
  vencimiento: string;
  status: string;
  package: { id: string; name: string; sessions: number; price: string } | null;
  payments: { amount: string }[];
}

export interface Invoice {
  id: string;
  number: string;
  patientId: string | null;
  customerName: string | null;
  date: string;
  total: string;
  status: InvoiceStatus;
  accessKey: string;
  lines?: InvoiceLine[] | null;
  subtotal0?: string;
  subtotal15?: string;
  vatAmount?: string;
  patient?: { firstName: string; lastName: string; idNumber: string } | null;
}

export interface InvoiceLine {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: string;
  vatRate: number;
  active: boolean;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  registrationNo: string;
  color: string;
}

export interface ClinicalFileOptions {
  from?: string;
  to?: string;
  includeEvolutions: boolean;
  includePrescriptions: boolean;
  includeProcedures: boolean;
  includeConsents: boolean;
  includePhotos: boolean;
  signerProfessionalId?: string;
  purpose?: "preview" | "print";
}

export interface ClinicalFileConsent {
  id: string;
  status: ConsentStatus;
  signedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  templateTitle: string | null;
  templateKind: ConsentKind | null;
  templateVersion: number | null;
  signedByUserName: string | null;
}

export interface ClinicalFilePhoto {
  id: string;
  takenAt: string;
  bodyArea: string;
  lesionTag: string;
  caption: string;
  kind: PhotoKind;
  fileUrl: string;
}

export interface ClinicalFile {
  generatedAt: string;
  purpose: "preview" | "print";
  period: { from: string | null; to: string | null };
  included: {
    evolutions: boolean;
    prescriptions: boolean;
    procedures: boolean;
    consents: boolean;
    photos: boolean;
  };
  clinic: { name: string; ruc: string | null; logoData: string | null };
  patient: Patient;
  signer: Pick<Professional, "id" | "name" | "specialty" | "registrationNo"> | null;
  evolutions: ClinicalRecord[];
  prescriptions: ClinicalRecord[];
  procedures: Procedure[];
  consents: ClinicalFileConsent[];
  photos: ClinicalFilePhoto[];
}

export interface PrescriptionDocument {
  generatedAt: string;
  purpose: "preview" | "print";
  id: string;
  issuedAt: string;
  clinic: { name: string; ruc: string | null; logoData: string | null };
  patient: {
    id: string;
    fullName: string;
    idType: string;
    idNumber: string;
    birthDate: string;
    allergies: string[];
  };
  professional: Pick<Professional, "id" | "name" | "specialty" | "registrationNo">;
  diagnosis: string;
  warnings: string;
  items: RxItem[];
}

export interface Package {
  id: string;
  serviceId: string;
  name: string;
  sessions: number;
  price: string;
  intervalDays: number;
  validityDays: number;
  active: boolean;
  service?: { id: string; name: string; price: string } | null;
}

export interface PackageBalanceWithPatient extends PackageBalance {
  patient?: { id: string; firstName: string; lastName: string; idNumber: string } | null;
}

export interface Payment {
  id: string;
  patientId: string;
  conceptType: PaymentConcept;
  conceptRefId: string | null;
  conceptLabel: string;
  amount: string;
  method: string;
  status: PaymentStatus;
  payphoneLink: string | null;
  txId: string | null;
  clientTransactionId?: string | null;
  payphoneStoreId?: string | null;
  payphoneTransactionId?: string | null;
  providerStatus?: string | null;
  sentVia: "whatsapp" | "email" | null;
  createdAt: string;
  paidAt: string | null;
  note: string | null;
  patient: {
    firstName: string;
    lastName: string;
    idNumber: string;
    phone: string | null;
  } | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  notes: string | null;
  patient: { firstName: string; lastName: string; idNumber: string } | null;
  service: { name: string; price: string; durationMin: number } | null;
  professional: { name: string; color: string } | null;
}

export interface AppointmentCoverage {
  consumed: boolean;
  balanceId?: string;
  packageName?: string;
  sessionsTotal?: number;
  sessionsUsed?: number;
  cover?: {
    balanceId: string;
    packageName: string;
    sessionsTotal: number;
    sessionsLeft: number;
  } | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: "vial" | "principio_activo" | "insumo" | "farmaco";
  unit: string;
  stock: string;
  minStock: string;
  lotNumber: string | null;
  expiryDate: string | null;
}
