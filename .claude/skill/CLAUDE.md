# DERMA-OS — Contexto para Claude Code

## Producto
**DERMA-OS** — Sistema operativo del centro dermatológico Derma Piel y Pelo (Ecuador).
Migración en curso: prototipo HTML/Babel → monorepo pnpm con Vite + React + TS + Express + Prisma + PostgreSQL local.

## Estado del stack

| Capa | Antes (prototipo) | Ahora (producción) |
|---|---|---|
| Frontend | HTML + React/Babel CDN | Vite 5 + React 18 + TypeScript |
| Routing | Hash router casero | React Router 6 |
| Estado | Store pub/sub + localStorage | TanStack Query + API REST |
| Auth | Selector de usuario fake | JWT (bcrypt + jsonwebtoken) en localStorage |
| Datos | Seed en `data.jsx` | PostgreSQL local + Prisma migraciones + Prisma Client |
| Fotos | dataURL base64 | Filesystem en `apps/api/uploads/`, servido bajo JWT |

## Archivos principales

```
apps/api/
  prisma/
    schema.prisma        ← modelo + enums + relaciones
    seed.ts              ← usuarios bcrypt + datos demo (idempotente)
  src/
    server.ts            ← Express app + CORS + routers
    env.ts               ← validación zod de .env
    db.ts                ← PrismaClient (singleton dev)
    lib/
      jwt.ts             ← signToken / verifyToken
      permissions.ts     ← PERM matrix mirror del front (defensa en profundidad)
      errors.ts          ← HttpError + errorHandler express
      audit.ts           ← audit(req, action, cat, label) → tabla audit_logs
    middleware/auth.ts   ← requireAuth, requireRole, requireModule(mod, mode)
    routes/
      auth.ts            ← /login, /me, /logout (bcrypt + JWT)
      patients.ts        ← CRUD + counts + sub-recursos (evolucion, recetas, …)
      photos.ts          ← multer memory + GET binario JWT-protegido
      catalog.ts         ← /kpis, /search/patients, /professionals, /consent-templates
      services.ts        ← CRUD servicios
      packages.ts        ← catálogo paquetes
      balances.ts        ← venta + abonos sobre PackageBalance
      consents.ts        ← firma
      inventory.ts       ← lista insumos
      appointments.ts    ← citas + cobertura paquete + consumo al atender
      payments.ts        ← cobros Payphone (sent/paid/void) + conciliación M5
      invoices.ts        ← lista global facturas + PATCH /advance (estados SRI)
      admin.ts           ← usuarios + matriz + bitácora (requireRole admin)
  uploads/patient-photos/ ← directorio binario (no commit)
  .env                   ← DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN, …

apps/dashboard/src/
  main.tsx               ← entry
  App.tsx                ← shell (QueryClient + Router + Auth)
  lib/
    api.ts               ← cliente fetch + JWT (localStorage)
    types.ts             ← tipos compartidos con la API (snake_case Patient, camelCase resto)
    auth.tsx             ← AuthProvider + useAuth (login/me/logout)
    permissions.ts       ← ROLES, PERM, roleCan (espejo del backend)
    helpers.ts           ← formato fechas/dinero, accessKey SRI
  components/            ← Sidebar, Header, Modal, Primitives, icons
  features/
    auth/LoginScreen.tsx
    dashboard/DashboardView.tsx
    patients/            ← módulo completo (List, Detail, 7 tabs, NewPatientModal)
    _stubs/StubView.tsx  ← placeholder de módulos pendientes
  styles/theme.css       ← LUNO teal (portado del prototipo)

derma/                   ← prototipo HTML legacy (referencia funcional, NO refactorizar)
DERMA-OS Demo.html       ← entrada del legacy
```

## Reglas técnicas CRÍTICAS (stack nuevo)

