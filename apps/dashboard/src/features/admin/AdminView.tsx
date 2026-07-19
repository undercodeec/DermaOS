import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Badge, Btn, EmptyState, Field, NoAccess, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";
import type { Professional, Role } from "@/lib/types";
import {
  createUser,
  getPayphoneConfig,
  listAdminProfessionals,
  listUsers,
  patchUser,
  savePayphoneConfig,
} from "./api";
import type { AdminUser, NewAdminUserInput, PayphoneConfig, UpdateAdminUserInput } from "./api";

export function AdminView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  if (role !== "admin") {
    return <NoAccess>Solo el rol Admin tiene acceso al panel de sistema.</NoAccess>;
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <div className="content-inner">
      <PageHead title="Sistema" sub="Usuarios y roles">
        <Btn kind="primary" icon="plus" onClick={() => setOpenCreate(true)}>
          Nuevo usuario
        </Btn>
      </PageHead>

      <PayphoneSettings />
      <UsersSection />

      {openCreate ? <CreateUserModal onClose={() => setOpenCreate(false)} /> : null}
    </div>
  );
}

function UsersSection() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  const mut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof patchUser>[1] }) =>
      patchUser(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
  });

  return (
    <>
      <p className="card-title" style={{ marginBottom: 12 }}>
        Usuarios
      </p>
      <div className="card" style={{ marginBottom: 28 }}>
        {loadingUsers ? (
          <EmptyState icon="user">Cargando usuarios…</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState icon="user">Todavia no hay usuarios creados en esta clinica.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Email login</th>
                <th>Estado</th>
                <th>Ultimo acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onEdit={() => setEditing(u)}
                  onPatch={(input) => mut.mutate({ id: u.id, input })}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing ? <EditUserModal user={editing} onClose={() => setEditing(null)} /> : null}
    </>
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
        Payphone por clinica
      </p>
      <div className="card" style={{ marginBottom: 28 }}>
        {isLoading ? (
          <EmptyState icon="card">Cargando configuracion Payphone…</EmptyState>
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
                placeholder={configured ? "Dejar vacio para conservar el token actual" : "Bearer token"}
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

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<NewAdminUserInput>({
    fullName: "",
    email: "",
    password: "",
    role: "recepcion",
    active: true,
    mfaEnabled: false,
    professionalId: null,
  });

  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ["admin-professionals"],
    queryFn: listAdminProfessionals,
  });

  const isClinicalRole = f.role === "profesional" || f.role === "esteticista";
  const valid =
    f.fullName.trim().length >= 2 &&
    f.email.trim().includes("@") &&
    f.password.length >= 8;

  const m = useMutation({
    mutationFn: () =>
      createUser({
        fullName: f.fullName.trim(),
        email: f.email.trim(),
        password: f.password,
        role: f.role,
        active: f.active ?? true,
        mfaEnabled: f.mfaEnabled ?? false,
        professionalId: isClinicalRole ? f.professionalId || null : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      qc.invalidateQueries({ queryKey: ["professionals"] });
      onClose();
    },
  });

  const roleMeta = ROLES[f.role];

  return (
    <Modal
      title="Nuevo usuario"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Creando…" : "Crear usuario"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Nombre completo">
          <input
            value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
            placeholder="Nombre y apellido"
          />
        </Field>
        <Field label="Correo electronico">
          <input
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            placeholder="usuario@clinica.com"
          />
        </Field>
      </div>
      <div className="frow">
        <Field label="Contrasena inicial">
          <input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder="Minimo 8 caracteres"
          />
        </Field>
        <Field label="Rol">
          <select
            value={f.role}
            onChange={(e) =>
              setF({
                ...f,
                role: e.target.value as Role,
                professionalId:
                  e.target.value === "profesional" || e.target.value === "esteticista"
                    ? f.professionalId
                    : null,
              })
            }
          >
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLES[r].label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="muted" style={{ marginTop: -2, marginBottom: 14, fontSize: 12.5 }}>
        {roleMeta.desc}
      </p>
      <Field label={isClinicalRole ? "Profesional asociado (opcional)" : "Profesional asociado"}>
        <select
          value={f.professionalId ?? ""}
          onChange={(e) => setF({ ...f, professionalId: e.target.value || null })}
          disabled={!isClinicalRole || loadingProfessionals}
        >
          <option value="">
            {isClinicalRole ? "Sin vinculo por ahora" : "No aplica para este rol"}
          </option>
          {professionals.map((p: Professional) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      {isClinicalRole && professionals.length === 0 && !loadingProfessionals ? (
        <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
          No hay profesionales en catalogo. Primero crea o conserva el profesional base y luego vincula el usuario.
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!f.active}
            onChange={(e) => setF({ ...f, active: e.target.checked })}
          />
          <span>Usuario activo desde hoy</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!f.mfaEnabled}
            onChange={(e) => setF({ ...f, mfaEnabled: e.target.checked })}
          />
          <span>Requerir codigo por email al iniciar sesion</span>
        </label>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13, marginTop: 14 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<UpdateAdminUserInput>({
    fullName: user.fullName,
    email: user.email,
    password: "",
    role: user.role,
    active: user.active,
    mfaEnabled: user.mfaEnabled,
    professionalId: user.professionalId,
  });

  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ["admin-professionals"],
    queryFn: listAdminProfessionals,
  });

  const role = f.role ?? user.role;
  const isClinicalRole = role === "profesional" || role === "esteticista";
  const valid =
    (f.fullName ?? "").trim().length >= 2 &&
    (f.email ?? "").trim().includes("@") &&
    (!f.password || f.password.length >= 8);

  const m = useMutation({
    mutationFn: () => {
      const input: UpdateAdminUserInput = {
        fullName: f.fullName?.trim(),
        email: f.email?.trim(),
        role,
        active: f.active,
        mfaEnabled: f.mfaEnabled,
        professionalId: isClinicalRole ? f.professionalId || null : null,
      };
      if (f.password) input.password = f.password;
      return patchUser(user.id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      qc.invalidateQueries({ queryKey: ["professionals"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Editar usuario"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando..." : "Guardar cambios"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Nombre completo">
          <input
            value={f.fullName ?? ""}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
            placeholder="Nombre y apellido"
          />
        </Field>
        <Field label="Correo electronico">
          <input
            type="email"
            value={f.email ?? ""}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            placeholder="usuario@clinica.com"
          />
        </Field>
      </div>
      <div className="frow">
        <Field label="Nueva contrasena (opcional)">
          <input
            type="password"
            value={f.password ?? ""}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder="Dejar vacio para no cambiar"
          />
        </Field>
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => {
              const nextRole = e.target.value as Role;
              setF({
                ...f,
                role: nextRole,
                professionalId:
                  nextRole === "profesional" || nextRole === "esteticista"
                    ? f.professionalId ?? null
                    : null,
              });
            }}
          >
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLES[r].label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={isClinicalRole ? "Profesional asociado (opcional)" : "Profesional asociado"}>
        <select
          value={f.professionalId ?? ""}
          onChange={(e) => setF({ ...f, professionalId: e.target.value || null })}
          disabled={!isClinicalRole || loadingProfessionals}
        >
          <option value="">
            {isClinicalRole ? "Sin vinculo por ahora" : "No aplica para este rol"}
          </option>
          {professionals.map((p: Professional) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!f.active}
            onChange={(e) => setF({ ...f, active: e.target.checked })}
          />
          <span>Usuario activo</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!f.mfaEnabled}
            onChange={(e) => setF({ ...f, mfaEnabled: e.target.checked })}
          />
          <span>Requerir codigo por email</span>
        </label>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13, marginTop: 14 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}

function UserRow({
  user,
  onEdit,
  onPatch,
}: {
  user: AdminUser;
  onEdit: () => void;
  onPatch: (input: UpdateAdminUserInput) => void;
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
          title="Activar / desactivar verificacion por email"
        >
          <Icon name="lock" size={11} /> {user.mfaEnabled ? "Requerido" : "Libre"}
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
      <td>
        <Btn sm kind="ghost" icon="pen" onClick={onEdit}>
          Editar
        </Btn>
      </td>
    </tr>
  );
}
