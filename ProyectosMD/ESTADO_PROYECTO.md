# 📋 ESTADO DEL PROYECTO — DERMA-OS
> Ultima actualizacion: 2026-07-18 (correcciones derivadas de auditoria de codigo, seguridad e integridad)

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

### Estado actual corregido (2026-07-17)

| Area | Estado actual |
|------|---------------|
| Login y registro | Registro de nueva clinica disponible desde el `login-pane`; por desarrollo local entra directo sin verificacion de email. El codigo para reactivar verificacion queda comentado en backend. |
| Email login / verificacion | Login normaliza emails a lowercase. El codigo por email sigue disponible para `mfaEnabled` cuando la verificacion productiva este activa. |
| Usuarios por clinica | `AdminView` lista, crea y edita solo usuarios de la clinica actual. Email es unico global. `professionalId` es opcional y debe pertenecer a la misma clinica. |
| Profesionales | Crear usuario no crea profesional automaticamente. Para agenda/evolucion debe existir un registro en `professionals` y el usuario puede vincularse a ese profesional. |
| Admin UI | Se removio la tabla de Bitacora de auditoria y la Matriz de permisos de la UI. Queda usuarios + Payphone por clinica. |
| Multi-tenant | Rutas criticas validan IDs cruzados por `clinicId`: evolucion, recetas, procedimientos, paquetes y agenda. |
| Auth runtime | `requireAuth` consulta usuario y clinica en BD en cada request; cambios de rol/desactivacion aplican aunque el JWT anterior no haya expirado. |
| Superadmin global | Existe dashboard separado `/platform`, con login real `gerencia@undercodeec.com` + `PLATFORM_ADMIN_PASSWORD` desde `.env`, para gestionar clinicas, demos, modulos, suspension y links de suscripcion. |

### Siguientes pasos de desarrollo - Fichas clinicas imprimibles en PDF

Objetivo: crear una logica para generar fichas clinicas del paciente y permitir imprimirlas/exportarlas en PDF. El diseno final del PDF queda pendiente de definicion.

Flujo propuesto:

1. **Definir contenido de la ficha clinica**
   - Datos del paciente: nombres, identificacion, edad, sexo, contacto.
   - Antecedentes clinicos relevantes.
   - Evoluciones SOAP.
   - Recetas emitidas.
   - Procedimientos realizados.
   - Consentimientos vinculados.
   - Fotos clinicas seleccionadas si aplica.
   - Firma o datos del profesional responsable.

2. **Crear endpoint backend de ficha clinica**
   - Ruta sugerida: `GET /patients/:id/clinical-file`.
   - Debe validar que el paciente pertenece a `req.user.clinicId`.
   - Debe consolidar informacion desde `patients`, `clinical_records`, `procedures`, `consents`, `photos` y `professionals`.
   - Debe devolver JSON estructurado primero, antes de generar PDF, para facilitar pruebas y UI.

3. **Crear vista previa en dashboard**
   - Agregar accion en ficha del paciente: `Ficha clinica`.
   - Mostrar preview HTML con secciones ordenadas.
   - Permitir filtros: rango de fechas, incluir/excluir recetas, fotos, procedimientos o consentimientos.
   - Permitir seleccionar profesional firmante si aplica.

4. **Generacion de PDF**
   - Primera opcion pragmatica: renderizar HTML imprimible y usar `window.print()` o CSS `@media print`.
   - Segunda etapa: generar PDF desde backend para descarga consistente.
   - Evaluar motor: HTML -> PDF con Playwright/Puppeteer en backend, o generacion directa con libreria PDF.
   - Guardar o no guardar el PDF debe decidirse: descarga temporal vs archivo historico.

5. **Diseno pendiente**
   - Definir encabezado: logo, datos de clinica, RUC, direccion, telefono.
   - Definir estructura visual: una pagina resumen + anexos, o ficha cronologica completa.
   - Definir si lleva numeracion, sello/firma, disclaimer legal y fecha de impresion.
   - Definir tratamiento de fotos: miniaturas, anexos por pagina o exclusion por defecto.

