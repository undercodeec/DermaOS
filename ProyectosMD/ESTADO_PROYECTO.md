# 📋 ESTADO DEL PROYECTO — DERMA-OS
> Ultima actualizacion: 2026-07-17 (migracion local aplicada)

---

## 🏗️ Arquitectura de Producción

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Netlify    │       │     Render       │       │    Supabase      │
│  (Frontend)  │──────▶│   (API Express)  │──────▶│  (PostgreSQL)    │
│  React/Vite  │       │  Node.js/Prisma  │       │   Serverless     │
└──────────────┘       └──────────────────┘       └──────────────────┘
```

| Componente | Plataforma | URL | Plan |
|-----------|-----------|-----|------|
| **Dashboard** | Netlify | `https://dermasos.netlify.app` | Free |
| **API** | Render | `https://derma-os-api.onrender.com` | Free |
| **Base de Datos** | Supabase | Panel de Supabase | Free (500 MB) |

---

## 📂 Estructura del Monorepo

```
derma-os/
├── apps/
│   ├── api/                          # Backend Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Esquema de BD (con directUrl para Supabase)
│   │   │   ├── seed.ts               # Limpieza total; no crea datos precargados
│   │   │   └── migrations/           # Migraciones de Prisma
│   │   ├── src/
│   │   │   ├── server.ts             # Entry point (CORS dinámico con logs)
│   │   │   ├── env.ts                # Validación de variables de entorno (Zod)
│   │   │   ├── routes/               # Rutas REST (auth, patients, photos, etc.)
│   │   │   ├── middleware/            # Auth middleware (JWT)
│   │   │   └── lib/                  # Utilidades (jwt, errors, permissions)
│   │   ├── .env                      # ⚡ Entorno ACTIVO (local o supabase)
│   │   ├── .env.local                # 🏠 Respaldo de credenciales locales
│   │   └── .env.supabase             # ☁️ Respaldo de credenciales Supabase
│   │
│   └── dashboard/                    # Frontend React + Vite
│       ├── src/
│       │   ├── App.tsx
│       │   ├── features/             # Módulos (patients, agenda, billing, etc.)
│       │   ├── components/           # UI compartida (Header, Sidebar, Modal)
│       │   ├── lib/                  # API client, auth, helpers
│       │   └── styles/               # CSS del tema
│       ├── .env.local                # VITE_API_URL (local: http://127.0.0.1:4000)
│       └── vite.config.ts
│
├── netlify.toml                      # Config de deploy para Netlify
├── render.yaml                       # Blueprint de deploy para Render
├── package.json                      # Scripts raíz del monorepo
├── pnpm-workspace.yaml               # Workspace config
└── .gitignore                        # Protege .env, .env.supabase, .env.local
```

---

## 🔄 Flujo de Trabajo: Local vs Producción

### Desarrollo Local (día a día)
```powershell
# Tu .env ya apunta a PostgreSQL local por defecto
pnpm dev                              # Levanta API + Dashboard
```

### Cambiar a Supabase (cuando necesites migrar datos a producción)
```powershell
copy apps\api\.env.supabase apps\api\.env
pnpm --filter @derma-os/api db:migrate
pnpm --filter @derma-os/api db:seed        # Limpia todo; no crea datos demo
```

### Volver a local (después de migrar)
```powershell
copy apps\api\.env.local apps\api\.env
```

### Desplegar a producción (cuando estés listo)
```powershell
git add .
git commit -m "descripción del cambio"
git push                              # ← Esto dispara deploy en Render y Netlify
```

> ⚠️ **IMPORTANTE**: No hacer `git push` hasta que estés seguro de que los cambios
> están listos para producción. Un `git commit` sin `push` es seguro y no despliega nada.

---

## 🔐 Variables de Entorno

### API en local (`apps/api/.env`)
```env
DATABASE_URL="postgresql://postgres:PASSWORD@127.0.0.1:5432/derma_os?schema=public"
DIRECT_URL="postgresql://postgres:PASSWORD@127.0.0.1:5432/derma_os?schema=public"
JWT_SECRET="dev-only-secret-replace-me-with-openssl-rand"
JWT_EXPIRES_IN="12h"
UPLOAD_DIR="uploads"
CORS_ORIGIN="http://localhost:5173"
PORT=4000
```

