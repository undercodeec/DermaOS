# DERMA-OS — Estado del Proyecto

> **Cambio de stack — 2026-06-17**: el backend Supabase fue reemplazado por **Express + Prisma + JWT
> sobre PostgreSQL local** (administrado con pgAdmin 4). El prototipo legacy queda intacto en
> `derma/` + `DERMA-OS Demo.html` como referencia funcional. La build de producción vive en
> `apps/dashboard` (UI) y `apps/api` (API REST). Setup completo en [`README.md`](./README.md).
>
> **Para quien retome esto en otra sesión:** lee primero `README.md`, luego este archivo.

---

## 0. Arranque rápido (cold start)

### Stack de producción (recomendado)

```bash
# 1. Crear base derma_os en pgAdmin 4 (o psql) con rol postgres
# 2. Editar apps/api/.env con la password real de Postgres y un JWT_SECRET fuerte
pnpm install
pnpm db:migrate                  # prisma migrate dev (crea tablas + enums)
pnpm db:seed                     # crea usuarios bcrypt + datos demo
pnpm dev                         # api :4000 + dashboard :5173 en paralelo
```

Usuario admin demo: `admin@dermapielypelo.ec` / `derma123`.
Prisma Studio (UI tipo dbeaver): `pnpm db:studio` → `:5555`.

### Prototipo legacy (referencia visual y de lógica)

1. Abre `DERMA-OS Demo.html` en el browser.
2. Selecciona "Christopher Gallardo (Admin)" en el login fake.
3. Explora los módulos — el sidebar filtra por rol.
4. Reiniciar datos demo: botón "Reiniciar datos demo" en el pie del sidebar.

---

## 1. Contexto del proyecto

| Campo | Valor |
|---|---|
| **Producto** | DERMA-OS — Sistema operativo del centro dermatológico |
| **Centro** | Derma Piel y Pelo (Ecuador) |
| **Entregable actual** | Monorepo pnpm: `apps/api` (Express+Prisma) + `apps/dashboard` (Vite+React+TS), Postgres local |
| **Entrypoint dev** | `pnpm dev` → API `:4000` + dashboard `:5173` (concurrently) |
| **Entrypoint legacy** | `DERMA-OS Demo.html` (prototipo congelado de referencia) |
| **Título del proyecto** | Demo Dashboard Centro Dermatologico |
| **Audience** | Médico/dueño del centro (validar flujo clínico) |
| **Dispositivo objetivo** | Laptop/desktop 1440px+ |
| **Design system adjunto** | ID `201c3697-f8b3-40f7-8e35-a34e3fc5ec4d` (actualmente vacío) |

**Decisiones cerradas con el cliente — NO volver a preguntar:**
- Entregable: prototipo primero → sitio web comercial al final (diseño antes que código).
- Paleta: **teal LUNO** como primario (variable `--brown-700: #00AC9A`; los tokens conservan el prefijo `brown-` por compatibilidad histórica).
- Fidelidad: **totalmente interactivo** — citas, recetas, facturas persisten en sesión.
- Variaciones: **una sola dirección** bien ejecutada (sin Tweaks de paleta por ahora).
- Tipografía: *Nunito Sans* (UI) + *Caveat* (firmas).
- Profesionales simulados: **Dra. Verónica Andrade** (pr1) y **Dr. Esteban Cordero** (pr2).
- Alcance: todos los módulos de la spec MVP (ver §5).
- El archivo `dashboard-admin.html` (mockup legado verde/emojis) fue **eliminado definitivamente**.
- **Base de datos**: Postgres local con pgAdmin 4 (el cliente lo tiene instalado). Supabase descartado.
- **Backend**: Express + Prisma + JWT (no Fastify, no Hono). Storage de fotos en filesystem.

---

## 2. Arquitectura de archivos (stack nuevo)