6. **Seguridad y auditoria**
   - Solo roles `admin` y `profesional` pueden generar e imprimir fichas clinicas completas.
   - Roles `recepcion`, `esteticista` y `contador` no deben generar ni imprimir fichas clinicas completas.
   - Registrar auditoria al generar/imprimir ficha clinica.
   - Respetar aislamiento por clinica.
   - No exponer fotos o documentos sin JWT.
   - Considerar marca de agua o pie con fecha/usuario que imprime.

7. **Implementacion recomendada por fases**
   - Fase 1: endpoint JSON consolidado + preview HTML en paciente.
   - Fase 2: CSS print y boton imprimir/exportar.
   - Fase 3: PDF backend con plantilla definitiva.
   - Fase 4: historico de PDFs generados si se requiere trazabilidad legal.

### Pendientes
| Item | Prioridad |
|------|-----------|
| Aplicar migración `20260718000000_harden_payment_and_redemption_integrity` en Supabase/Render después de revisar duplicados preexistentes | Alta — agrega unicidad de abonos/redenciones, secuencia de facturas e IDs Payphone |
| Configurar y validar SMTP en Render | Alta - el registro ya exige verificacion por email automaticamente en `NODE_ENV=production`; falta prueba con proveedor real |
| Agregar MFA al login del superadmin `/platform/login` | Alta - tiene password, JWT separado y rate limit, pero aun no segundo factor |
| Definir flujo usuario/profesional | Media - estado actual correcto: usuario y profesional son entidades separadas; si se desea, agregar checkbox/boton "crear profesional asociado" al crear usuario clinico |
| Solicitar a Payphone activación de Notificación Externa para el webhook `/payments/payphone/NotificacionPago` | Alta — requerida para conciliación automática real |
| Validación operativa con credenciales Payphone reales por clínica antes de `git push` | Alta — evita volver a links simulados |
| Evaluar Token de terceros / comercio aliado Payphone cuando el SaaS tenga varias clínicas | Media — reduce fricción de onboarding |
| Configurar `PLATFORM_PAYPHONE_TOKEN` y `PLATFORM_PAYPHONE_STORE_ID` en Render | Alta — requerido para links de suscripción DERMA-OS |
| Solicitar a Payphone Notificación Externa para `/platform/payphone/NotificacionPago` | Alta — requerido para extender suscripciones automáticamente |
| Validar dashboard interno `/platform` con `PLATFORM_REGISTER_KEY` antes de ventas piloto | Alta — controla demos y accesos |
| Validar migraciones en producción Render antes del piloto | Alta — Prisma Client local regenerado; la migracion del 2026-07-18 aun no fue aplicada a produccion |
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

### 2026-07-17 — Commit/push y prueba local manual

1. **Commit publicado**
   - Commit: `722f2cd Add SaaS trial subscriptions and clean seed data`
   - Push realizado a `origin/main`
   - Incluye demo/suscripcion SaaS, dashboard `/platform`, migraciones, hardening Payphone, seed limpio y documentacion

2. **Procesos locales**
   - Se cerraron procesos duplicados de `pnpm dev` que ocupaban `4000`, `5173` y `5174`
   - Para uso manual, levantar solo una instancia con `pnpm dev`
   - API esperada: `http://127.0.0.1:4000/health`
   - Dashboard esperado: `http://localhost:5173/`

3. **Prueba local de primer tenant**
   - Se valido que una base limpia no permite login hasta crear una clinica/admin
   - Se creo un tenant local de prueba por `POST /clinics/register` usando `PLATFORM_REGISTER_KEY`
   - Se valido login con el admin creado manualmente
   - Se activo demo de 7 dias desde `/platform/clinics/:id/trial`
   - Este usuario local no pertenece al seed ni queda precargado en el repositorio

---

### 2026-07-17 - Registro, usuarios por clinica y hardening multi-tenant

1. **Registro en UI de login**
   - `LoginScreen` incluye formulario de registro dentro de `.login-pane`
   - Texto de cambio desde login: usuario sin cuenta puede ir a registro sin pagina nueva
   - Registro temporal de desarrollo entra directo sin verificacion de email
   - El flujo de verificacion por email queda documentado/comentado para reactivarse despues de pruebas