### API en Render (producción)
| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URI de Supabase (puerto `6543`, pgbouncer) |
| `DIRECT_URL` | URI de Supabase (puerto `5432`, directo) |
| `JWT_SECRET` | Auto-generado por Render |
| `JWT_EXPIRES_IN` | `12h` |
| `CORS_ORIGIN` | `https://dermasos.netlify.app` |
| `PAYPHONE_CREDENTIAL_KEY` | Clave fuerte para cifrar tokens Payphone por clínica |
| `PAYPHONE_API_BASE` | `https://pay.payphonetodoesposible.com/api` |
| `PLATFORM_PAYPHONE_TOKEN` | Token Payphone Business de DERMA-OS para cobrar suscripciones |
| `PLATFORM_PAYPHONE_STORE_ID` | Store ID Payphone Business de DERMA-OS |
| `PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT` | Valor mensual por defecto para links de suscripción |

### Dashboard en Netlify
| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://derma-os-api.onrender.com` |

---

## 📊 Estado de Módulos (2026-06-20 — actualizado)

| Módulo | API | UI dashboard |
|---|---|---|
| Auth + permisos + auditoría | ✅ | ✅ Login + AdminView |
| MFA TOTP (RFC 6238, nativo) | ✅ setup QR + verify + reset | ✅ 3 pasos: creds → setup QR → TOTP |
| Pacientes (lista + ficha 7 tabs) | ✅ | ✅ lectura + escritura completa |
| Historia: evolución + recetas | ✅ CRUD completo | ✅ crear + editar + eliminar |
| Fotos | ✅ filesystem JWT | ✅ subida + slider + lightbox |
| Consentimientos | ✅ | ✅ crear + firma canvas |
| Paquetes/bonos | ✅ catálogo + venta + consumo auto | ✅ venta + abonos + historial |
| Agenda | ✅ + cobertura paquete | ✅ semanal + estados + nueva cita |
| Cobros / PayPhone | ✅ credenciales por clínica + API Link + webhook | ✅ generar + detalle + config admin |
| Facturas SRI | ✅ flujo borrador→autorizada | ✅ RIDE imprimible |
| Inventario | ✅ CRUD completo + ajuste stock | ✅ tabla + editar + eliminar + delta custom |
| Admin (usuarios/matriz/bitácora) | ✅ + reset MFA | ✅ AdminView |
| **Multi-tenant (aislamiento por clínica)** | ✅ modelo Clinic + clinicId en 12 tablas + JWT + filtros | ✅ transparente (sin cambios de UI) |
| **Demo / suscripción SaaS** | ✅ trial 7 días + bloqueo por módulo + cobro Payphone | ✅ dashboard interno `/platform` |

### Pendientes
| Item | Prioridad |
|------|-----------|
| Aplicar migración en Supabase/Render producción sin ejecutar `db:seed` salvo limpieza total explícita | Alta — antes del próximo `git push` |
| UI para registro de nueva clínica (consume `POST /clinics/register`) | Media — backend listo |
| Solicitar a Payphone activación de Notificación Externa para el webhook `/payments/payphone/NotificacionPago` | Alta — requerida para conciliación automática real |
| Validación operativa con credenciales Payphone reales por clínica antes de `git push` | Alta — evita volver a links simulados |
| Evaluar Token de terceros / comercio aliado Payphone cuando el SaaS tenga varias clínicas | Media — reduce fricción de onboarding |
| Configurar `PLATFORM_PAYPHONE_TOKEN` y `PLATFORM_PAYPHONE_STORE_ID` en Render | Alta — requerido para links de suscripción DERMA-OS |
| Solicitar a Payphone Notificación Externa para `/platform/payphone/NotificacionPago` | Alta — requerido para extender suscripciones automáticamente |
| Validar dashboard interno `/platform` con `PLATFORM_REGISTER_KEY` antes de ventas piloto | Alta — controla demos y accesos |
| Validar migraciones en producción Render antes del piloto | Alta — local quedó aplicado y Prisma Client regenerado |
| Ejecutar audit de dependencias con `npm audit`/`pnpm audit` en ambiente con gestor disponible | Media — el runtime local de Codex solo expuso `node.exe` |
| Sitio comercial `apps/site` | Baja — diseño antes que código |
| Firma `.p12` + webservice SRI real | Baja — fuera de alcance demo |

---

## 🛠️ Historial de Cambios de Infraestructura

### 2026-06-18 — Deploy inicial y migración a Supabase

1. **Archivos de deploy creados:**
   - `netlify.toml` — Config de Netlify con SPA redirect y headers de seguridad
   - `render.yaml` — Blueprint de Render (API + PostgreSQL)

