import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { createConsent, listConsentTemplates } from "../api";
import type { ConsentTemplate, Patient, Role } from "@/lib/types";
import { TemplateQuickCreateModal } from "./TemplateQuickCreateModal";

export function NewConsentModal({ patient, role, onClose }: { patient: Patient; role: Role; onClose: () => void }) {
  const qc = useQueryClient();
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const { data: tpls = [], isLoading, isError } = useQuery({ queryKey: ["consent-templates"], queryFn: listConsentTemplates });
  const [tid, setTid] = useState("");

  const byKind = tpls.reduce<{ clinico: ConsentTemplate[]; imagen: ConsentTemplate[] }>(
    (acc, t) => {
      acc[t.kind].push(t);
      return acc;
    },
    { clinico: [], imagen: [] },
  );
  const sel = tid ? tpls.find((t) => t.id === tid) ?? null : null;

  const m = useMutation({
    mutationFn: () => createConsent(patient.id, tid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consents", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  if (creatingTemplate) {
    return (
      <TemplateQuickCreateModal
        role={role}
        onClose={() => setCreatingTemplate(false)}
        onCreated={(templateId) => {
          qc.invalidateQueries({ queryKey: ["consent-templates"] });
          if (templateId) setTid(templateId);
          setCreatingTemplate(false);
        }}
      />
    );
  }

  return (
    <Modal
      title="Generar consentimiento"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!tid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Generando…" : "Generar"}
          </Btn>
        </>
      }
    >
      <Field label="Tipo de consentimiento">
        <select value={tid} onChange={(e) => setTid(e.target.value)}>
          <option value="">Seleccionar plantilla…</option>
          {byKind.clinico.length > 0 && (
            <optgroup label="Consentimiento clínico (procedimiento)">
              {byKind.clinico.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          )}
          {byKind.imagen.length > 0 && (
            <optgroup label="Cesión de derechos de imagen">
              {byKind.imagen.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>
      {(role === "admin" || role === "profesional") ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
          <Btn sm icon="plus" onClick={() => setCreatingTemplate(true)}>Crear o importar plantilla</Btn>
          <span className="muted" style={{ fontSize: 12.5 }}>PDF, Word o contenido nuevo</span>
        </div>
      ) : null}
      {!isLoading && !isError && tpls.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          No hay plantillas aprobadas. Cree o importe un borrador desde este flujo; un administrador deberá revisarlo y aprobarlo antes de usarlo.
        </p>
      ) : null}
      {isError ? <p style={{ color: "var(--err)", fontSize: 13 }}>No se pudieron cargar las plantillas.</p> : null}
      {sel ? (
        <>
          <div
            className={`consent-kind ${sel.kind === "imagen" ? "ck-imagen" : "ck-clinico"}`}
            style={{ marginBottom: 10 }}
          >
            <Icon name={sel.kind === "imagen" ? "camera" : "stetho"} size={12} />{" "}
            {sel.kind === "imagen" ? "Uso de imagen" : "Clínico"}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>{sel.body}</p>
        </>
      ) : null}
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
