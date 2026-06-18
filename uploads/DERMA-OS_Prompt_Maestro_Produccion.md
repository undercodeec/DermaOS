# DERMA-OS — Prompt Maestro y Contexto de Producción
### Sistema de Gestión para Centro Dermatológico (React + TypeScript)

> **Cómo usar este documento.** Este archivo cumple dos funciones: (1) es el **prompt completo** que se entrega a Claude Design para construir el demo, y (2) es el **documento de contexto de producción** que se vuelve a cargar cuando el proyecto pase de demo a desarrollo real, para retomar arquitectura, decisiones y reglas sin perder coherencia. Léelo de principio a fin antes de generar código. Mantén este `.md` en la raíz del repo como fuente de verdad (`/CONTEXT.md`).

---

## 0. Resumen ejecutivo

Construye **DERMA-OS**, un sistema de administración para un **centro dermatológico pequeño** en Ecuador. El sistema gestiona agenda, pacientes, ficha clínica (con separación estricta entre evolución y recetas), recetario con fórmulas magistrales, servicios, procedimientos estéticos, documentación fotográfica, consentimientos informados y facturación con lógica fiscal ecuatoriana (SRI).

- **Fase actual a construir: FASE 1 — Frontend completo con datos simulados (mock data) en Zustand.** Sin backend. Todo el estado vive en memoria con datos realistas precargados.
- El código debe escribirse **pensado para producción** (tipado estricto, arquitectura por features, separación de capas) para que las Fases 2 y 3 (persistencia y backend real) se conecten sin reescribir la UI. Ver §11 (Roadmap).
- Idioma de la interfaz: **español (Ecuador)**. Moneda: **USD ($)**. Formato de fecha: `dd/MM/yyyy`.

---

## 1. Stack técnico (obligatorio)

| Capa | Tecnología | Notas |
|---|---|---|
| Build / runtime dev | **Vite** | `pnpm create vite` con plantilla `react-ts`. |
| UI | **React 18 + TypeScript** (estricto) | `strict: true` en `tsconfig`. Nada de `any` salvo justificación. |
| Estado global | **Zustand** | Un store por dominio o store único con slices. Persistencia simulada en memoria (Fase 1). |
| Routing | **React Router v6** (`createBrowserRouter`) | Rutas anidadas para la sub-navegación por paciente. |
| Estilos | **Tailwind CSS v4** | Tokens de diseño en `@theme`. Sin CSS suelto salvo utilidades puntuales. |
| Animación | **Framer Motion** | Transiciones sobrias (modales, paneles, timeline). Sin exceso. |
| Iconos | **lucide-react** | Iconografía clínica consistente. |
| Formularios | **react-hook-form + zod** | Validación tipada; los `schema` de zod se reutilizarán como contratos en backend. |
| Fechas | **date-fns** (locale `es`) | Formateo y cálculos de agenda. |
| Gráficos (dashboard) | **Recharts** | KPIs del dashboard y reportes. |
| Gestor de paquetes | **pnpm** | Resolución estricta de dependencias; `corepack enable`. |

**Decisión registrada (no cambiar sin motivo):** se usa **pnpm** por su resolución estricta (evita *phantom dependencies*), velocidad e higiene de dependencias desde el día 1. Se usa Zustand (no Redux) por simplicidad y porque el modal global y el estado de UI se controlan con muy poco boilerplate.

**Backend (Fases futuras, NO construir ahora):** la persistencia se hará con **Supabase** (PostgreSQL + Auth + Row Level Security, alineado con LOPDP) en Fase 2; si se requiere integración real con el SRI y lógica fiscal compleja, se añade un backend **NestJS** dedicado en Fase 3. Importante: "Node.js vs Express" es una falsa disyuntiva — Node.js es el runtime y Express/Fastify/NestJS son frameworks que corren sobre él. Para este proyecto serio se prefiere NestJS (TypeScript-first, modular) sobre Express plano.

---

## 2. Arquitectura de carpetas (estructura de producción)