```
apps/
  api/                          ← Express 4 + Prisma 5 + JWT
    .env                        ← DATABASE_URL, JWT_SECRET, CORS_ORIGIN, PORT, UPLOAD_DIR
    prisma/
      schema.prisma             ← modelos + enums + relaciones
      migrations/
        20260617150727_init/    ← migración inicial (tablas + enums + FKs + índices)
      seed.ts                   ← usuarios bcrypt + demo (idempotente, espeja seed legacy)
    src/
      server.ts                 ← Express app, CORS, errorHandler, routers
      env.ts                    ← validación zod del .env (dotenv/config)
      db.ts                     ← PrismaClient singleton
      lib/
        jwt.ts                  ← signToken / verifyToken (HS256)
        permissions.ts          ← PERM matrix mirror del front
        errors.ts               ← HttpError + errorHandler express (maneja ZodError)
        audit.ts                ← audit(req, action, cat, label) → tabla audit_logs
      middleware/
        auth.ts                 ← requireAuth (Bearer), requireRole, requireModule(mod, mode)
      routes/
        auth.ts                 ← /login (bcrypt+JWT), /me, /logout
        patients.ts             ← CRUD + counts + sub-recursos (evolucion, recetas, photos, …)
        photos.ts               ← multer memory + GET binario protegido por JWT
        catalog.ts              ← /kpis, /search/patients, /professionals, /services
    uploads/                    ← gitignored
      patient-photos/           ← binario de fotos clínicas

  dashboard/                    ← Vite 5 + React 18 + TypeScript 5
    .env.local                  ← VITE_API_URL=http://127.0.0.1:4000
    src/
      main.tsx
      App.tsx                   ← shell (QueryClient + Router + Auth + Login gate)
      lib/
        api.ts                  ← fetch wrapper + Bearer JWT (localStorage "derma_token")
        types.ts                ← tipos compartidos con la API (snake_case Patient, camelCase resto)
        auth.tsx                ← AuthProvider (signIn/signOut/me) + useAuth()
        permissions.ts          ← ROLES, PERM, roleCan, ModuleId
        helpers.ts              ← fmtDate/fmtTime/fmtMoney, age, calcInvoiceTotals, sriAccessKey
      components/               ← Sidebar, Header, Modal, Primitives, icons
      features/
        auth/LoginScreen.tsx
        dashboard/DashboardView.tsx
        patients/               ← PatientsList, PatientDetail, NewPatientModal
          api.ts                ← listPatients/getPatient/getPatientCounts/createPatient
          tabs/                 ← 8 tabs (Antecedentes/Evolucion/Recetas/Fotos/Consents/Procs/Paquetes/Facturas)
        _stubs/StubView.tsx     ← placeholder de módulos pendientes
      styles/theme.css          ← LUNO teal (~800 líneas, portado del prototipo)

derma/                          ← prototipo HTML legacy (referencia funcional, NO refactorizar)
  theme.css                     ← tokens y clases originales (M3/M4 incluidos)
  data.jsx, ui.jsx              ← store + UI legacy
  views-*.jsx                   ← admin, dashboard, patients, ops, billing, packages, payments
  app.jsx                       ← router hash + login fake + shell
  logo.jpg                      ← logo teal del centro
  icons.jsx

DERMA-OS Demo.html              ← entrypoint del prototipo legacy
uploads/                        ← documentos de referencia (spec, prompt maestro, research)
```

---

## 3. Convenciones técnicas CRÍTICAS (respetar siempre)

### Stack nuevo (producción)