2. **Variables SMTP**
   - `.env` local y ejemplos incluyen variables SMTP para envio de codigos por email
   - Variables relevantes: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `AUTH_EMAIL_SUBJECT`

3. **Usuarios de clinica**
   - `AdminView` permite crear y editar usuarios
   - Usuarios se guardan en tabla `users`
   - Cada usuario queda asociado por `clinicId`
   - `professionalId` es opcional y solo puede apuntar a un profesional de la misma clinica
   - Crear usuario no crea automaticamente un profesional para evitar ensuciar la logica de agenda/historia

4. **Profesionales**
   - Agenda y evolucion siguen leyendo desde tabla `professionals`
   - Si un usuario debe aparecer como profesional en agenda/evolucion, debe existir tambien en `professionals`
   - El usuario puede vincularse luego al profesional correcto desde AdminView

5. **Aislamiento multi-tenant reforzado**
   - Se normaliza email a lowercase en registro, verificacion y login
   - `requireAuth` valida usuario y clinica contra BD en cada request
   - Rutas de evolucion, recetas, procedimientos, paquetes y agenda validan `professionalId` por `clinicId`
   - Procedimientos validan `serviceId` por `clinicId`
   - Al marcar cita como `atendida`, consumo de paquete usa el profesional actualizado

6. **Admin UI simplificada**
   - Se elimino de UI la Bitacora de auditoria del menu usuarios/auditoria
   - Se elimino de UI la Matriz de permisos
   - Queda administracion de usuarios y Payphone por clinica

7. **Superadmin global**
   - Dashboard separado `/platform`
   - Login real con `gerencia@undercodeec.com` y password desde `PLATFORM_ADMIN_PASSWORD`
   - La validacion por email antes de ingresar queda comentada temporalmente para pruebas
   - Gestiona clinicas, demo, modulos, suspension, extension y links de suscripcion
   - No mezcla datos operativos de pacientes/evoluciones/agendas con admin de clinica

8. **Validacion ejecutada**
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - Build dashboard Vite: OK

### 2026-07-18 - Correcciones derivadas de auditoria de seguridad e integridad

Estas correcciones nacen de la auditoria documentada en
[`ProyectosMD/AUDITORIA_CODIGO_SEGURIDAD_2026-07-18.md`](./AUDITORIA_CODIGO_SEGURIDAD_2026-07-18.md).
Consultar ese documento en proximas sesiones para conservar el contexto, severidad,
evidencia y plan de pruebas original.

1. **Borrado destructivo protegido - hallazgo critico C-01 cerrado en codigo**
   - `prisma/seed.ts` ya no elimina datos; ahora es una operacion vacia y segura
   - `prisma/clean.ts` se bloquea siempre en `NODE_ENV=production`
   - En entornos no productivos exige `ALLOW_DATABASE_WIPE=I_UNDERSTAND_THIS_DELETES_ALL_DATA`
   - Prueba ejecutada: `seed` no modifico la base y `clean` rechazo la ejecucion sin confirmacion

2. **Pagos y abonos atomicos - H-01 y H-03 corregidos**
   - La conciliacion manual reclama el pago pendiente con `updateMany` dentro de una transaccion
   - Webhook y conciliacion manual ya no pueden acreditar normalmente el mismo cobro dos veces
   - Cada `PackagePayment` puede vincularse a un solo `Payment` mediante `paymentId @unique`
   - Un cobro de paquete exige que balance, paciente y clinica coincidan
   - Cobros de factura validan factura/paciente/clinica y conceptos libres rechazan referencias ajenas
   - Webhooks aprobados exigen `TransactionId` y se agrega unicidad por tienda/transaccion

3. **Consumo de sesiones y agenda - H-02 corregido**
   - `PackageRedemption.appointmentId` pasa a ser unico
   - Incremento de sesiones usa reclamacion optimista y transaccion con reintentos controlados
   - Una cita atendida no puede eliminarse por la ruta comun
   - `nextAppointment` se recalcula al crear, editar, cancelar o eliminar citas
   - El consumo filtra tambien `clinicId`