Organiza por **features**, no por tipo de archivo. Esto permite escalar y migrar a backend sin reorganizar.

```
src/
├── app/
│   ├── router.tsx              # createBrowserRouter, rutas anidadas
│   ├── App.tsx
│   └── providers.tsx
├── components/                 # UI reutilizable, agnóstica de dominio
│   ├── ui/                     # Button, Input, Modal, Card, Badge, Tabs, Table…
│   └── layout/                 # Layout, Sidebar, Header, PatientSubNav
├── features/
│   ├── dashboard/
│   ├── agenda/
│   ├── patients/
│   ├── clinical-history/       # evolución (timeline)
│   ├── prescriptions/          # recetas + fórmulas magistrales
│   ├── photos/                 # galería clínica antes/después
│   ├── consents/               # consentimientos informados
│   ├── procedures/             # procedimientos estéticos
│   ├── services/
│   └── billing/                # facturación SRI
├── store/
│   ├── useStore.ts             # Zustand (slices)
│   ├── slices/                 # patientsSlice, agendaSlice, billingSlice, uiSlice…
│   └── mock/                   # datos simulados realistas (seed)
├── lib/
│   ├── sri.ts                  # utilidades: clave de acceso 49 díg., IVA, RIDE simulado
│   ├── fitzpatrick.ts          # fototipos
│   └── format.ts               # fechas, moneda, cédula/RUC
├── types/                      # interfaces de dominio (contratos compartidos)
│   └── domain.ts
└── styles/
    └── theme.css               # tokens Tailwind v4 @theme
```

**Regla de capas:** los componentes de UI nunca tocan el store directamente para lógica de negocio; consumen *selectors* y *actions* expuestos por el store. La lógica fiscal/clínica vive en `lib/`, no en componentes. Así, en Fase 2 se reemplazan los *actions* del store por llamadas a Supabase sin tocar la UI.

---

## 3. Modelo de datos (TypeScript)

Define estas interfaces en `types/domain.ts`. Son el **contrato** que reutilizarán los `schema` de zod y, más adelante, las tablas de la base de datos.

