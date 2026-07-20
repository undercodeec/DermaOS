import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { createConsent, listConsentTemplates } from "../api";
import type { ConsentTemplate, Patient } from "@/lib/types";

export function NewConsentModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const qc = useQueryClient();
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
      {!isLoading && !isError && tpls.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          No hay plantillas aprobadas. Un administrador debe crear o importar una plantilla en Sistema y aprobarla.
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