2. **Fix: orden de build en Render**
   - `npx prisma generate` ahora se ejecuta **antes** de `tsc` para que TypeScript
     encuentre los tipos generados de Prisma (`Role`, `PatientWhereInput`, etc.)

3. **Fix: ruta del servidor compilado**
   - TypeScript preserva la estructura de carpetas al compilar, por lo que el
     archivo queda en `dist/src/server.js` (no `dist/server.js`)
   - Corregido en `render.yaml` y `apps/api/package.json`

4. **Fix: sistema CORS mejorado**
   - Se reemplazó la config estática de CORS por un validador dinámico con logs
   - Al iniciar el servidor se muestra: `[cors] allowed origins: [...]`
   - Orígenes bloqueados se loguean: `[cors] BLOCKED origin: "..."`

5. **Migración de BD: Render PostgreSQL → Supabase**
   - Se agregó `directUrl` al `schema.prisma` para soportar pgBouncer de Supabase
   - Se crearon archivos `.env.local` y `.env.supabase` para cambio rápido de entorno
   - Se protegieron ambos archivos en `.gitignore`

### 2026-06-18/20 — Funcionalidades MVP

1. **MFA TOTP nativo** (`apps/api/src/lib/totp.ts`)
   - RFC 6238 + RFC 4226, HMAC-SHA1, base32, ventana ±1 — sin dependencias nuevas
   - `POST /auth/login` devuelve `{mfaSetup}` o `{mfaRequired}` según estado
   - `POST /auth/mfa/verify-setup` confirma primer token y finaliza login
   - `POST /admin/users/:id/mfa/reset` limpia `mfa_secret` (admin)
   - Migración `20260618120000_add_mfa_secret`: columna `mfa_secret TEXT` en `users`
   - Dashboard: 3 pasos (credenciales → QR setup con `api.qrserver.com` → código TOTP)

2. **Edit/delete historia clínica**
   - `PATCH /patients/:id/evolucion/:rid` + `DELETE` (con auditoría)
   - `PATCH /patients/:id/recetas/:rid` + `DELETE` (con auditoría)
   - `NewEvolucionModal` y `NewRecetaModal` aceptan `edit?` prop
   - `TabEvolucion` y `TabRecetas` con botones pen/trash por registro

3. **Inventario: mutaciones completas**
   - `PATCH /inventory/:id` — editar campos (nombre, tipo, unidad, mínimo, lote, venc.)
   - `DELETE /inventory/:id` — eliminar ítem con auditoría
   - `NewItemModal` acepta `edit?` prop (oculta stock inicial al editar)
   - `InventoryView`: botones pen/trash por fila; columna Ajustar con input delta + −/+

4. **Seed reducido** *(superado el 2026-07-17)*
   - En ese momento se redujo a usuarios mínimos para pruebas
   - Estado actual: `seed.ts` no crea usuarios, clínicas ni registros demo

### 2026-06-20 — Multi-tenant por clínica

1. **Modelo de tenant `Clinic`** (`schema.prisma`)
   - Nueva tabla `clinics` (id, name, ruc, public_key, active)
   - `clinicId` agregado a 12 tablas: users, patients, professionals, services, packages, package_balances, inventory, invoices, audit_logs, consent_templates, appointments, payments
   - Índice `clinic_id_idx` en cada tabla; único compuesto `[clinicId, idType, idNumber]` en patients

2. **Migración** (`20260620000000_add_clinic_tenant/migration.sql`)
   - Inserta clínica demo UUID fijo `00000000-0000-4000-9000-000000000001`
   - Agrega columnas con DEFAULT para backfill de datos existentes
   - Elimina DEFAULT al final (nuevas filas requieren `clinicId` explícito)

3. **JWT y middleware** (`lib/jwt.ts`, `middleware/auth.ts`)
   - `TokenPayload` incluye `clinicId`
   - `req.user` expone `clinicId` en todo el ciclo de request

4. **Capa de aplicación — filtrado automático** (todas las rutas)
   - Reads: `where: { clinicId: req.user!.clinicId, ... }`
   - Writes: `data: { clinicId: req.user!.clinicId, ... }`
   - Sub-recursos protegidos vía `router.param('id', ...)` en `patients.ts`
   - Acceso por ID verificado con `findFirst({ where: { id, clinicId } })`

5. **Auditoría** (`lib/audit.ts`)
   - `auditLog.create` incluye `clinicId` → bitácora aislada por clínica

6. **Registro de nueva clínica** (`routes/clinics.ts`, `POST /clinics/register`)
   - Crea clínica + usuario admin en una transacción
   - Devuelve JWT ya autenticado con el clinicId de la nueva clínica

