# AUDITORÍA MULTI-TENANT — DERMA-OS
> Fecha: 2026-06-20 | Auditor: Claude (solo lectura, sin modificaciones)

---

## VEREDICTO

**SINGLE-TENANT**. La arquitectura actual sirve a una única clínica. No existe el concepto de "clínica" en el modelo de datos, en el JWT, en el middleware ni en ninguna query de Prisma. Si se registrara una segunda clínica en la misma base de datos, sus datos quedarían completamente mezclados con los de la primera sin ninguna barrera.

---

## CHECKLIST COMPLETO

### PASO 1 — Modelo de tenant y clinicId en datos

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| 1.1 ¿Existe modelo `Clinic` (o Tenant) en schema.prisma? | ❌ | `apps/api/prisma/schema.prisma` líneas 93–421 | El schema define 16 modelos (User, Patient, Appointment, etc.) — ninguno es `Clinic` ni `Tenant`. |
| 1.2 ¿Las tablas raíz tienen `clinic_id` con FK? | ❌ | `migration.sql` líneas 35–301 | Revisados todos los `CREATE TABLE`: `users`, `patients`, `appointments`, `clinical_records`, `photos`, `consents`, `procedures`, `inventory`, `invoices`, `packages`, `package_balances`, `payments`, `audit_logs` — ninguno tiene columna `clinic_id`. |
| 1.3 ¿Hay índices por `clinic_id`? | ❌ | `migration.sql` líneas 303–374 | Los índices existentes son por `role`, `last_name/first_name`, `start_at`, `patient_id`, `date`, `lesion_tag`, `status/created_at`. No hay ningún índice con `clinic_id`. |
| 1.4 ¿El seed asigna `clinicId` a los datos demo? | ❌ | `apps/api/prisma/seed.ts` líneas 39–57 | `createMany` de `Professional` y `User` no incluye ningún campo `clinicId`. El campo no existe en el schema. |

### PASO 2 — Contexto de tenant en cada request

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| 2.1 ¿`TokenPayload` incluye `clinicId`? | ❌ | `apps/api/src/lib/jwt.ts` líneas 5–9 | `TokenPayload = { sub, email, role }`. Sin `clinicId`. |
| 2.2 ¿`/auth/login` emite `clinicId` en el JWT? | ❌ | `apps/api/src/routes/auth.ts` línea 55 | `signToken({ sub: user.id, email: user.email, role: user.role })` — tres campos, ninguno es `clinicId`. |
| 2.3 ¿`requireAuth` expone `clinicId` en `req`? | ❌ | `apps/api/src/middleware/auth.ts` línea 22 | `req.user = { id: payload.sub, email: payload.email, role: payload.role }`. Sin `clinicId`. El tipo `Request` extendido (línea 11) tampoco lo declara. |

### PASO 3 — Filtrado por tenant en la capa de aplicación

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| 3.1 ¿Las queries de Prisma filtran por `clinicId`? | ❌ | Ver tabla de rutas en riesgo abajo | Ninguna query usa `clinicId` en `where`. |
| 3.2 ¿Existe helper o `$extends` que inyecte `clinicId`? | ❌ | `apps/api/src/db.ts` líneas 1–5 | `new PrismaClient({...})` simple, sin `$extends`, sin middleware de Prisma. |
| 3.3 Rutas que hoy devolverían datos de TODAS las clínicas | ❌ RIESGO | Ver tabla abajo | Todas las rutas GET raíz son afectadas. |

#### Rutas con fuga de datos entre clínicas (si hubiera más de una)

| Ruta | Archivo | Línea | Dato expuesto |
|------|---------|-------|---------------|
| `GET /patients/` | `routes/patients.ts` | 39–56 | Todos los pacientes sin restricción |
| `GET /appointments/` | `routes/appointments.ts` | 57–81 | Todas las citas sin restricción |
| `GET /inventory/` | `routes/inventory.ts` | 11–18 | Todo el inventario sin restricción |
| `GET /invoices/` | `routes/invoices.ts` | 10–49 | Todas las facturas sin restricción |
| `GET /admin/users` | `routes/admin.ts` | 11–37 | Todos los usuarios sin restricción |
| `GET /admin/audit-logs` | `routes/admin.ts` | 100–131 | Toda la bitácora sin restricción |
| `GET /patients/:id/evolucion` | `routes/patients.ts` | 111–121 | Historia clínica (cualquier paciente accesible por ID) |
| `GET /patients/:id/photos` | `routes/patients.ts` | 501–511 | Fotos de cualquier paciente |
| `GET /consents*` | `routes/consents.ts` | — | Consentimientos sin filtro de clínica |
| `GET /balances*` | `routes/balances.ts` | — | Balances de paquetes sin filtro de clínica |
| `GET /payments*` | `routes/payments.ts` | — | Pagos sin filtro de clínica |

