import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, Field } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import {
  approveConsentTemplate,
  archiveConsentTemplate,
  createConsentTemplate,
  deleteConsentTemplate,
  downloadConsentTemplateSource,
  getClinicBranding,
  importConsentTemplate,
  listAdminConsentTemplates,
  newConsentTemplateVersion,
  removeClinicLogo,
  updateConsentTemplate,
  uploadClinicLogo,
} from "./api";
import type { AdminConsentTemplate, ConsentTemplateInput } from "./api";

const EMPTY_TEMPLATE: ConsentTemplateInput = {
  kind: "clinico",
  title: "",
  procedureType: "General",
  body: "",
  allowedRoles: ["admin", "profesional"],
};

export function ConsentTemplatesSettings() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminConsentTemplate | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["admin-consent-templates"],
    queryFn: listAdminConsentTemplates,
  });

  const action = useMutation({
    mutationFn: async ({ type, template }: { type: "approve" | "version" | "archive" | "delete"; template: AdminConsentTemplate }) => {
      if (type === "approve") return approveConsentTemplate(template.id);
      if (type === "version") return newConsentTemplateVersion(template.id);
      if (type === "archive") return archiveConsentTemplate(template.id);
      return deleteConsentTemplate(template.id);
    },
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-consent-templates"] });
      qc.invalidateQueries({ queryKey: ["consent-templates"] });
      if (variables.type === "version" && result) setEditing(result as AdminConsentTemplate);
    },
  });

  return (
    <>
      <ConsentGovernancePolicy />
      <ClinicBrandingSettings />
      <div className="section-head-row">
        <div>
          <p className="card-title" style={{ marginBottom: 3 }}>Plantillas de consentimiento</p>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Los borradores se editan; al aprobarlos quedan bloqueados y cualquier cambio crea una nueva versión.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn sm icon="file" onClick={() => setImporting(true)}>Importar PDF/DOCX</Btn>
          <Btn sm kind="primary" icon="plus" onClick={() => setEditing("new")}>Nueva plantilla</Btn>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 28 }}>
        {isLoading ? (
          <EmptyState icon="file">Cargando plantillas…</EmptyState>
        ) : error ? (
          <EmptyState icon="alert">No se pudieron cargar las plantillas.</EmptyState>
        ) : templates.length === 0 ? (
          <EmptyState icon="file">No hay plantillas. Cree una o importe un documento existente.</EmptyState>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>Plantilla</th><th>Tipo</th><th>Versión</th><th>Estado</th><th>Fuente</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td><strong>{template.title}</strong><div className="muted" style={{ fontSize: 12 }}>{template.procedureType}</div></td>
                    <td>{template.kind === "imagen" ? "Uso de imagen" : "Clínico"}<div className="muted" style={{ fontSize: 11.5 }}>{template.allowedRoles.map(roleLabel).join(", ")}</div></td>
                    <td>v{template.version}</td>
                    <td><TemplateStatus status={template.status} /></td>
                    <td>
                      {template.hasSource ? (
                        <button className="link-button" type="button" onClick={() => downloadConsentTemplateSource(template)}>
                          {template.sourceName}
                        </button>
                      ) : <span className="muted">Creación manual</span>}
                    </td>
                    <td>
                      <div className="table-actions">
                        {template.status === "borrador" ? (
                          <>
                            <Btn sm icon="pen" onClick={() => setEditing(template)}>Editar</Btn>
                            <Btn sm kind="primary" icon="check" onClick={() => action.mutate({ type: "approve", template })}>Aprobar</Btn>
                            <Btn sm icon="trash" onClick={() => {
                              if (window.confirm("¿Eliminar este borrador?")) action.mutate({ type: "delete", template });
                            }}>Eliminar</Btn>
                          </>
                        ) : template.status === "aprobada" ? (
                          <>
                            <Btn sm icon="file" onClick={() => action.mutate({ type: "version", template })}>Nueva versión</Btn>
                            <Btn sm onClick={() => action.mutate({ type: "archive", template })}>Archivar</Btn>
                          </>
                        ) : (
                          <Btn sm icon="file" onClick={() => action.mutate({ type: "version", template })}>Nueva versión</Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {action.isError ? <p className="form-error">{(action.error as Error).message}</p> : null}
      </div>
      {editing ? (
        <TemplateEditorModal
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {importing ? <ImportTemplateModal onClose={() => setImporting(false)} /> : null}
    </>
  );
}

function ConsentGovernancePolicy() {
  return (
    <>
      <p className="card-title" style={{ marginBottom: 12 }}>Política de documentos clínicos</p>
      <div className="card card-pad consent-governance" style={{ marginBottom: 28 }}>
        <div className="consent-governance-warning">
          <strong>Los consentimientos firmados son inmutables.</strong>
          <span>Las correcciones, adendas y revocaciones crean registros nuevos vinculados; el original nunca se sobrescribe ni elimina.</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Rol</th><th>Plantillas</th><th>Paciente</th><th>Después de firmar</th></tr></thead>
            <tbody>
              <tr><td><strong>Administrador</strong></td><td>Crear, importar, editar borrador y aprobar</td><td>Generar y facilitar firma</td><td>Descargar, registrar adenda o revocación</td></tr>
              <tr><td><strong>Profesional</strong></td><td>Sin edición</td><td>Generar, explicar y facilitar firma</td><td>Descargar, registrar adenda o revocación</td></tr>
              <tr><td><strong>Esteticista</strong></td><td>Sin edición</td><td>Generar solo plantillas habilitadas y facilitar firma</td><td>Solo consultar y descargar</td></tr>
              <tr><td><strong>Recepción</strong></td><td>Sin edición</td><td>Solo facilitar una firma ya preparada</td><td>Solo consultar y descargar</td></tr>
              <tr><td><strong>Contador</strong></td><td>Sin acceso</td><td>Sin acceso</td><td>Sin acceso</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 12.5 }}>
          Ningún rol puede modificar o eliminar un documento firmado. La firma corresponde siempre al paciente o a su representante legal identificado.
        </p>
      </div>
    </>
  );
}

function ClinicBrandingSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-clinic-branding"], queryFn: getClinicBranding });
  const upload = useMutation({
    mutationFn: uploadClinicLogo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clinic-branding"] }),
  });
  const remove = useMutation({
    mutationFn: removeClinicLogo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clinic-branding"] }),
  });
  return (
    <>
      <p className="card-title" style={{ marginBottom: 12 }}>Identidad de documentos</p>
      <div className="card card-pad branding-card" style={{ marginBottom: 28 }}>
        {isLoading ? <span className="muted">Cargando…</span> : (
          <>
            <div className="clinic-logo-preview">
              {data?.logoData ? <img src={data.logoData} alt={`Logo de ${data.name}`} /> : <span>Sin logo</span>}
            </div>
            <div style={{ flex: 1 }}>
              <strong>{data?.name}</strong>
              <p className="muted" style={{ margin: "4px 0 12px", fontSize: 12.5 }}>
                Este logo aparecerá en los consentimientos PDF. PNG o JPEG, máximo 1 MB.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="btn btn-secondary btn-sm file-btn">
                  {upload.isPending ? "Cargando…" : "Cargar logo"}
                  <input type="file" accept="image/png,image/jpeg" disabled={upload.isPending} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate(file);
                    e.currentTarget.value = "";
                  }} />
                </label>
                {data?.logoData ? <Btn sm onClick={() => remove.mutate()}>Quitar logo</Btn> : null}
              </div>
              {upload.isError ? <p className="form-error">{(upload.error as Error).message}</p> : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function TemplateEditorModal({ template, onClose }: { template: AdminConsentTemplate | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ConsentTemplateInput>(template ? {
    kind: template.kind, title: template.title, procedureType: template.procedureType, body: template.body, allowedRoles: template.allowedRoles,
  } : EMPTY_TEMPLATE);
  useEffect(() => {
    if (template) setForm({ kind: template.kind, title: template.title, procedureType: template.procedureType, body: template.body, allowedRoles: template.allowedRoles });
  }, [template]);
  const mutation = useMutation({
    mutationFn: () => template ? updateConsentTemplate(template.id, form) : createConsentTemplate(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-consent-templates"] });
      onClose();
    },
  });
  const valid = form.title.trim().length >= 3 && form.procedureType.trim().length >= 2 && form.body.trim().length >= 20;
  return (
    <Modal wide title={template ? `Editar borrador · v${template.version}` : "Nueva plantilla de consentimiento"} onClose={onClose} foot={
      <><Btn onClick={onClose}>Cancelar</Btn><Btn kind="primary" icon="check" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Guardando…" : "Guardar borrador"}</Btn></>
    }>
      <div className="frow">
        <Field label="Tipo"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "clinico" | "imagen" })}><option value="clinico">Consentimiento clínico</option><option value="imagen">Uso de imagen</option></select></Field>
        <Field label="Procedimiento o categoría"><input value={form.procedureType} onChange={(e) => setForm({ ...form, procedureType: e.target.value })} placeholder="Ej. Toxina botulínica" /></Field>
      </div>
      <Field label="Título"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Consentimiento informado para…" /></Field>
      <Field label="Roles autorizados para generar este documento">
        <div className="template-role-options">
          <label><input type="checkbox" checked disabled /> Administrador</label>
          <label><input type="checkbox" checked={form.allowedRoles.includes("profesional")} onChange={(e) => setForm({ ...form, allowedRoles: toggleRole(form.allowedRoles, "profesional", e.target.checked) })} /> Profesional</label>
          <label><input type="checkbox" checked={form.allowedRoles.includes("esteticista")} onChange={(e) => setForm({ ...form, allowedRoles: toggleRole(form.allowedRoles, "esteticista", e.target.checked) })} /> Esteticista</label>
        </div>
      </Field>
      <Field label="Contenido legal editable"><textarea className="legal-editor" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Escriba el contenido completo que leerá y firmará el paciente." /></Field>
      <p className="muted" style={{ fontSize: 12, marginTop: -7 }}>Al aprobar la plantilla, esta versión quedará bloqueada para proteger su integridad.</p>
      {mutation.isError ? <p className="form-error">{(mutation.error as Error).message}</p> : null}
    </Modal>
  );
}

function ImportTemplateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"clinico" | "imagen">("clinico");
  const [title, setTitle] = useState("");
  const [procedureType, setProcedureType] = useState("General");
  const [allowEsthetician, setAllowEsthetician] = useState(false);
  const mutation = useMutation({
    mutationFn: () => importConsentTemplate({ file: file!, kind, title, procedureType, allowedRoles: ["admin", "profesional", ...(allowEsthetician ? ["esteticista" as const] : [])] }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["admin-consent-templates"] });
      onClose();
      window.setTimeout(() => window.alert(`Texto extraído en el borrador “${created.title}”. Revíselo antes de aprobar.`), 0);
    },
  });
  return (
    <Modal title="Importar documento como borrador" onClose={onClose} foot={
      <><Btn onClick={onClose}>Cancelar</Btn><Btn kind="primary" icon="file" disabled={!file || procedureType.trim().length < 2 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Extrayendo texto…" : "Importar y extraer"}</Btn></>
    }>
      <Field label="Documento original PDF o DOCX"><input type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <div className="frow">
        <Field label="Tipo"><select value={kind} onChange={(e) => setKind(e.target.value as "clinico" | "imagen")}><option value="clinico">Consentimiento clínico</option><option value="imagen">Uso de imagen</option></select></Field>
        <Field label="Procedimiento o categoría"><input value={procedureType} onChange={(e) => setProcedureType(e.target.value)} /></Field>
      </div>
      <Field label="Título (opcional)"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Si se deja vacío, se usa el nombre del archivo" /></Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13 }}>
        <input type="checkbox" checked={allowEsthetician} onChange={(e) => setAllowEsthetician(e.target.checked)} />
        Permitir que esteticistas generen esta plantilla una vez aprobada
      </label>
      <p className="muted" style={{ fontSize: 12.5 }}>El archivo original se conservará intacto. El texto extraído se guardará como borrador editable y deberá revisarse antes de aprobarse.</p>
      {mutation.isError ? <p className="form-error">{(mutation.error as Error).message}</p> : null}
    </Modal>
  );
}

function TemplateStatus({ status }: { status: AdminConsentTemplate["status"] }) {
  const labels = { borrador: "Borrador", aprobada: "Aprobada", archivada: "Archivada" };
  const classes = { borrador: "bg-warn", aprobada: "bg-ok", archivada: "bg-neutral" };
  return <Badge cls={classes[status]}>{labels[status]}</Badge>;
}

function toggleRole(roles: ConsentTemplateInput["allowedRoles"], role: "profesional" | "esteticista", enabled: boolean) {
  const next = enabled ? [...roles, role] : roles.filter((item) => item !== role);
  return Array.from(new Set(["admin" as const, ...next]));
}

function roleLabel(role: ConsentTemplateInput["allowedRoles"][number]) {
  return role === "admin" ? "Admin" : role === "profesional" ? "Profesional" : "Esteticista";
}