4. **Permisos efectivos y alcance profesional - H-04 corregido**
   - `requireAuth` carga `professionalId` desde BD en cada request
   - Profesional y esteticista solo consultan/modifican su agenda asociada
   - Un usuario profesional sin asociacion recibe rechazo explicito
   - `Limitado` ya no concede escritura completa de historia al esteticista
   - Conciliacion de pagos y consumo de inventario tienen capacidades separadas
   - Contador puede conciliar sin obtener permiso para crear/anular cobros
   - Profesional/esteticista pueden consumir inventario, pero solo admin puede reponerlo
   - No se permite desactivar o quitar el rol al ultimo admin activo de una clinica

5. **Facturacion residual contenida - H-05 mitigado/corregido en codigo**
   - Las rutas anidadas de facturacion rechazan acceso cuando `INVOICES_ENABLED=false`
   - Servicios, precios e IVA se reconstruyen desde BD y no se confia en valores del navegador
   - RUC se toma de la clinica y debe tener 13 digitos
   - Secuencia de factura se incrementa atomicamente por clinica
   - Unicidad de numero cambia de global a `[clinicId, number]`
   - SRI real con firma `.p12` continua fuera de alcance; mantener feature flag apagada

6. **Registro, secretos y proteccion contra abuso - H-07 mitigado**
   - Registro exige codigo por email automaticamente en produccion
   - Desarrollo conserva registro directo para pruebas locales
   - Rate limit por IP/identidad en login, registro, verificacion y login de plataforma
   - Superadmin usa `PLATFORM_JWT_SECRET` separado del JWT operativo
   - Produccion exige JWT de al menos 32 caracteres, password de plataforma de al menos 12 y clave Payphone dedicada
   - API elimina `X-Powered-By` y agrega headers de seguridad
   - Pendiente: MFA real para superadmin y rate limit distribuido si Render escala a varias instancias

7. **Fotos y servicios externos - hallazgos medios mitigados**
   - Fotos aceptan firma binaria real JPEG, PNG o WebP; SVG y MIME falso se rechazan
   - Nombres de archivo usan `crypto.randomBytes`
   - Si falla la creacion en BD, se elimina el archivo recien escrito
   - Upload limitado por usuario/clinica y por tamano
   - Payphone y SMTP tienen timeout de 15 segundos
   - Links de suscripcion fallidos quedan con estado `fallido` en vez de aparentar pendientes validos
   - Pendiente externo: mover fotos a almacenamiento privado persistente y definir limpieza de huerfanos

8. **Auditoria de plataforma**
   - Cambios de acceso, demo, extension y links de suscripcion generan `audit_logs`
   - Se registra clinica, accion, detalle e IP; usuario queda `null` porque el superadmin no es un `User` de tenant

9. **Migracion aplicada localmente; produccion pendiente**
   - `20260718000000_harden_payment_and_redemption_integrity`
   - Agrega `package_payments.payment_id` unico y FK a `payments`
   - Agrega unicidad de `package_redemptions.appointment_id`
   - Agrega secuencia de factura por clinica y unicidad compuesta
   - Agrega unicidad de transacciones Payphone confirmadas
   - `prisma migrate deploy` local: OK; las 8 migraciones quedaron aplicadas
   - Antes de `migrate deploy` en produccion, revisar si existen redenciones duplicadas por cita

10. **Pruebas y validacion ejecutadas**
   - Prisma schema validate: OK
   - Prisma Client generate: OK
   - Prisma migrate deploy local: OK
   - API iniciada despues de cambios: `GET http://127.0.0.1:4000/health` responde 200
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - Build dashboard Vite: OK, 966 modulos
   - Suite nueva API: 8 pruebas, 8 aprobadas
   - Casos cubiertos: permisos, conciliacion, consumo, facturacion SRI y rate limiting
   - `git diff --check`: OK; solo advertencias esperadas LF/CRLF