```ts
// ----- Catálogo de servicios -----
export type ServiceCategory = 'consulta' | 'tratamiento' | 'procedimiento_estetico' | 'estudio';

export interface Service {
  id: string;
  name: string;                 // "Consulta Dermatológica", "Tratamiento de Acné", "Toxina Botulínica"
  category: ServiceCategory;
  durationMin: number;
  price: number;                // USD
  vatRate: 0 | 15;              // 0% salud | 15% estética cosmética (ver §6)
  active: boolean;
}

// ----- Antecedentes dermatológicos -----
export type Fitzpatrick = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface PatientBackground {
  skinType: Fitzpatrick;        // fototipo
  usesSunscreen: boolean;
  sunscreenSpf?: number;
  allergies: string[];          // alergias medicamentosas / tópicas
  chronicConditions: string[];  // diabetes, hipertensión, etc.
  currentMedications: string[];
  familyHistory: string[];      // melanoma, psoriasis…
  dermatologicalHistory: string[]; // acné previo, rosácea, etc.
  smoker: boolean;
  notes?: string;
}

// ----- Paciente -----
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  idType: 'cedula' | 'pasaporte' | 'ruc';
  idNumber: string;             // cédula 10 díg. validada
  birthDate: string;            // ISO
  sex: 'M' | 'F' | 'O';
  email: string;
  phone: string;
  address?: string;
  city?: string;
  nextAppointment?: string;     // ISO | undefined
  background?: PatientBackground;
  createdAt: string;
}

// ----- Registro clínico (REGLA CRÍTICA: type separa evolución de receta) -----
export type ClinicalRecordType = 'evolucion' | 'receta';

export interface ClinicalRecord {
  id: string;
  patientId: string;
  type: ClinicalRecordType;     // 'evolucion' → Historial | 'receta' → Recetario
  date: string;                 // ISO
  professionalId: string;
  // Campos de evolución (cuando type === 'evolucion'):
  subjective?: string;          // motivo / SOAP-S
  objective?: string;           // examen físico / SOAP-O
  assessment?: string;          // diagnóstico (con CIE-10)
  cie10Codes?: string[];        // ej. ["L70.0"] acné
  plan?: string;                // SOAP-P
  // Campos de receta (cuando type === 'receta'):
  prescription?: Prescription;  // ver abajo
}

// ----- Fórmula magistral / receta -----
export interface ActiveIngredient {
  name: string;                 // "Peróxido de benzoilo"
  concentration: string;        // "5%"
}

export interface PrescriptionItem {
  ingredients: ActiveIngredient[]; // una fórmula magistral puede combinar varios
  vehicle?: string;             // "gel", "crema base"
  instructions: string;         // "Aplicar capa fina por las noches. Usar protector solar en el día."
  quantity?: string;            // "30 g"
}

export interface Prescription {
  items: PrescriptionItem[];
  templateId?: string;          // si se generó desde una plantilla
}

export interface PrescriptionTemplate {
  id: string;
  name: string;                 // "Fórmula Acné Severo"
  description?: string;
  items: PrescriptionItem[];
}

// ----- Agenda -----
export type AppointmentStatus = 'agendada' | 'confirmada' | 'en_sala' | 'atendida' | 'no_show' | 'cancelada';
export type AppointmentKind = 'consulta_nueva' | 'control' | 'procedimiento';

export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  professionalId: string;
  start: string;                // ISO
  end: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  notes?: string;
}

// ----- Profesionales (multi-profesional, recomendado) -----
export interface Professional {
  id: string;
  name: string;
  specialty: string;            // "Dermatología"
  registrationNo: string;       // registro sanitario / ACESS
  color: string;                // color de agenda
}

// ----- Galería fotográfica clínica (ESENCIAL) -----
export interface ClinicalPhoto {
  id: string;
  patientId: string;
  date: string;
  bodyArea: string;             // "rostro", "espalda"
  lesionTag?: string;           // agrupa series antes/después
  caption?: string;
  url: string;                  // en Fase 1: placeholder/base64 simulado
  procedureId?: string;
}

// ----- Consentimiento informado (ESENCIAL · MSP form. 024) -----
export type ConsentStatus = 'pendiente' | 'firmado' | 'revocado';

export interface ConsentTemplate {
  id: string;
  title: string;                // "Consentimiento Toxina Botulínica"
  body: string;                 // texto del consentimiento
  procedureType: string;
}

export interface Consent {
  id: string;
  patientId: string;
  templateId: string;
  procedureId?: string;
  status: ConsentStatus;
  signedAt?: string;
  signatureDataUrl?: string;    // firma capturada (simulada)
}

// ----- Procedimientos estéticos (ESENCIAL) -----
export interface Procedure {
  id: string;
  patientId: string;
  serviceId: string;
  professionalId: string;
  date: string;
  productUsed?: string;         // "Toxina botulínica tipo A"
  units?: number;
  lotNumber?: string;           // trazabilidad de lote
  injectionAreas?: string[];
  consentId?: string;           // debe existir consentimiento firmado
  photoIds?: string[];          // antes/después
  notes?: string;
}

// ----- Inventario (RECOMENDADO) -----
export interface InventoryItem {
  id: string;
  name: string;
  type: 'insumo' | 'farmaco' | 'principio_activo' | 'vial';
  unit: string;
  stock: number;
  minStock: number;
  lotNumber?: string;
  expiryDate?: string;
}

// ----- Facturación SRI -----
export type InvoiceStatus = 'borrador' | 'generada' | 'firmada' | 'autorizada' | 'rechazada';

export interface InvoiceLine {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: 0 | 15;
}

export interface Invoice {
  id: string;
  number: string;               // 001-001-000000123
  patientId: string;
  date: string;
  lines: InvoiceLine[];
  subtotal0: number;            // base IVA 0%
  subtotal15: number;           // base IVA 15%
  vatAmount: number;
  total: number;
  accessKey: string;            // clave de acceso 49 dígitos (simulada)
  status: InvoiceStatus;
  rideUrl?: string;             // RIDE PDF simulado
}
```

