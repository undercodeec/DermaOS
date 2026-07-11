# 📋 ESTADO DEL PROYECTO — DERMA-OS
> Última actualización: 2026-06-20 (sesión tarde)

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
│   │   │   ├── seed.ts               # Datos iniciales (usuarios, servicios, pacientes)
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
pnpm --filter @derma-os/api db:seed        # Solo si necesitas datos iniciales
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
| Cobros / PayPhone | ✅ + conciliación paquetes | ✅ generar + detalle |
| Facturas SRI | ✅ flujo borrador→autorizada | ✅ RIDE imprimible |
| Inventario | ✅ CRUD completo + ajuste stock | ✅ tabla + editar + eliminar + delta custom |
| Admin (usuarios/matriz/bitácora) | ✅ + reset MFA | ✅ AdminView |
| **Multi-tenant (aislamiento por clínica)** | ✅ modelo Clinic + clinicId en 12 tablas + JWT + filtros | ✅ transparente (sin cambios de UI) |

### Pendientes
| Item | Prioridad |
|------|-----------|
| Aplicar migración en Supabase (producción): copiar `.env.supabase` → `.env`, luego `db:migrate` + `db:seed` | Alta — antes del próximo `git push` |
| UI para registro de nueva clínica (consume `POST /clinics/register`) | Media — backend listo |
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

4. **Seed reducido**
   - `seed.ts` reescrito: solo 6 usuarios + 2 profesionales (FK requeridas)
   - Sin pacientes, citas, fotos, facturas ni inventario demo

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

---

## 👥 Credenciales de Prueba (Seed)

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@dermapielypelo.ec` | `derma123` | Admin |
| `recepcion@dermapielypelo.ec` | `derma123` | Recepción |
| `v.andrade@dermapielypelo.ec` | `derma123` | Profesional |
| `e.cordero@dermapielypelo.ec` | `derma123` | Profesional |
| `estetica@dermapielypelo.ec` | `derma123` | Esteticista |
| `contabilidad@dermapielypelo.ec` | `derma123` | Contador (inactivo) |

---

## 🧹 SQL para Limpiar Datos (sin borrar usuarios)

Ejecutar en el **SQL Editor de Supabase** o cualquier cliente PostgreSQL:

```sql
TRUNCATE TABLE
  "audit_logs",
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
  "patients"
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