11. **Pendientes de la auditoria que requieren otra fase o servicio externo**
   - Pruebas dinamicas IDOR completas usando dos clinicas y una BD temporal
   - Restricciones/Row Level Security adicionales en PostgreSQL como segunda barrera multi-tenant
   - Confirmacion server-to-server o firma oficial de webhooks Payphone
   - Almacenamiento persistente privado para fotos clinicas
   - Migrar JWT operativo fuera de `localStorage` o aplicar CSP estricta tambien en frontend
   - Instalar/configurar ESLint y ejecutar audit de dependencias en CI
   - Probar backup y restauracion antes de usar datos clinicos reales

12. **Compatibilidad de configuracion existente verificada**
   - La API acepta `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID` para cobros de suscripcion; no requiere duplicarlos como `PLATFORM_PAYPHONE_*`
   - La configuracion SMTP existente `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` y `EMAIL_BUSINESS` se reconoce sin duplicar variables `SMTP_*`
   - Typecheck y carga del entorno ejecutados correctamente sin exponer credenciales

13. **Pendiente: migrar fotos clinicas desde VPS a Supabase Storage**
   - Implementacion preparada el 2026-07-18: la API soporta `PHOTO_STORAGE_PROVIDER=local|supabase` y conserva compatibilidad con archivos locales
   - Para nuevas fotos remotas, usar `PHOTO_STORAGE_PROVIDER=supabase`; los objetos se guardan como `supabase:clinicId/patientId/filename`
   - Lectura y eliminacion siguen pasando por la API autenticada; el dashboard no recibe URL publica ni la clave de Supabase
   - Validacion ejecutada: typecheck API y 9/9 pruebas aprobadas, incluida escritura, lectura y limpieza local del adaptador de fotos
   - Crear bucket privado `clinical-photos`; nunca publicar URLs permanentes de fotos clinicas
   - Usar una ruta determinista por tenant y paciente: `clinicId/patientId/photoId.extension`
   - Guardar en la base de datos el `objectKey` remoto, no una URL publica ni una ruta absoluta de la VPS
   - La API debe autorizar clinica/usuario antes de transmitir el binario privado; una URL firmada de corta duracion queda como optimizacion futura, no como requisito para el primer despliegue
   - La clave con privilegios de Storage se mantiene solo en `apps/api/.env`; nunca en dashboard ni en variables `VITE_*`
   - Pendiente de intervencion del propietario: crear el bucket privado, configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, y cambiar el proveedor a `supabase` al desplegar
   - No hay fotos actuales, por lo que no se requiere migracion. Si se agregan archivos locales antes de activar Supabase, respaldar `uploads/`, copiar, verificar conteo/tamano o hash y conservar copia local por 30 dias antes de borrar
   - Ejecutar primero sobre una copia de prueba y registrar archivos fallidos; la operacion debe poder reintentarse sin duplicar objetos
   - Referencia: Supabase Storage con bucket privado, RLS y URLs firmadas