---

## 4. Estado global (Zustand)

El store debe inicializarse con **datos simulados realistas** (ver §9) e incluir todas las entidades anteriores más el estado de UI.

```ts
interface UIState {
  isNewAppointmentModalOpen: boolean;
  isNewPatientModalOpen: boolean;     // mismo patrón global
  isNewPrescriptionModalOpen: boolean;
  selectedPatientId: string | null;
  sidebarCollapsed: boolean;
}

interface StoreState extends UIState {
  // entidades
  services: Service[];
  patients: Patient[];
  clinicalRecords: ClinicalRecord[];
  prescriptionTemplates: PrescriptionTemplate[];
  appointments: Appointment[];
  professionals: Professional[];
  photos: ClinicalPhoto[];
  consents: Consent[];
  consentTemplates: ConsentTemplate[];
  procedures: Procedure[];
  inventory: InventoryItem[];
  invoices: Invoice[];

  // acciones UI
  setIsNewAppointmentModalOpen: (open: boolean) => void;
  setSelectedPatientId: (id: string | null) => void;
  toggleSidebar: () => void;

  // acciones de dominio (CRUD simulado) — en Fase 2 pasan a Supabase
  addAppointment: (a: Appointment) => void;
  addClinicalRecord: (r: ClinicalRecord) => void;     // valida type
  addPrescriptionFromTemplate: (patientId: string, templateId: string) => void;
  createInvoice: (patientId: string, lines: InvoiceLine[]) => Invoice;
  // …selectors derivados
}
```

**Selectors clave (memorizados):**
- `selectEvolutionByPatient(patientId)` → `clinicalRecords.filter(r => r.patientId === id && r.type === 'evolucion')`
- `selectPrescriptionsByPatient(patientId)` → `... r.type === 'receta'`
- Estos dos selectors **garantizan a nivel de datos** la separación de la regla §5.1 (no depende del componente).

---

## 5. Reglas funcionales estrictas

### 5.1 Separación Historial (evolución) vs. Recetas — CRÍTICO
- En **Historial Clínico** (`/patients/:id/history`) se muestran **solo** `ClinicalRecord` con `type === 'evolucion'`, presentados como **línea de tiempo** descendente.
- En **Recetas** (`/patients/:id/prescriptions`) se muestran **solo** `ClinicalRecord` con `type === 'receta'`.
- Listas separadas lógica y visualmente. Una receta **jamás** aparece en la evolución, y viceversa. La separación se hace en los selectors del store, no solo en el render.

### 5.2 Modal global "Nueva Cita"
- Botón destacado en el **Header**: `+ Nueva Cita`.
- Abre `NewAppointmentModal`, controlado **exclusivamente** por Zustand (`isNewAppointmentModalOpen` / `setIsNewAppointmentModalOpen`).
- Funciona desde **cualquier ruta**; el modal se **renderiza a nivel del `Layout`** (fuera del `<Outlet/>`) para superponerse a todo.
- Aplica el **mismo patrón** a "Nuevo Paciente" y "Nueva Receta" (acciones globales).

### 5.3 Recetas y fórmulas magistrales
- La vista de recetas permite crear recetas **desde plantillas** (`PrescriptionTemplate`) o desde cero.
- Permite agregar **principios activos + concentraciones** y **instrucciones de uso** (ej. *"Aplicar capa fina por las noches. Usar protector solar en el día"*).
- Al elegir una plantilla, se precargan sus `items` y quedan editables.

### 5.4 Reglas de procedimientos y consentimiento
- Un `Procedure` de tipo estético **no debe poder marcarse como realizado sin un `Consent` firmado** asociado (mostrar advertencia/bloqueo en el demo).
- Los procedimientos enlazan **fotos antes/después** y, al facturarse, aplican **IVA 15%** (ver §6).