| Regla | Detalle |
|---|---|
| **Path alias** | `@/...` mapea a `apps/dashboard/src/...` (Vite + tsconfig). En la API también: `@/...` → `apps/api/src/...` |
| **Tipos DB** | Prisma genera el client al hacer `pnpm db:generate`. El dashboard usa `apps/dashboard/src/lib/types.ts` (manual) que espeja la serialización de las rutas REST |
| **Permisos** | UI gating con `roleCan(role, mod)`; el backend repite con middleware `requireModule(mod, mode)` (defensa en profundidad) |
| **Auditoría** | Se escribe en la API con `await audit(req, action, cat, label)`. Nunca desde el cliente |
| **Storage de fotos** | Binario en `apps/api/uploads/patient-photos/<random>.<ext>`. Cliente lo solicita vía `GET /photos/:id/file` con Bearer JWT y crea blob URL (`URL.createObjectURL`) |
| **Fechas** | `DateTime` (timestamptz) en Postgres, `date-fns` en UI |
| **Money** | `Decimal(10,2)` en Prisma (`numeric(10,2)` en Postgres); en JSON viaja como string, convertir con `Number()` |
| **Migraciones** | `pnpm db:migrate` ejecuta `prisma migrate dev`. Cada cambio en `schema.prisma` requiere nueva migración con nombre descriptivo |
| **Patient serialization** | El endpoint `/patients/*` convierte el modelo Prisma (camelCase) a snake_case para compatibilidad con el seed legacy y el contrato API |

### Prototipo legacy (`derma/` — solo referencia, NO editar para producción)

| Regla | Detalle |
|---|---|
| Exports a `window` | Cada `.jsx` hace `Object.assign(window, {...})` al final. Scripts Babel NO comparten scope |
| `SEED_VERSION` | Actualmente `8`. Subir cuando cambia la forma del seed |
| Store | `getState()`, `useStore()` hook, `set(patch)`, `SEL` selectores, `A` acciones, `H` utilidades |
| localStorage | Clave `"dermaos_demo_v1"` |
| Router | Hash-based (`H.nav('/ruta')`) |
| Estilos | Todo el CSS en `theme.css` |
| Auditoría | `A.audit(action, cat, label)` en `useEffect`, nunca en render |
| React | React 18.3.1 + Babel 7.29.0 pinneados con integrity hashes en `DERMA-OS Demo.html` |

---

## 4. Módulos implementados

### Stack nuevo (`apps/api` + `apps/dashboard`)

| Módulo | API (Express+Prisma) | UI Dashboard |
|---|---|---|
| **Auth** | ✅ `/auth/login` (bcrypt), `/auth/me`, `/auth/logout`, JWT 12h, audit en sesión | ✅ LoginScreen + AuthProvider + Bearer en `localStorage` |
| **Permisos** | ✅ `requireAuth` + `requireRole` + `requireModule(mod, mode)` middleware | ✅ `roleCan` + Sidebar/Tabs gating + `<NoAccess>` |
| **KPIs** | ✅ `/kpis` (citas hoy, ingresos mes, pacientes, alertas) | ✅ `DashboardView` |
| **Pacientes** | ✅ CRUD + `/patients/:id/counts` + sub-recursos | ✅ Lista live + ficha 7 pestañas + `NewPatientModal` |
| **Historia (M2)** | ✅ `POST /patients/:id/evolucion` / `recetas` | ✅ NewEvolucionModal + NewRecetaModal |
| **Fotos** | ✅ `POST /photos` multer + `GET /photos/:id/file` JWT-protegido + audit | ✅ Lectura via blob URL + UploadPhotoModal + slider antes/después, lightbox, gating Recepción a miniaturas |
| **Consentimientos (M4)** | ✅ `POST /patients/:id/consents`, `POST /consents/:id/sign` | ✅ NewConsentModal + SignConsentModal (firma canvas) |
| **Procedimientos** | ✅ `POST /patients/:id/procedures` | ✅ NewProcedureModal |
| **Servicios (M-Cat)** | ✅ `/services` CRUD | ✅ `ServicesView` |
| **Paquetes (M5)** | ✅ catálogo + balances + abonos + redenciones | ✅ `PackagesView` + SellPackageModal + AbonoModal + tab Paquetes |
| **Facturas (M7 parcial)** | ✅ `POST /patients/:id/invoices` | ✅ NewInvoiceModal (lista en tab) |
| **Inventario (M8)** | ✅ `/inventory` | ✅ `InventoryView` |
| **Agenda** | ✅ `/appointments` GET/POST/PATCH/DELETE + `/coverage` + consumo paquete al `atendida` | ✅ `AgendaView` semanal lun-sáb 08-18 + NewCitaModal + CitaDetalleModal |
| **Cobros Payphone (M6)** | ✅ `/payments` GET/POST/PATCH (`/sent`,`/paid`,`/void`) + conciliación con M5 al pagar | ✅ `PaymentsView` + `GenerarCobroModal` + `CobroDetalleModal` (link copiable, txid, WhatsApp/email simulados) |
| **Facturación SRI global (M7)** | ✅ `/invoices` GET lista + GET detalle + PATCH `/advance` (generada→firmada→autorizada) | ✅ `BillingView` + `RideModal` imprimible (clave 49 dígitos, totales, líneas, emisor) |
| **Admin (M1 panel)** | ✅ `/admin/users` GET/PATCH (role/active/mfa) + `/admin/audit-logs?cat=` | ✅ `AdminView`: tabla usuarios + matriz 13 módulos × 5 roles + bitácora filtrable |
| **Búsqueda global** | ✅ `/search/patients` | ✅ Header autocomplete |
| **Catálogo** | ✅ `/professionals`, `/services`, `/consent-templates` | (consumido al cargar tabs y modales) |