### PASO 4 — Aislamiento a nivel de base (Row-Level Security)

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| 4.1 ¿Hay `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` en migraciones? | ❌ | `migrations/20260617150727_init/migration.sql` y `migrations/20260618120000_add_mfa_secret/migration.sql` | Las dos migraciones contienen solo `CREATE TABLE`, `CREATE INDEX` y `ALTER TABLE ADD COLUMN`. Sin ninguna instrucción RLS. |
| 4.2 ¿Se setea `set_config('app.current_clinic', ...)` por request? | ❌ | `apps/api/src/db.ts`, `middleware/auth.ts`, `server.ts` | No existe ningún `set_config`, `$queryRaw`, ni interceptor de Prisma que fije una variable de sesión PostgreSQL. |

### PASO 5 — Registro/onboarding de clínica

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| 5.1 ¿Existe endpoint para crear `Clinic` + primer usuario admin? | ❌ | `apps/api/src/server.ts` líneas 42–54 | Los routers registrados son: `/auth`, `/patients`, `/photos`, `/consents`, `/balances`, `/services`, `/packages`, `/inventory`, `/appointments`, `/payments`, `/invoices`, `/admin`, `/` (catálogo). No hay `/clinics` ni `/register`. |
| 5.2 ¿Se genera `publicKey` por clínica? | ❌ | `schema.prisma` completo | No existe campo `publicKey` ni modelo `Clinic` en el schema. |

### LEADS / SITIO WEB INDIVIDUAL

| Ítem | Estado | Evidencia | Nota |
|------|--------|-----------|------|
| L.1 ¿Existe `POST /public/leads`? | ❌ | `apps/api/src/server.ts` líneas 42–54 | No hay ruta `/public` registrada en el servidor. |
| L.2 ¿Resuelve `clinicId` desde API key en el servidor? | ❌ | N/A | No aplica: L.1 no existe. |
| L.3 ¿Existe modelo `Lead` con `clinicId`, estado y fuente? | ❌ | `apps/api/prisma/schema.prisma` completo | No existe modelo `Lead` ni tabla `leads` en el schema ni en las migraciones. |

---

## BRECHAS PRIORIZADAS

### 🔴 Bloqueantes de seguridad (fugas de datos entre clínicas)

Estas brechas, si se agrega una segunda clínica sin corregirlas, producen fugas reales de datos confidenciales de pacientes:

1. **Sin `clinicId` en ninguna tabla de datos** — Un usuario autenticado de Clínica B puede ver, editar y eliminar pacientes, citas, fotos, historia clínica e inventario de Clínica A. No hay ninguna barrera.

2. **Sin `clinicId` en el JWT ni en `req.user`** — Incluso si se añadiera filtrado por clínica en las queries, el servidor no sabría a qué clínica pertenece la sesión actual. El token no lo lleva.

3. **Sin Row-Level Security en PostgreSQL** — No hay defensa a nivel de base de datos. Si una query olvida el filtro `clinicId`, la BD no lo rechaza.

4. **`GET /patients/` sin scope de clínica** (`routes/patients.ts:39`) — Retorna todos los pacientes del sistema. En multi-tenant, esto sería una fuga masiva de datos.

5. **`GET /admin/users` sin scope de clínica** (`routes/admin.ts:13`) — Un admin de Clínica B podría ver y modificar usuarios de Clínica A.

### 🟡 Necesarios para habilitar multi-tenant (no son fuga hoy, pero bloquean la funcionalidad)

6. **Sin modelo `Clinic`** — Falta la entidad raíz del árbol de tenants. Todos los demás cambios dependen de que exista.

