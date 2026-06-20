import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { fullName } from "@/lib/helpers";
import { createEvolucion, listProfessionals, updateEvolucion } from "../api";
import type { ClinicalRecord, Patient } from "@/lib/types";

const CIE10 = [
  { code: "L70.0", label: "Acné vulgar" },
  { code: "L71.0", label: "Rosácea perioral" },
  { code: "L81.0", label: "Hiperpigmentación postinflamatoria" },
  { code: "L81.1", label: "Cloasma / melasma" },
  { code: "L20.9", label: "Dermatitis atópica" },
  { code: "L57.0", label: "Queratosis actínica" },
  { code: "L40.0", label: "Psoriasis vulgar" },
  { code: "B07", label: "Verrugas víricas" },
  { code: "L30.9", label: "Dermatitis, no especificada" },
  { code: "L65.9", label: "Pérdida de cabello no cicatricial" },
];

export function NewEvolucionModal({
  patient,
  onClose,
  edit,
}: {
  patient: Patient;
  onClose: () => void;
  edit?: ClinicalRecord;
}) {
  const qc = useQueryClient();
  const { data: profs = [] } = useQuery({ queryKey: ["professionals"], queryFn: listProfessionals });
  const [f, setF] = useState({
    professionalId: edit?.professionalId ?? "",
    subjective: edit?.subjective ?? "",
    objective: edit?.objective ?? "",
    assessment: edit?.assessment ?? "",
    plan: edit?.plan ?? "",
    codes: edit?.cie10Codes ?? ([] as string[]),
  });

  useEffect(() => {
    if (!f.professionalId && profs.length > 0) {
      setF((p) => ({ ...p, professionalId: profs[0].id }));
    }
  }, [profs, f.professionalId]);

  const toggleCode = (c: string) =>
    setF({ ...f, codes: f.codes.includes(c) ? f.codes.filter((x) => x !== c) : [...f.codes, c] });

  const valid = f.professionalId && f.subjective && f.objective && f.assessment && f.plan;

  const m = useMutation({
    mutationFn: () => {
      const payload = {
        professionalId: f.professionalId,
        subjective: f.subjective,
        objective: f.objective,
        assessment: f.assessment,
        plan: f.plan,
        cie10Codes: f.codes,
      };
      return edit ? updateEvolucion(patient.id, edit.id, payload) : createEvolucion(patient.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evolucion", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      wide
      title={`${edit ? "Editar" : "Nueva"} evolución · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando…" : edit ? "Guardar cambios" : "Guardar evolución"}
          </Btn>
        </>
      }
    >
      <Field label="Profesional">
        <select
          value={f.professionalId}
          onChange={(e) => setF({ ...f, professionalId: e.target.value })}
          style={{ maxWidth: 280 }}
        >
          {profs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="S · Subjetivo (lo que refiere el paciente)">
        <textarea rows={2} value={f.subjective} onChange={(e) => setF({ ...f, subjective: e.target.value })} />
      </Field>
      <Field label="O · Objetivo (hallazgos al examen físico)">
        <textarea rows={2} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} />
      </Field>
      <Field label="A · Análisis / diagnóstico">
        <textarea rows={2} value={f.assessment} onChange={(e) => setF({ ...f, assessment: e.target.value })} />
      </Field>
      <Field label="Códigos CIE-10">
        <div className="chips">
          {CIE10.map((c) => {
            const on = f.codes.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                className="badge"
                title={c.label}
                style={{
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: on ? "var(--info)" : "var(--border-strong)",
                  background: on ? "var(--info-bg)" : "#fff",
                  color: on ? "var(--info)" : "var(--ink-2)",
                }}
                onClick={() => toggleCode(c.code)}
              >
                {c.code} · {c.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="P · Plan">
        <textarea rows={2} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} />
      </Field>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Para prescribir, usa «Receta» — viven en su propia pestaña.
      </p>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