### Prototipo legacy (`derma/` — congelado, todos los módulos completos)

#### Login y sesión (M1)
- **`LoginScreen`**: selector de 6 usuarios/5 roles. Cuentas MFA (Admin, Dra. Andrade) piden código de 6 dígitos (cualquiera vale en demo). Cuenta inactiva (Andrés Salas/Contador) bloqueada.
- **`UserMenu`** en el header: avatar del usuario activo, cambio de rol en caliente (demo), enlace a `/admin`, cerrar sesión.
- **Gating real por rol**: sidebar filtra secciones; header filtra acciones rápidas; pestañas de ficha clínica se ocultan o muestran `<NoAccess>` según rol.
- **`#/admin`** (solo Admin): tabla usuarios + toggle MFA/activación, matriz 11 módulos × 5 roles, bitácora filtrable por categoría.
- **Auditoría automática**: logins, aperturas de historia/fotos, firmas, facturas, intentos denegados → `A.audit()`.

#### Dashboard (`#/`)
- 4 KPIs: citas hoy, ingresos del mes, pacientes activos, alertas.
- Panel "Agenda de hoy" clickeable, "Requiere atención", "Próximas citas".

#### Agenda (`#/agenda`)
- Vista semanal lun–sáb 08:00–18:00, color por profesional + estado.
- Filtro por profesional. Navegación de semanas. Clic en celda → modal Nueva Cita.
- Flujo: agendada → confirmada → en sala → atendida (+ no asistió / cancelada).

#### Pacientes (`#/patients`)
- Listado con búsqueda nombre/cédula. Búsqueda global en header.
- **Ficha 7 pestañas** (`/patients/:id/:tab`): antecedentes, evolución (SOAP + CIE-10), recetas (imprimibles con membrete), fotos (placeholders + restricción Recepción), consentimientos (firma tipográfica), procedimientos, facturas.
- Pestañas visibles según rol; intento de acceso denegado queda auditado.

#### Servicios + Procedimientos + Inventario (`#/services`, `#/procedures`, `#/inventory`)
- Catálogo servicios con IVA 0%/15%. Procedimientos con bloqueo duro sin consentimiento firmado. Inventario con alertas stock/vencimiento.