7. **Sin endpoint de registro de clínica** — No hay forma de dar de alta una nueva clínica sin tocar el seed o la BD directamente.

8. **Sin `publicKey` por clínica** — Impide capturar leads desde sitios web externos de forma segura (identificar a qué clínica pertenece un formulario público).

### 🟢 Mejoras (no bloquean seguridad hoy, pero son necesarias para el producto completo)

9. **Sin modelo `Lead`** — No se pueden capturar ni gestionar prospectos desde los sitios web de cada clínica.

10. **Sin endpoint `POST /public/leads`** — No hay forma de recibir leads desde el sitio comercial de cada clínica.

11. **Sin filtros de `clinicId` en ninguna ruta** — Cuando exista el campo, habrá que actualizar las ~15 rutas afectadas para aplicar el filtro en reads y setear el valor en writes.

---

## PLAN DE BACKFILL (solo el plan — no ejecutar)

Este es el orden para migrar los datos existentes a una clínica por defecto sin romper el seed actual ni requerir downtime:

### Premisa
El seed limpia toda la BD con `deleteMany()` en cascada al inicio de cada ejecución. Por tanto, el riesgo de romper datos de producción es bajo. El riesgo real es romper el seed en sí y los tests.

### Pasos

**Paso A — Migración 1: agregar tabla `clinics` y columna con DEFAULT**
```sql
-- 1. Crear tabla clinics con UUID fijo para la clínica demo
CREATE TABLE "clinics" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "ruc" TEXT,
  "public_key" TEXT UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- 2. Insertar la clínica por defecto con UUID fijo conocido
INSERT INTO "clinics" ("id", "name")
VALUES ('00000000-0000-4000-9000-000000000001', 'Derma Piel y Pelo');

-- 3. Agregar clinic_id con DEFAULT al UUID fijo → backfill automático de filas existentes
ALTER TABLE "users"      ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "patients"   ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "services"   ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "appointments" ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
-- ... repetir para inventory, invoices, audit_logs, consent_templates, professionals
```

**Paso B — Migración 2: agregar FKs y quitar el DEFAULT**
```sql
-- Una vez que todos los datos existentes tienen clinic_id, agregar la FK
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT;
-- ... repetir para cada tabla

-- Quitar los DEFAULT para que nuevas filas sin clinicId fallen con error claro
ALTER TABLE "users"    ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "patients" ALTER COLUMN "clinic_id" DROP DEFAULT;
-- ...
```

**Paso C — Actualizar seed.ts**
```
1. Añadir al inicio del cleanup: await prisma.clinic.deleteMany()
2. Crear la clínica con el UUID fijo ANTES de crear profesionales y usuarios:
   await prisma.clinic.create({ data: { id: ID.clinic, name: "Derma Piel y Pelo" } })
3. Pasar clinicId: ID.clinic en cada createMany de datos
```

**Por qué este orden no rompe el seed:**
- El DEFAULT garantiza que las filas pre-existentes (si las hay) se migren automáticamente en la Migración 1.
- El seed, al hacer `deleteMany()` completo antes de insertar, siempre arranca de cero; solo necesita que `clinic.deleteMany()` esté al inicio y que `clinicId` esté presente en cada `create`.
- El UUID fijo (`00000000-0000-4000-9000-000000000001`) permite referenciar la clínica demo desde el seed sin necesitar una query previa.

---

## RESUMEN EJECUTIVO

| Dimensión | Estado actual |
|-----------|--------------|
| Arquitectura de tenancy | Single-tenant (una clínica hard-coded) |
| Aislamiento de datos | Inexistente — no hay `clinicId` en ninguna tabla |
| Contexto en JWT | Inexistente — el token no lleva `clinicId` |
| Filtrado en queries | Inexistente — todas las queries retornan datos globales |
| RLS en PostgreSQL | Inexistente |
| Onboarding de clínica | Inexistente |
| Gestión de leads | Inexistente |
| Riesgo si se agrega una 2a clínica sin cambios | **CRÍTICO** — fuga total de datos entre clínicas |

El proyecto está en un estado limpio para operar multi-tenant: el schema es coherente y el seed actual no crea clínicas, usuarios, profesionales ni datos demo. El primer tenant debe crearse por flujo controlado de registro de clínica o administración de plataforma.