7. **Seed actualizado** (`prisma/seed.ts`)
   - Crea la clínica antes que profesionales/usuarios
   - Todos los registros llevan `clinicId: ID.clinic`

### 2026-07-17 — Payphone real por clínica (modelo pragmático)

1. **Credenciales Payphone aisladas por clínica**
   - Nueva tabla `clinic_payment_providers`
   - Relación 1:1 con `Clinic` mediante `clinicId`
   - Modo inicial `manual`: cada clínica ingresa su `storeId` y token Payphone Business/API
   - Token cifrado en backend con AES-256-GCM (`PAYPHONE_CREDENTIAL_KEY` o `JWT_SECRET`)
   - No existe token Payphone global ni compartido entre clínicas

2. **Panel Admin**
   - `GET /admin/payphone` devuelve estado seguro de configuración sin exponer token
   - `PUT /admin/payphone` guarda RUC, Store ID, token y estado activo/desactivado
   - UI agregada en Sistema → Payphone por clínica

3. **Cobros con API Link**
   - `POST /payments` ya no genera links simulados
   - Antes de cobrar, el backend carga credenciales por `req.user.clinicId`
   - Llama a `POST https://pay.payphonetodoesposible.com/api/Links`
   - Guarda `clientTransactionId`, `payphoneStoreId`, `providerStatus` y `providerPayload`
   - Si la clínica no configuró Payphone, la API rechaza el cobro con error claro

4. **Webhook de conciliación**
   - Nuevo endpoint público: `POST /payments/payphone/NotificacionPago`
   - Valida `StoreId`, `ClientTransactionId`, estado aprobado y monto en centavos
   - Marca el cobro como `pagado`
   - Si el cobro corresponde a paquete, registra el abono automáticamente
   - Idempotente: si el cobro ya está pagado, responde exitosamente sin duplicar abonos

5. **Ruta futura**
   - Mantener `mode = manual` para salir rápido a producción
   - Migrar luego a Token de terceros / comercio aliado Payphone para onboarding SaaS sin copiar credenciales manualmente

### 2026-07-17 — Demo 7 días y suscripciones DERMA-OS

1. **Estado comercial por clínica**
   - Nueva tabla `clinic_subscriptions`
   - Estados: `pending_verification`, `trialing`, `active`, `expired`, `suspended`
   - Fechas: `trial_started_at`, `trial_ends_at`, `subscription_ends_at`
   - `allowed_modules` define qué módulos puede usar cada clínica

2. **Bloqueo automático por demo/suscripción**
   - `requireModule()` ahora valida permisos por rol y acceso comercial por clínica
   - Si la demo o suscripción vence, los módulos quedan bloqueados
   - El bloqueo se calcula en tiempo real; no requiere cron inicial

3. **Dashboard interno de plataforma**
   - Nueva ruta frontend `/platform`
   - Acceso mediante `PLATFORM_REGISTER_KEY`
   - Lista clínicas, estado comercial, días restantes, admin principal y módulos habilitados
   - Permite activar demo 7 días, extender 1 mes manualmente, suspender y guardar módulos

4. **Cobro de suscripción con Payphone Business de DERMA-OS**
   - Nuevas variables: `PLATFORM_PAYPHONE_TOKEN`, `PLATFORM_PAYPHONE_STORE_ID`, `PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT`
   - `POST /platform/clinics/:id/payment-link` genera link mensual con API Link
   - Nueva tabla `platform_subscription_payments`
   - Webhook público: `POST /platform/payphone/NotificacionPago`
   - Al confirmar pago, extiende `subscription_ends_at` según los meses pagados

5. **Ruta futura escalable**
   - Automatizar recordatorios antes de vencimiento
   - Agregar planes formales y límites por plan
   - Migrar a Suscripciones recurrentes Payphone cuando Payphone habilite el producto en la cuenta Business

### 2026-07-17 — Testing y hardening de seguridad Payphone / demo

1. **Llave interna de plataforma**
   - `requirePlatformKey()` ahora compara `PLATFORM_REGISTER_KEY` con `crypto.timingSafeEqual`
   - Rechaza headers múltiples en `x-platform-key`
   - El dashboard `/platform` guarda la llave en `sessionStorage`, no en `localStorage`

2. **Webhooks Payphone idempotentes**
   - `/payments/payphone/NotificacionPago` solo concilia pagos en estado `pendiente`
   - `/platform/payphone/NotificacionPago` solo extiende suscripciones en estado `pendiente`
   - Se usa actualización atómica por estado para evitar doble conciliación o doble extensión por notificaciones concurrentes/repetidas