### 5.5 Reglas de facturación (ver §6 para detalle fiscal)
- El IVA se determina **por servicio** (`vatRate`): 0% salud, 15% estética cosmética.
- Una factura puede mezclar líneas 0% y 15%; mostrar **bases separadas** (`subtotal0`, `subtotal15`).

---

## 6. Cumplimiento normativo Ecuador (reflejar en el demo)

> En Fase 1 todo esto se **simula** en frontend. En Fase 3 se integra de verdad con los web services del SRI (requiere firma electrónica de entidad autorizada por ARCOTEL). No basta simular para uso real.

### 6.1 Historia Clínica Única (MSP)
- La ficha clínica debe inspirarse en la **HCU del MSP**: datos demográficos obligatorios, anamnesis/examen físico, **evolución y prescripciones** (form. 005), y **diagnóstico con CIE-10** (campo `cie10Codes`, obligatorio en el plan/diagnóstico).
- **Consentimiento informado** = formulario **024** (Acuerdo Ministerial 5316). Obligatorio para procedimientos invasivos/estéticos. Debe quedar **firmado y archivado**, vinculado al paciente y al procedimiento.
- Tratar la ficha como **documento médico-legal confidencial**.

### 6.2 Protección de datos (LOPDP)
- Los datos de salud son **datos sensibles**. En la UI: avisos de confidencialidad, y en arquitectura, dejar preparado el **control de acceso por roles** (médico, recepción, admin). En Fase 2 esto se implementa con **Row Level Security** de Supabase. En el demo, simular roles y restringir vistas.

### 6.3 Facturación electrónica SRI (simulada en demo)
- Genera y muestra una **clave de acceso de 49 dígitos** (usar `lib/sri.ts` para construirla con el algoritmo correcto: fecha + tipo comp. + RUC + ambiente + serie + secuencial + código numérico + tipo emisión + dígito verificador módulo 11).
- Genera un **RIDE** (vista imprimible / PDF simulado) con: datos del emisor (RUC, razón social, dirección), receptor, fecha, número de autorización = clave de acceso, detalle, bases por tarifa, IVA, total y **código QR**.
- Estados del comprobante: `borrador → generada → firmada → autorizada` (simular el flujo offline del SRI, incluida la posibilidad de `rechazada`).
- **IVA:**
  - **Servicios de salud → 0%** (Art. 56 num. 2 LRTI). Se factura con línea "IVA 0%".
  - **Procedimientos puramente estéticos/cosméticos → tarifa general 15%** (vigente 2026 según Circular SRI NAC-DGECCGC25-00000006), salvo que sean reconstructivos por enfermedad/accidente comprobado (entonces 0%).
  - El sistema marca la tarifa según `Service.vatRate`; el motivo (estético vs. terapéutico) debe poder constar en la ficha.
- Soportar **"Consumidor Final"** cuando no hay identificación del cliente.
- Conservación legal: 7 años (no aplica al demo, dejarlo como nota).

---

## 7. Navegación y UX

### 7.1 Navegación global (Sidebar) — 5 a 7 ítems, icono + etiqueta
Sidebar colapsable (guardar `sidebarCollapsed` en store). Estado activo siempre visible. Orden y etiquetas consistentes en toda la app (WCAG 3.2.3).

```
🏠  Dashboard            /
🗓️  Agenda               /agenda
👥  Pacientes            /patients
🧴  Servicios            /services
💉  Procedimientos       /procedures        (lista global de procedimientos)
🧾  Facturación          /billing
📦  Inventario           /inventory          (recomendado; puede ir en una 2ª iteración)
```

### 7.2 Sub-navegación por paciente (pestañas dentro de la ficha)
Cuando se entra a un paciente, la barra global se mantiene y aparece una **sub-navegación contextual** con el nombre del paciente arriba:

```
[Paciente: María Pérez]
 Antecedentes · Evolución · Recetas · Fotos · Consentimientos · Procedimientos · Facturas
```