#### Paquetes / bonos / abonos (`#/packages` — M5)
- **Catálogo de paquetes**: servicio base, nº sesiones, precio, por-sesión, vigencia + intervalo, toggle activo (crear: solo Admin).
- **Venta a paciente** (`VenderPaqueteModal`): copia precio/sesiones al vender, abono inicial opcional, vendedor, calcula vencimiento. Gating: Admin + Recepción.
- **Saldo de sesiones + abonos**: `BalanceCard` con puntos de sesión, saldo económico (precio − abonado), historial de pagos. Botones Registrar abono / Registrar sesión según rol.
- **Descuento automático**: al marcar una cita como `atendida`, si hay un bono activo que cubre ese servicio, baja 1 sesión (`A._consumeForAppointment` → `consumeSession`). `CitaDetalleModal` muestra banner de cobertura antes y de consumo después. Auditado en categoría `paquetes`.
- **Tab "Paquetes"** en la ficha del paciente. KPIs del módulo: bonos activos, sesiones por consumir, saldo por cobrar.

#### Cobros / Payphone (`#/payments` — M6)
- **Entidad `payments`**: cada cobro es un link de pago Payphone con `concept {type, refId, label}`, `amount`, `method` (payphone), `status` (pendiente/pagado/anulado), `payphoneLink`, `txId`, `sentVia`, timestamps.
- **`PaymentsView`**: KPIs (cobrado este mes, pendiente de cobro, conciliados X/Y) + tabla de cobros. Botón «Generar cobro» (gating: Admin + Recepción).
- **`GenerarCobroModal`**: paciente + tipo de cobro (libre / depósito de reserva / paquete con saldo / factura). Autocompleta monto y etiqueta desde el bono o la factura; genera link `ppls.me/xxxxx` + `txId` simulados.
- **`CobroDetalleModal`**: muestra monto, link copiable, `txId`, estado. Si está pendiente: previsualización WhatsApp + envío por WhatsApp/correo (simulado) + «Marcar como pagado» (conciliar) + «Anular».
- **Conciliación con M5**: al marcar pagado un cobro de tipo `paquete`, `A.markPaymentPaid` registra automáticamente el abono en el `packageBalance` (`A.addAbono`). Cumple el criterio de aceptación de la spec.
- **Integración en M5**: `BalanceCard` tiene botón «Cobrar (Payphone)» que abre el modal precargado con el bono.
- **Permisos `pagos`**: Admin=Total, Recepción=Cobrar, Contador=Ver/conciliar, Profesional/Esteticista=sin acceso. Auditoría en categoría `pagos`.

#### Fotos clínicas (M3) — solo legacy
- Subida real (FileReader→base64), comparador antes/después con slider, lightbox, agrupación por caso, restricción Recepción a miniaturas. En el stack nuevo la lectura ya está conectada (filesystem + JWT); falta portar la subida.

#### Consentimientos (M4) — solo legacy
- Firma canvas manuscrita, clínico vs. cesión de imagen (uso clínico + uso comercial/redes). En el stack nuevo la lectura ya está conectada; falta portar firma+subida.

#### Facturación SRI (`#/billing` — M7) — solo legacy
- Clave de acceso 49 dígitos con dígito verificador módulo 11 (algoritmo real). RIDE imprimible. Flujo: generada → firmada → autorizada (simulado).

#### WhatsApp recordatorio — solo legacy
- Al agendar, paso de confirmación con mensaje personalizado editable → envío simulado.

---

## 5. Plan de trabajo — ORDEN DE PRIORIDAD

> **Regla acordada: terminar el DASHBOARD completo primero. Sitio web comercial AL FINAL** (requiere diseño previo; se recreará después con diseño nuevo).

### Estado actual (stack nuevo)

| Capa | Estado |
|---|---|
| Monorepo pnpm (root + 2 apps) | ✅ |
| Schema Prisma 18 modelos + enums | ✅ |
| Migración inicial aplicada en Postgres local | ✅ `20260617150727_init` |
| Seed bcrypt + demo data | ✅ |
| API Express con auth/patients/photos/catalog | ✅ |
| Dashboard React lee API end-to-end | ✅ Pacientes (7 tabs lectura) |
| `pnpm dev` corre API+dashboard en paralelo | ✅ (api :4000, dash :5173) |

### Estado de los 9 módulos MVP