14. **Contexto operativo: fotos en Supabase Storage (2026-07-18)**
   - Se implemento `src/lib/photo-storage.ts`; no requiere dependencia adicional y usa la API REST de Supabase desde el backend
   - `src/routes/photos.ts` conserva las validaciones existentes de clinica, usuario, tipo binario, limite de tamano, rate limit y auditoria
   - Nuevas fotos remotas usan `storagePath` con prefijo `supabase:`; fotos antiguas o locales usan `local:` o el nombre historico, por compatibilidad
   - El dashboard continua solicitando `GET /photos/:id/file` con JWT propio; la API verifica el tenant y transmite el binario. No hay bucket publico, URL publica ni clave de Storage en el navegador
   - Estado actual del entorno: `PHOTO_STORAGE_PROVIDER=local` y `SUPABASE_PHOTO_BUCKET=clinical-photos`; no hay fotos ni migracion requerida
   - Intervencion pendiente del propietario: crear el bucket privado `clinical-photos` en Supabase y agregar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` al `.env` de `apps/api`
   - Activacion posterior: cambiar `PHOTO_STORAGE_PROVIDER=supabase` y reiniciar la API. La validacion de entorno impedira activar Supabase sin URL y clave de servicio
   - Nunca agregar `SUPABASE_SERVICE_ROLE_KEY` al dashboard o a una variable `VITE_*`

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

---

## 🖥️ Despliegue en VPS — Estado y pasos pendientes

### Contexto decidido

- La aplicación se desplegará en una VPS propia.
- PostgreSQL se ejecutará inicialmente en la misma VPS.
- Supabase se utilizará inicialmente solo para Storage de fotografías clínicas.
- El dominio previsto tendrá dos subdominios:
  - `app.<dominio>` para el dashboard.
  - `api.<dominio>` para la API.
- La base de datos no necesita migración actualmente porque no existen datos productivos.
- Las fotografías comenzarán en almacenamiento local persistente de la VPS y luego podrán pasar a Supabase Storage.

### Progreso actual

- ✅ Paso 1: dominio/DNS y acceso inicial a la VPS.
- ✅ Paso 2: actualización del servidor, usuario de despliegue, firewall y herramientas base.
- ✅ Paso 3: instalación/configuración inicial de Node, pnpm y PostgreSQL.
- ⏳ Paso 4 en adelante: pendiente.

### Pasos pendientes para continuar

#### 4. Configurar la API

Crear `/opt/derma-os/apps/api/.env` con producción, PostgreSQL local de la VPS, secretos fuertes, `CORS_ORIGIN` del dashboard, `UPLOAD_DIR` persistente y `INVOICES_ENABLED=false` mientras facturación no esté lista.

Crear el directorio persistente de fotos:

```bash
mkdir -p /opt/derma-os/apps/api/uploads
chmod 700 /opt/derma-os/apps/api/uploads
```

#### 5. Aplicar esquema y construir

Desde la raíz del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm --filter @derma-os/api db:generate
pnpm --filter @derma-os/api exec prisma migrate deploy
pnpm build
```

No ejecutar en producción `db:reset`, `db:clean`, `db:seed` ni `prisma db push`.

#### 6. Configurar el dashboard

Crear `apps/dashboard/.env.production`:

```env
VITE_API_URL=https://api.<dominio>
```

Reconstruir el dashboard:

```bash
pnpm --filter @derma-os/dashboard build
```

El valor de `VITE_API_URL` queda incorporado durante el build; si se omite, el dashboard intentará usar `127.0.0.1:4000`.

#### 7. Ejecutar la API como servicio

Crear `/etc/systemd/system/derma-api.service` con:

```ini
[Unit]
Description=DERMA-OS API
After=network.target postgresql.service

[Service]
Type=simple
User=derma
WorkingDirectory=/opt/derma-os/apps/api
EnvironmentFile=/opt/derma-os/apps/api/.env
ExecStart=/usr/bin/node /opt/derma-os/apps/api/dist/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activar y probar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now derma-api
sudo systemctl status derma-api
curl http://127.0.0.1:4000/health
```

#### 8. Configurar Nginx

- Dashboard: servir `/opt/derma-os/apps/dashboard/dist` en `app.<dominio>`.
- API: hacer proxy de `api.<dominio>` hacia `http://127.0.0.1:4000`.
- Verificar con `nginx -t` y recargar Nginx.

#### 9. Activar HTTPS

Usar Certbot para emitir certificados para ambos subdominios:

```bash
sudo certbot --nginx -d app.<dominio> -d api.<dominio>
sudo certbot renew --dry-run
```

#### 10. Probar Supabase Storage

Inicialmente mantener:

```env
PHOTO_STORAGE_PROVIDER=local
```

Para activar Supabase posteriormente:

1. Crear bucket privado `clinical-photos`.
2. Configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_PHOTO_BUCKET` únicamente en la API.
3. Cambiar `PHOTO_STORAGE_PROVIDER=supabase`.
4. Reiniciar `derma-api`.
5. Probar subida, lectura, eliminación y recuperación de fotografías.

### Verificaciones antes del piloto

- Backup diario de PostgreSQL.
- Backup de `apps/api/uploads` mientras se use almacenamiento local.
- Puerto PostgreSQL `5432` no expuesto públicamente.
- HTTPS funcionando en dashboard y API.
- `CORS_ORIGIN` limitado al dominio real.
- Prueba de aislamiento entre dos clínicas.
- Prueba de lectura de fotos con JWT y validación de `clinicId`.
- Prueba de restauración de backup.
- No guardar secretos en Git ni en variables `VITE_*`.