Rutas anidadas bajo `/patients/:id/...`. Esto reduce el *task-switching* (causa documentada de carga cognitiva en EHR).

### 7.3 Patrones de UI exigidos
- **Timeline** para la evolución clínica (patrón validado, alta usabilidad SUS≈83 en estudios EHR).
- **Header** fijo con: buscador global de pacientes, selector de profesional (si multi-profesional), y botones de acción global (`+ Nueva Cita` destacado).
- **Agenda**: vista semana/día, citas por color de estado (`agendada/confirmada/en_sala/atendida/no_show/cancelada`) y por color de profesional.
- **Optimizado para laptop y tablet en consulta**: touch targets ≥ 44px, tipografía legible, flujos de pocos clics para "registrar evolución" y "crear receta".
- Responsivo completo (móvil funcional, pero la experiencia principal es laptop/tablet).

---

## 8. Diseño visual

- **Estilo:** limpio, clínico, profesional, con aire (whitespace generoso). Sensación de software médico confiable, no de app de consumo.
- **Paleta sobria** (tokens Tailwind v4 `@theme`):
  - Fondo: blancos y grises muy claros (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`).
  - Texto: grises azulados (`#0F172A`, `#334155`, `#64748B`).
  - **Color primario médico:** teal/azul (`#0D9488` teal o `#0EA5E9` azul clínico). Elegir uno como primario y el otro como acento.
  - Semánticos: éxito `#16A34A`, advertencia `#F59E0B`, error `#DC2626`, info `#0EA5E9`.
- **Tipografía:** sans-serif legible (Inter o similar). Jerarquía clara. Números tabulares en tablas de facturación.
- **Componentes:** cards con bordes suaves (`rounded-xl`), sombras sutiles, tablas densas pero legibles, badges de estado con color semántico. Sin gradientes llamativos ni decoración innecesaria.
- **Animación (Framer Motion):** transiciones sutiles en modales (fade + scale), entrada de paneles, y aparición de items del timeline. Duraciones cortas (150–250ms). Nada que distraiga en consulta.

---

## 9. Datos simulados (seed realista)

Precarga el store con datos coherentes de dermatología (en `store/mock/`):

- **Profesionales:** 2 dermatólogos con colores de agenda distintos.
- **Servicios (≥8):** Consulta Dermatológica (0%), Control (0%), Tratamiento de Acné (0%), Crioterapia (0%), Toxina Botulínica (15%), Relleno con Ácido Hialurónico (15%), Peeling Químico (15%), Láser CO₂ (15%). Cada uno con duración, precio y `vatRate` correcto.
- **Pacientes (≥6):** nombres latinos, cédulas de 10 dígitos válidas (formato), fototipos Fitzpatrick variados, `background` detallado (alergias, uso de protector solar SPF, antecedentes). Al menos 3 con próxima cita.
- **ClinicalRecords:** para 2–3 pacientes, mezcla de **evoluciones** (con CIE-10, ej. `L70.0` acné, `L71.0` rosácea) y **recetas** separadas. Verifica que el filtrado por `type` funcione.
- **PrescriptionTemplates (≥3):** "Fórmula Acné Severo" (peróxido de benzoilo 5% + clindamicina 1% + instrucciones), "Despigmentante Nocturno" (hidroquinona 4% + tretinoína 0.05%), "Rosácea Tópica". Con principios activos, concentraciones e instrucciones reales de uso.
- **Appointments:** citas de la semana actual, varios estados y tipos.
- **Photos:** 1–2 series antes/después (placeholders) para 1 paciente.
- **Consents + ConsentTemplates:** plantilla de toxina botulínica y de láser; 1 consentimiento firmado y 1 pendiente.
- **Procedures:** 1–2 procedimientos estéticos con producto, unidades, lote, consentimiento y fotos enlazadas.
- **Inventory:** viales de toxina (con lote/caducidad), principios activos de fórmulas, insumos.
- **Invoices:** 2–3 facturas (una de servicio médico 0%, una de procedimiento estético 15%, una mixta) con clave de acceso de 49 dígitos simulada y estado `autorizada`.

Los datos deben ser **internamente consistentes** (los IDs referenciados existen; las próximas citas coinciden con la agenda).

---

## 10. Criterios de aceptación (checklist del demo)

- [ ] Las 7+ rutas funcionan con `Layout` (Sidebar + Header) persistente.
- [ ] Sub-navegación por paciente con pestañas (Antecedentes · Evolución · Recetas · Fotos · Consentimientos · Procedimientos · Facturas).
- [ ] **Historial muestra solo evoluciones; Recetas muestra solo recetas** (verificado vía selectors).
- [ ] Evolución renderizada como **timeline**.
- [ ] Botón `+ Nueva Cita` en el Header abre el modal global desde **cualquier ruta**, controlado por Zustand, renderizado en `Layout`.
- [ ] Crear receta desde plantilla precarga principios activos, concentraciones e instrucciones, y queda editable.
- [ ] Procedimiento estético exige consentimiento firmado y enlaza fotos antes/después.
- [ ] Facturación: IVA 0% vs 15% por servicio, bases separadas, clave de acceso 49 dígitos, RIDE con QR, estados SRI.
- [ ] CIE-10 presente en diagnósticos de evolución.
- [ ] Diseño clínico sobrio, responsivo, optimizado para tablet/laptop, con tipado TypeScript estricto y arquitectura por features.
- [ ] Datos simulados realistas y consistentes precargados.

---

## 11. Roadmap de fases (para retomar en desarrollo)

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1 — Demo frontend** *(construir ahora)* | React + TS + Zustand + React Router + Tailwind + mock data. Toda la UI y reglas funcionando en memoria. | ▶️ En construcción |
| **Fase 2 — Persistencia** | Conectar **Supabase** (PostgreSQL + Auth + RLS). Reemplazar *actions* del store por llamadas reales. Roles (médico/recepción/admin) con RLS alineado a LOPDP. Reutilizar interfaces de `types/domain.ts` como esquema. | ⏳ Planificada |
| **Fase 3 — Backend serio + SRI real** | Backend **NestJS** para lógica fiscal, integración con web services del SRI (firma electrónica ARCOTEL, autorización XML, RIDE real), auditoría, conservación 7 años. Recordatorios reales (WhatsApp/email/SMS). | ⏳ Planificada |

**Notas para el handoff (no perder al pasar a desarrollo):**
- Mantener la **separación de capas**: UI → selectors/actions del store → `lib/` (lógica) → (Fase 2) Supabase. La UI no debe acoplarse a la fuente de datos.
- Los **schema de zod** de los formularios son el contrato; reutilizarlos en validación de backend.
- La lógica de **clave de acceso 49 díg. e IVA** ya vive aislada en `lib/sri.ts` → en Fase 3 se sustituye su parte de autorización por la integración real, sin tocar la UI.
- Antes de manejar **datos reales de pacientes**, son obligatorios: autenticación, RLS, cumplimiento LOPDP/HCU. El demo no debe usarse con datos reales.

---

## 12. Instrucción final a Claude Design

> Construye la **Fase 1** completa de DERMA-OS según todo lo anterior: proyecto React + TypeScript (Vite, pnpm) con Tailwind v4, Zustand, React Router v6, Framer Motion y lucide-react. Implementa **todas** las rutas, el `Layout` con Sidebar global + sub-navegación por paciente, el modal global de Nueva Cita controlado por Zustand, la separación estricta evolución/recetas, el recetario con fórmulas magistrales, procedimientos con consentimiento, galería de fotos antes/después, y el módulo de facturación con lógica de IVA ecuatoriana (0% salud / 15% estética), clave de acceso de 49 dígitos y RIDE simulado. Precarga datos simulados realistas y consistentes. Escribe código limpio, tipado estricto y arquitectura por features lista para conectar un backend en fases posteriores. Cumple el checklist de §10.