| Módulo | Legacy (`derma/`) | Stack nuevo (`apps/`) | Próximo paso |
|---|---|---|---|
| M1 Roles / permisos / auditoría | ✅ | ✅ Login + gating + AdminView (usuarios, matriz, bitácora) | — |
| M2 Historia clínica dermatológica | ✅ | ✅ Lectura + escritura (evolución/receta) | Edición y borrado |
| M3 Fotos clínicas antes/después | ✅ | ✅ Lectura + subida (UploadPhotoModal) + slider/lightbox | — |
| M4 Consentimientos | ✅ | ✅ Crear + firma canvas (SignConsentModal) | — |
| M5 Paquetes / bonos / sesiones / abonos | ✅ | ✅ Catálogo + venta + abonos + consumo automático al atender | — |
| M6 Cobros Payphone | ✅ | ✅ PaymentsView + Generar + Detalle + conciliación M5 | — |
| M7 Facturación SRI | ✅ | ✅ BillingView + RideModal (49 dígitos + transiciones) | Firma `.p12` real + webservice SRI quedan pendientes |
| M8 Inventario con caducidad | ✅ | ✅ `InventoryView` (lectura + alertas) | Mutaciones (ajustar stock, alta de ítem) |
| Agenda (M-Op) | ✅ | ✅ Vista semanal + NewCitaModal + CitaDetalleModal + cobertura paquete | — |
| M9 Leads (web) | ❌ | ❌ | Va con el sitio comercial, al final |

### Orden de ejecución (stack nuevo)

1. ~~Agenda~~ ✅ (2026-06-17 tarde).
2. ~~Cobros Payphone UI~~ ✅.
3. ~~Facturación SRI UI global + RIDE imprimible~~ ✅.
4. ~~Admin UI (usuarios + matriz + bitácora)~~ ✅.
5. **Inventario: mutaciones** (ajustar stock, alta/edición de ítem).
6. **Sitio web comercial** (`apps/site`) — diseñar primero, luego implementar.

### Decisión M9 — Leads del sitio web y agendamiento público

Para la primera integración del sitio comercial con DERMA-OS no se implementará reserva automática completa desde la web. El CTA «Agendar por WhatsApp» evolucionará a un flujo intermedio: al hacer clic se abrirá un modal/formulario breve que capture nombre, teléfono/WhatsApp, servicio de interés, fecha/horario preferido, mensaje opcional y consentimiento de contacto.

El envío creará un lead o solicitud de cita en DERMA-OS mediante un futuro endpoint público `POST /public/leads`. Recepción revisará la solicitud desde el dashboard, confirmará por WhatsApp y convertirá el lead en paciente/cita cuando corresponda.

Este diseño deja preparado el camino para n8n + asistente IA por WhatsApp: el bot capturará los mismos datos y alimentará el mismo endpoint, evitando duplicar lógica entre sitio web y WhatsApp. La reserva automática con disponibilidad real queda para una fase posterior, cuando existan reglas de agenda, validación de disponibilidad, prevención de spam y confirmación/pago de reserva.

> **MVP del dashboard completo end-to-end al 2026-06-17.** Quedan tareas menores: mutaciones de inventario, edición/borrado de evolución/recetas, MFA real (TOTP), firma `.p12` SRI con webservice.

---

## 6. Limitaciones conocidas

- **Firma electrónica**: simulada (PNG canvas). Falta firma .p12 avalada para validez legal plena.
- **SRI**: clave de acceso real (módulo 11), pero firma/autorización simuladas (sin XML real ni webservice del SRI).
- **MFA**: el campo `mfaEnabled` existe en `users` pero el endpoint `/auth/login` no exige el código TOTP todavía.
- **Edición/borrado**: la mayoría de entidades solo se crean/avanzan de estado; no hay edición completa.
- **Reportería**: solo KPIs, sin exportación contable.
- **Responsive**: desktop 1440px+ únicamente.
- **Storage**: filesystem local. Para producción real considerar volumen persistente o S3-compatible (MinIO).
- **Auditoría**: cubre login/logout, creación de paciente, lectura/subida/borrado de foto. Falta extender a mutaciones de historia, recetas, paquetes, cobros, facturas.

