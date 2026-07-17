import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, Field, NoAccess, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { PERM, ROLES } from "@/lib/permissions";
import type { ModuleId } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { getPayphoneConfig, listAuditLogs, listUsers, patchUser, savePayphoneConfig } from "./api";
import type { AdminUser, PayphoneConfig } from "./api";

const MODULES: { id: ModuleId; label: string }[] = [
  { id: "agenda", label: "Agenda" },
  { id: "pacientes", label: "Pacientes" },
  { id: "historia", label: "Historia clínica" },
  { id: "fotos", label: "Fotos" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "procedimientos", label: "Procedimientos" },
  { id: "paquetes", label: "Paquetes" },
  { id: "pagos", label: "Cobros" },
  { id: "facturacion", label: "Facturación" },
  { id: "inventario", label: "Inventario" },
  { id: "servicios", label: "Servicios" },
  { id: "reportes", label: "Reportes" },
  { id: "sistema", label: "Sistema" },
];

const AUDIT_CATS = [
  { id: "", label: "Todas" },
  { id: "sesion", label: "Sesión" },
  { id: "historia", label: "Historia" },
  { id: "fotos", label: "Fotos" },
  { id: "consentimiento", label: "Consentimientos" },
  { id: "facturacion", label: "Facturación" },
  { id: "paquetes", label: "Paquetes" },
  { id: "pagos", label: "Pagos" },
  { id: "agenda", label: "Agenda" },
  { id: "sistema", label: "Sistema" },
];

