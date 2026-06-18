# DERMA-OS

Sistema operativo del centro dermatológico **Derma Piel y Pelo** (Ecuador).
Monorepo pnpm con dashboard React + TypeScript y backend Express + Prisma sobre **PostgreSQL local**.

> El prototipo HTML/React/Babel sin build (`DERMA-OS Demo.html`) se conserva como
> referencia funcional. La build de producción vive en `apps/dashboard` (UI) y
> `apps/api` (API REST + Prisma).

---

## Estructura

```
derma-os/
├── apps/
│   ├── api/                 ← Express 4 + Prisma 5 + JWT (Node 18+)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── routes/      ← auth, patients, photos, catalog
│   │   │   ├── middleware/  ← requireAuth, requireModule
│   │   │   ├── lib/         ← jwt, audit, errors, permissions
│   │   │   └── server.ts
│   │   └── uploads/         ← almacenamiento local de fotos (no commit)
│   └── dashboard/           ← Vite + React 18 + TypeScript (SPA)
│       ├── src/
│       │   ├── lib/         ← api client, auth, permisos, helpers, types
│       │   ├── components/  ← Sidebar, Header, Modal, Primitivas, Icons
│       │   ├── features/    ← auth, dashboard, patients, _stubs
│       │   └── styles/      ← theme.css (LUNO teal)
│       └── vite.config.ts
├── derma/                   ← prototipo HTML legacy (no editar para producción)
├── DERMA-OS Demo.html       ← entrada del prototipo legacy
└── uploads/                 ← documentos de referencia (spec, prompt maestro)
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite 5, React 18.3, TypeScript 5, React Router 6, TanStack Query 5 |
| Backend  | Express 4, Prisma 5, JWT, bcryptjs, multer, zod |
| Base de datos | PostgreSQL local (administrado con pgAdmin 4) |
| Storage  | Filesystem (`apps/api/uploads/patient-photos/`) servido bajo JWT |
| Estilos  | CSS plano (`theme.css` LUNO teal) |
| Tipos    | Prisma Client (`pnpm db:generate`) + tipos compartidos en `apps/dashboard/src/lib/types.ts` |
| Paquetes | pnpm workspaces |

---

## Setup inicial

### Requisitos

- Node ≥ 18.18
- pnpm ≥ 8 (recomendado 11)
- PostgreSQL ≥ 14 corriendo en local (instalación nativa Windows + pgAdmin 4)

### 1. Crear la base de datos

En pgAdmin 4 (o psql), crear una base vacía llamada `derma_os` con el rol `postgres`.

```sql
CREATE DATABASE derma_os;
```

### 2. Variables de entorno de la API

Editar `apps/api/.env` y reemplazar `CHANGEME` por la contraseña real de Postgres:

```
DATABASE_URL=postgresql://postgres:TU_PASSWORD@127.0.0.1:5432/derma_os?schema=public
JWT_SECRET=algo-largo-y-random
JWT_EXPIRES_IN=12h
UPLOAD_DIR=uploads
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Aplicar migraciones y seed

```bash
pnpm db:migrate   # crea tablas + enums según prisma/schema.prisma
pnpm db:seed      # crea usuarios y datos demo
```

Para resetear todo y volver a un estado limpio:

```bash
pnpm db:reset
```

### 5. Levantar API + dashboard a la vez

```bash
pnpm dev
# api      → http://127.0.0.1:4000
# dashboard → http://localhost:5173
```

(o por separado con `pnpm dev:api` / `pnpm dev:dashboard`)

### 6. Inspeccionar la base con Prisma Studio

```bash
pnpm db:studio    # http://localhost:5555
```

---

## Usuarios seed

Todos comparten contraseña **`derma123`** (modo desarrollo).

| Email | Rol | Notas |
|---|---|---|
| `admin@dermapielypelo.ec` | Admin | Acceso total |
| `recepcion@dermapielypelo.ec` | Recepción | Agenda, pacientes, cobros |
| `v.andrade@dermapielypelo.ec` | Profesional | Dra. Verónica Andrade |
| `e.cordero@dermapielypelo.ec` | Profesional | Dr. Esteban Cordero |
| `estetica@dermapielypelo.ec` | Esteticista | Mishell Pazmiño |
| `contabilidad@dermapielypelo.ec` | Contador | Andrés Salas (inactivo en seed) |

---

## Estado de los módulos