---

## 7. Datos de seed actuales

- **6 usuarios** (password común `derma123`): u1 Admin (Christopher), u2 Recepción (Gabriela), u3 Profesional (Dra. Andrade), u4 Profesional (Dr. Cordero), u5 Esteticista (Mishell), u6 Contador (Andrés, inactivo).
- **6 pacientes**: p1 María José Pérez Vallejo, p2 Carlos Andrés Mora Sánchez, p3 Lucía Fernanda Ríos Cabrera, p4 Jorge Luis Tapia Andrade, p5 Ana Cristina Velasco Puente, p6 Daniela Salomé Cueva León.
- **2 profesionales**: pr1 Dra. Verónica Andrade, pr2 Dr. Esteban Cordero.
- **4 paquetes** (pk1–pk4) + **3 bonos vendidos** (pb1 Botox Lucía 1/3, pb2 Láser Daniela 0/4, pb3 Acné María José 3/8).
- **5 cobros Payphone** (pay1–pay5): pagado (depósito láser Daniela), pendiente ligado a paquete pb3 (María José), pagado (factura Ana), pendiente sin enviar (Carlos), anulado (Jorge).
- **6 fotos clínicas** (ph1–ph6): pares basal/control para melasma (Lucía), botox (Lucía) y acné (María José). El binario real lo provee el seed escribiendo en `apps/api/uploads/patient-photos/`.
- **5 plantillas de consentimiento** (ct1–ct3 clínicos + ci1–ci2 imagen) y **4 consentimientos** (2 firmados, 2 pendientes).

> Para reiniciar todo: `pnpm db:reset` (drop+migrate+seed).

---

## 8. Archivos de referencia para nuevas sesiones

| Archivo | Para qué usarlo |
|---|---|
| `README.md` | Setup completo (Postgres + Prisma + pnpm) |
| `CLAUDE.md` | Contexto técnico denso para asistentes IA |
| `apps/api/prisma/schema.prisma` | Modelo de datos fuente de verdad |
| `uploads/MVP_DERMA-OS_ESPECIFICACION.md` | Spec detallada de cada módulo (casos de uso, campos, reglas de negocio) |
| `uploads/DERMA-OS_Prompt_Maestro_Produccion.md` | Visión de producto completa (roadmap, arquitectura futura) |
| `uploads/estilo-menus-sidebar-luno.md` | Guía visual del sidebar/menú estilo LUNO |
| `uploads/prompt-diseno-dashboard-luno.md` | Guía de diseño del dashboard LUNO |
| `uploads/investigacion-necesidades-dermatologia-ecuador.md` | Research de mercado Ecuador |
| Design System | ID `201c3697-f8b3-40f7-8e35-a34e3fc5ec4d` — actualmente vacío |

---

_Última actualización: **sesión del 17 Jun 2026 (noche)** — MVP del dashboard cerrado end-to-end. Se sumaron en esta sesión: **Agenda** (`/appointments` + cobertura paquete + AgendaView semanal + NewCita/CitaDetalle), **Cobros Payphone (M6)** (`/payments` GET/POST/PATCH `/sent|/paid|/void` con conciliación automática a `PackagePayment` al pagar; PaymentsView + GenerarCobroModal + CobroDetalleModal con preview WhatsApp), **Facturación SRI global (M7)** (`/invoices` GET lista/detalle + PATCH `/advance` con flujo `borrador→generada→firmada→autorizada`; BillingView + RideModal imprimible con clave 49 dígitos módulo 11), **Admin (M1 panel)** (`/admin/users` GET/PATCH y `/admin/audit-logs?cat=`; AdminView con tabla usuarios + matriz 13 módulos × 5 roles + bitácora filtrable). Todas las rutas en `App.tsx` resueltas (ninguna Stub crítica). TS limpio en ambos workspaces. Próximo: mutaciones de inventario y arranque del sitio comercial._