export function AdminView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  if (role !== "admin") {
    return <NoAccess>Solo el rol Admin tiene acceso al panel de sistema.</NoAccess>;
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const qc = useQueryClient();
  const [auditCat, setAuditCat] = useState("");

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-audit", auditCat],
    queryFn: () => listAuditLogs({ cat: auditCat || undefined }),
  });

  const mut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof patchUser>[1] }) =>
      patchUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="content-inner">
      <PageHead title="Sistema" sub="Usuarios y roles · matriz de permisos · bitácora de auditoría" />

      <PayphoneSettings />

      <p className="card-title" style={{ marginBottom: 12 }}>
        Usuarios
      </p>
      <div className="card" style={{ marginBottom: 28 }}>
        {loadingUsers ? (
          <EmptyState icon="user">Cargando usuarios…</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>MFA</th>
                <th>Estado</th>
                <th>Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onPatch={(input) => mut.mutate({ id: u.id, input })} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="card-title" style={{ marginBottom: 12 }}>
        Matriz de permisos
      </p>
      <div className="card" style={{ overflow: "auto", marginBottom: 28 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Módulo</th>
              {(Object.keys(ROLES) as Role[]).map((r) => (
                <th key={r}>{ROLES[r].short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.label}</strong></td>
                {(Object.keys(ROLES) as Role[]).map((r) => (
                  <td key={r} style={{ fontSize: 12.5 }}>
                    {PERM[r][m.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <p className="card-title" style={{ margin: 0 }}>
          Bitácora de auditoría
        </p>
        <select
          value={auditCat}
          onChange={(e) => setAuditCat(e.target.value)}
          style={{
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "8px 10px",
            background: "#fff",
          }}
        >
          {AUDIT_CATS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {loadingLogs ? (
          <EmptyState icon="lock">Cargando bitácora…</EmptyState>
        ) : logs.length === 0 ? (
          <EmptyState icon="lock">Sin eventos para este filtro.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Usuario</th>
                <th>Categoría</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="tnum" style={{ fontSize: 12.5 }}>
                    {fmtDate(l.at)} · {fmtTime(l.at)}
                  </td>
                  <td>
                    {l.user ? l.user.fullName : <span className="muted">—</span>}
                  </td>
                  <td>
                    <Badge cls="bg-neutral">{l.cat}</Badge>
                  </td>
                  <td>{l.action}</td>
                  <td className="muted">{l.label || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PayphoneSettings() {
  const qc = useQueryClient();
  const [ruc, setRuc] = useState("");
  const [storeId, setStoreId] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [msg, setMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payphone"],
    queryFn: getPayphoneConfig,
  });

  useEffect(() => {
    if (!data) return;
    setRuc(data.ruc ?? "");
    setStoreId(data.storeId ?? "");
    setStatus(data.status === "disabled" ? "disabled" : "active");
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      savePayphoneConfig({
        ruc: ruc.trim() || null,
        storeId: storeId.trim(),
        token: token.trim() || undefined,
        status,
      }),
    onSuccess: () => {
      setToken("");
      setMsg("Credenciales Payphone guardadas.");
      qc.invalidateQueries({ queryKey: ["admin-payphone"] });
      setTimeout(() => setMsg(""), 2600);
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const configured = (data as PayphoneConfig | undefined)?.configured;
  const canSave = storeId.trim().length > 0 && (configured || token.trim().length > 0);

  return (
    <>
      <p className="card-title" style={{ marginBottom: 12 }}>
        Payphone por clínica
      </p>
      <div className="card" style={{ marginBottom: 28 }}>
        {isLoading ? (
          <EmptyState icon="card">Cargando configuración Payphone…</EmptyState>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="RUC del comercio">
              <input value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="179..." />
            </Field>
            <Field label="Store ID">
              <input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Store ID de Payphone" />
            </Field>
            <Field label={configured ? "Nuevo token (opcional)" : "Token Payphone"}>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder={configured ? "Dejar vacío para conservar el token actual" : "Bearer token"}
              />
            </Field>
            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "disabled")}>
                <option value="active">Activo</option>
                <option value="disabled">Desactivado</option>
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
              <Badge cls={configured && status === "active" ? "bg-ok" : "bg-neutral"}>
                {configured ? `Configurado · ${data?.hasToken ? "token guardado" : "sin token"}` : "No configurado"}
              </Badge>
              {data?.updatedAt ? (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Actualizado {fmtDate(data.updatedAt)} · {fmtTime(data.updatedAt)}
                </span>
              ) : null}
              <div style={{ flex: 1 }} />
              <Btn kind="primary" icon="check" disabled={!canSave || mut.isPending} onClick={() => mut.mutate()}>
                {mut.isPending ? "Guardando…" : "Guardar Payphone"}
              </Btn>
            </div>
            {msg ? (
              <p style={{ gridColumn: "1 / -1", margin: 0, color: msg.includes("guardadas") ? "var(--ok)" : "var(--err)" }}>
                {msg}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

function UserRow({
  user,
  onPatch,
}: {
  user: AdminUser;
  onPatch: (input: { active?: boolean; mfaEnabled?: boolean; role?: Role }) => void;
}) {
  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
            {user.fullName
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)}
          </span>
          <strong>{user.fullName}</strong>
        </div>
      </td>
      <td className="muted" style={{ fontSize: 13 }}>{user.email}</td>
      <td>
        <select
          value={user.role}
          onChange={(e) => onPatch({ role: e.target.value as Role })}
          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
        >
          {(Object.keys(ROLES) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r].label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <button
          className={`badge ${user.mfaEnabled ? "bg-ok" : "bg-neutral"}`}
          style={{ cursor: "pointer", border: "none" }}
          onClick={() => onPatch({ mfaEnabled: !user.mfaEnabled })}
          title="Activar / desactivar MFA"
        >
          <Icon name="lock" size={11} /> {user.mfaEnabled ? "Activo" : "Inactivo"}
        </button>
      </td>
      <td>
        <button
          className={`badge ${user.active ? "bg-ok" : "bg-err"}`}
          style={{ cursor: "pointer", border: "none" }}
          onClick={() => onPatch({ active: !user.active })}
          title="Activar / desactivar usuario"
        >
          {user.active ? "Activo" : "Inactivo"}
        </button>
      </td>
      <td className="tnum" style={{ fontSize: 12.5 }}>
        {user.lastAccess ? `${fmtDate(user.lastAccess)} · ${fmtTime(user.lastAccess)}` : <span className="muted">Nunca</span>}
      </td>
    </tr>
  );
}