| Módulo MVP | Esquema | UI Dashboard |
|---|---|---|
| M1 Roles / permisos / auditoría | ✅ | 🔶 Login + gating, falta panel admin |
| M2 Historia clínica | ✅ | ✅ Ficha 7 pestañas (lectura real) |
| M3 Fotos antes/después | ✅ Storage filesystem + JWT | ✅ Lectura + slider |
| M4 Consentimientos | ✅ kind clínico/imagen | ✅ Lectura |
| M5 Paquetes / bonos | ✅ Triggers descuento automático | ✅ Lectura |
| M6 Cobros Payphone | ✅ | ⏳ Stub |
| M7 Facturación SRI | ✅ | ⏳ Stub |
| M8 Inventario | ✅ | ⏳ Stub |
| Agenda | ✅ | ⏳ Stub |
| Admin / Auditoría | ✅ | ⏳ Stub |

UI listada como ⏳ stub: la lógica vive en el prototipo HTML legacy y se porta módulo a módulo.

---

## Scripts del workspace

| Comando | Acción |
|---|---|
| `pnpm dev` | Arranca API (`:4000`) + dashboard (`:5173`) en paralelo |
| `pnpm dev:api` | Solo la API Express |
| `pnpm dev:dashboard` | Solo el dashboard Vite |
| `pnpm build` | Build de producción de api y dashboard |
| `pnpm typecheck` | `tsc --noEmit` en todos los workspaces |
| `pnpm db:generate` | Regenera el Prisma Client |
| `pnpm db:migrate` | Aplica migraciones pendientes (`prisma migrate dev`) |
| `pnpm db:reset` | Reset + reseed |
| `pnpm db:seed` | Re-ejecuta el seed |
| `pnpm db:studio` | Prisma Studio (UI tipo dbeaver) |

---

## Producción

> Hosting aún no decidido. El stack actual permite ejecutarse on-prem o en VPS:
>
> - Frontend: `vite build` → estático servible por cualquier CDN/nginx.
> - Backend: `pnpm --filter @derma-os/api build` → `node dist/server.js`.
> - Postgres: servidor dedicado con backups (pg_dump) y TLS.
> - Storage de fotos: directorio `apps/api/uploads/patient-photos/` montado en
>   volumen persistente; rotación de logs por aplicación.
>
> Antes del despliegue, verificar:
> 1. `JWT_SECRET` fuerte y único por entorno.
> 2. `CORS_ORIGIN` restringido al dominio real.
> 3. Backups automáticos de Postgres (pg_basebackup + WAL archiving).
> 4. HTTPS terminado en nginx/Caddy delante de la API y del SPA.

---

## Convenciones de código

| Regla | Detalle |
|---|---|
| Path alias | `@/...` mapea a `apps/dashboard/src/...` (Vite) y `apps/api/src/...` (Node) |
| Estado servidor | TanStack Query (queryKeys por entidad: `["patients", id]`, `["evolucion", patientId]`…) |
| Estado UI | `useState` local; no usamos Zustand/Redux todavía |
| Forms | `useState` simple; agregar `react-hook-form` cuando un form supere 8 campos |
| Auth | JWT en `localStorage` (`derma_token`); `useAuth()` hook expone `profile`/`signIn`/`signOut` |
| Permisos | `roleCan(role, moduleId)` en el frontend, `requireModule(mod, mode)` middleware en la API |
| Audit | Lo escribe la API en cada acción crítica (tabla `audit_logs`) |
| Tipos DB | Prisma Client (camelCase) para la API; `apps/dashboard/src/lib/types.ts` espeja la respuesta serializada |

---

## Documentación adicional

- [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) — estado funcional módulo por módulo
- [`CLAUDE.md`](./CLAUDE.md) — contexto para asistentes IA
- [`PROYECTO_SITIO_DERMATOLOGIA.md`](./PROYECTO_SITIO_DERMATOLOGIA.md) — visión del sitio comercial (al final)
- [`uploads/MVP_DERMA-OS_ESPECIFICACION.md`](./uploads/MVP_DERMA-OS_ESPECIFICACION.md) — spec funcional de cada módulo

---

## Roadmap inmediato

1. **Validar `pnpm dev`** y login + Pacientes contra Postgres local.
2. **Portar módulos** desde el prototipo (orden sugerido): Agenda → Paquetes (UI) → Cobros → Facturación → Inventario → Admin.
3. **Auditoría real**: ampliar los puntos de `audit()` en la API a cada mutación crítica.
4. **Foto upload**: completar UI de carga (multipart → `/photos` con JWT).
5. **Firma canvas**: subir PNG a un endpoint de la API y guardar la ruta en `consents.signaturePath`.
6. **Sitio comercial**: separado (`apps/site`), tras estabilizar el dashboard.
