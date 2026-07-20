import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

type Mode = "choose" | "manual" | "import";

export function TemplateQuickCreateModal({ role, onClose, onCreated }: { role: Role; onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [kind, setKind] = useState<"clinico" | "imagen">("clinico");
  const [title, setTitle] = useState("");
  const [procedureType, setProcedureType] = useState("General");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      if (mode === "manual") {
        await api.post("/consents/templates/drafts", { kind, title, procedureType, body });
      } else {
        if (!file) throw new Error("Seleccione un archivo PDF o DOCX");
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        form.append("title", title);
        form.append("procedureType", procedureType);
        await api.post("/consents/templates/import", form);
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el borrador");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "choose") {
    return (
      <Modal title="Crear plantilla para consentimiento" onClose={onClose} foot={<Btn onClick={onClose}>Cancelar</Btn>}>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
          Cree una plantilla desde cero o use un documento existente. La plantilla quedará como borrador y deberá ser aprobada por un administrador antes de poder firmarse con pacientes.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 18 }}>
          <button className="card card-pad" type="button" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode("manual")}>
            <strong>Crear desde cero</strong>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>Redacte o pegue el contenido legal editable.</p>
          </button>
          <button className="card card-pad" type="button" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode("import")}>
            <strong>Importar PDF o Word</strong>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>Extrae el texto y conserva el archivo original como referencia.</p>
          </button>
        </div>
        {role === "profesional" ? <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Como profesional puede proponer borradores; la aprobación corresponde al administrador de la clínica.</p> : null}
      </Modal>
    );
  }

  const isManual = mode === "manual";
  const canSave = isManual
    ? title.trim().length >= 3 && procedureType.trim().length >= 2 && body.trim().length >= 20
    : !!file && procedureType.trim().length >= 2;
  return (
    <Modal
      wide
      title={isManual ? "Nueva plantilla de consentimiento" : "Importar documento como plantilla"}
      onClose={onClose}
      foot={<><Btn onClick={() => setMode("choose")}>Atrás</Btn><Btn kind="primary" icon="check" disabled={!canSave || saving} onClick={save}>{saving ? "Guardando…" : isManual ? "Guardar borrador" : "Importar y extraer"}</Btn></>}
    >
      {!isManual ? <Field label="Documento original PDF o DOCX"><input type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field> : null}
      <div className="frow">
        <Field label="Tipo"><select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="clinico">Consentimiento clínico</option><option value="imagen">Uso de imagen</option></select></Field>
        <Field label="Procedimiento o categoría"><input value={procedureType} onChange={(e) => setProcedureType(e.target.value)} placeholder="Ej. Toxina botulínica" /></Field>
      </div>
      <Field label={isManual ? "Título" : "Título (opcional)"}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Consentimiento informado para…" /></Field>
      {isManual ? <Field label="Contenido legal editable"><textarea className="legal-editor" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escriba el contenido completo que leerá y firmará el paciente." /></Field> : <p className="muted" style={{ fontSize: 12.5 }}>El original se conserva intacto; su texto se extrae a un borrador editable para revisión.</p>}
      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}