3. **IDs y límites defensivos**
   - `clientTransactionId` ahora usa `crypto.randomBytes`, no `Math.random`
   - Demo limitado a máximo 30 días por request interno
   - Extensión y links de suscripción limitados a máximo 24 meses
   - Monto de link de suscripción limitado a máximo 10000

4. **Validación ejecutada**
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - `git diff --check`: OK
   - Escaneo puntual: no se devuelve token Payphone al frontend; solo `storeId` y `hasToken`
   - No se pudo ejecutar audit de dependencias porque el runtime local solo expuso `node.exe`

### 2026-07-17 — Migracion local Prisma completada

1. **Migraciones aplicadas en PostgreSQL local**
   - `20260717000000_add_payphone_provider`
   - `20260717001000_add_clinic_subscriptions`
   - `20260717010000_add_login_email_code_fields`
   - Estado confirmado con `prisma migrate status`: `Database schema is up to date!`

2. **Prisma Client**
   - Se detuvieron temporalmente los servidores dev que bloqueaban `query_engine-windows.dll.node`
   - `prisma generate` finalizo correctamente
   - Typecheck API y dashboard quedaron OK despues de regenerar cliente

3. **Verificacion runtime local**
   - API activa en `http://127.0.0.1:4000/health` con respuesta 200
   - Dashboard activo en `http://localhost:5173/`
   - Tablas nuevas verificadas por Prisma:
     - `clinic_subscriptions=0`
     - `platform_subscription_payments=0`

4. **Pendiente de produccion**
   - Repetir `migrate deploy` contra Supabase/Render antes del piloto
   - Configurar `PLATFORM_PAYPHONE_TOKEN` y `PLATFORM_PAYPHONE_STORE_ID` en Render

### 2026-07-17 — Base limpia sin usuarios precargados

1. **Seed y clean sin datos demo**
   - `prisma/seed.ts` ya no crea clínica, profesionales ni usuarios demo
   - `prisma/clean.ts` elimina todos los registros y no recrea admin demo
   - No quedan credenciales demo históricas

2. **Migración de seguridad para base nueva**
   - Nueva migración `20260717020000_remove_empty_demo_clinic`
   - Elimina la clínica demo histórica solo si está vacía
   - Bases antiguas con datos reales no pierden información por esta migración

3. **Estado local verificado**
   - PostgreSQL local quedó con `clinics=0`, `users=0`, `professionals=0`, `patients=0`
   - También quedaron en cero `services`, `clinic_subscriptions`, `platform_subscription_payments` y `audit_logs`
   - `prisma migrate status`: `Database schema is up to date!`

---

## 👥 Credenciales de Prueba (Seed)

No existen usuarios precargados.

`prisma/seed.ts` y `prisma/clean.ts` dejan la base sin clínicas, usuarios ni registros demo.

El primer acceso debe crearse por flujo controlado:
- `POST /clinics/register` con `PLATFORM_REGISTER_KEY`
- Dashboard interno `/platform` para verificar, activar demo y controlar módulos

---

## 🧹 SQL para Limpiar Datos (borrado total)

Ejecutar en el **SQL Editor de Supabase** o cualquier cliente PostgreSQL:

```sql
TRUNCATE TABLE
  "audit_logs",
  "clinic_payment_providers",
  "platform_subscription_payments",
  "clinic_subscriptions",
  "payments",
  "package_redemptions",
  "package_payments",
  "package_balances",
  "packages",
  "invoices",
  "inventory",
  "procedures",
  "consents",
  "consent_templates",
  "photos",
  "clinical_records",
  "appointments",
  "services",
  "patients",
  "professionals",
  "users",
  "clinics"
RESTART IDENTITY CASCADE;
```

---

## ⚠️ Limitaciones del Plan Gratuito

| Plataforma | Limitación |
|-----------|-----------|
| **Render** | El servicio se suspende tras 15 min sin tráfico (cold start ~30-60s) |
| **Render** | BD PostgreSQL gratuita expira en 90 días |
| **Netlify** | 100 GB bandwidth / 300 min build por mes |
| **Supabase** | 500 MB de almacenamiento / 50k filas por tabla |

> 💡 **Tip**: Usa [UptimeRobot](https://uptimerobot.com) (gratis) para hacer ping a
> `https://derma-os-api.onrender.com/health` cada 14 min y evitar el cold start.