| Regla | Detalle |
|---|---|
| **Path alias** | `@/…` resuelve a `apps/dashboard/src/…` (Vite + tsconfig). En la API también: `@/…` → `apps/api/src/…` |
| **Tipos DB** | Prisma genera tipos al hacer `pnpm db:generate`. El dashboard usa `apps/dashboard/src/lib/types.ts` (manual, debe coincidir con la serialización de las rutas) |
| **Defensa permisos** | UI gating con `roleCan(role, mod)`; API middleware `requireModule(mod, mode)` repite la validación |
| **Auditoría** | Se escribe en la API con `await audit(req, ...)` en cada acción crítica. Nunca desde el cliente |
| **Storage de fotos** | Binario en `apps/api/uploads/patient-photos/<random>.<ext>`. El cliente lo solicita vía `GET /photos/:id/file` con Bearer JWT y lo convierte en `URL.createObjectURL(blob)` |
| **Fechas** | `DateTime` (timestamptz) en Postgres, `date-fns` en UI |
| **Money** | `Decimal(10,2)` en Prisma (`numeric(10,2)` en Postgres); en JSON viaja como string, convertir con `Number()` |
| **Migraciones** | `pnpm db:migrate` ejecuta `prisma migrate dev`. Cada cambio en `schema.prisma` requiere una nueva migración con nombre descriptivo |
| **Triggers de negocio** | Pendientes de portar a la lógica de servicios en `apps/api/src/...` o a SQL custom mediante `prisma migrate` con `--create-only` |

## Paleta (no cambiar)
- **Primario teal:** `--brown-700: #00AC9A` (nombre histórico)
- **Tipografía:** Nunito Sans (UI) + Caveat (firmas)

## Comandos clave

```bash
pnpm install
pnpm db:migrate    # aplica migraciones contra Postgres local (pgAdmin 4)
pnpm db:seed       # crea usuarios bcrypt + demo data
pnpm dev           # api :4000 + dashboard :5173 en paralelo
pnpm db:studio     # Prisma Studio
pnpm db:reset      # reset + reseed
```

## Estado de módulos

| Módulo | DB (Prisma) | UI Dashboard |
|---|---|---|
| M1 Roles / auditoría | ✅ | 🔶 Login + gating, falta panel admin |
| M2 Historia clínica | ✅ | ✅ Lectura + escritura (evolución/receta) |
| M3 Fotos | ✅ filesystem JWT | ✅ Lectura + subida + slider antes/después |
| M4 Consentimientos | ✅ kind clínico/imagen | ✅ Crear + firma canvas |
| M5 Paquetes | ✅ | ✅ Catálogo + venta + abonos + consumo |
| M6 Cobros Payphone | ✅ | ✅ PaymentsView + Generar + Detalle (conciliación M5) |
| M7 Facturación SRI | ✅ | ✅ BillingView + RIDE imprimible (clave 49 + transiciones) |
| M8 Inventario | ✅ | ✅ Lectura + alertas (mutaciones ⏳) |
| Agenda | ✅ | ✅ Vista semanal + Nueva Cita + flujo + cobertura paquete |
| Sistema (Admin) | ✅ | ✅ AdminView (usuarios + matriz + bitácora) |

## Próximo paso

**MVP dashboard completo end-to-end al 2026-06-17.** Quedan tareas menores:

1. Inventario: mutaciones (ajuste de stock, alta/edición de ítem).
2. Edición/borrado de evolución/recetas.
3. MFA real (TOTP) en `/auth/login`.
4. Firma electrónica `.p12` + webservice SRI para facturas autorizadas reales.
5. Sitio web comercial (`apps/site`) — diseñar primero, luego implementar.

## Archivos de referencia
- `ESTADO_PROYECTO.md` — estado funcional detallado
- `README.md` — setup completo (pnpm + Postgres + Prisma)
- `derma/` + `DERMA-OS Demo.html` — prototipo legacy (referencia visual y de lógica)
- `uploads/MVP_DERMA-OS_ESPECIFICACION.md` — spec funcional de cada módulo
