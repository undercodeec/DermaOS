import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { fullName } from "@/lib/helpers";
import { createEvolucion, listProfessionals, updateEvolucion } from "../api";
import type { ClinicalRecord, Patient } from "@/lib/types";

const CIE10 = [
  { code: "L70.0", label: "Acne vulgar" },
  { code: "L71.0", label: "Rosacea perioral" },
  { code: "L81.0", label: "Hiperpigmentacion postinflamatoria" },
  { code: "L81.1", label: "Cloasma / melasma" },
  { code: "L20.9", label: "Dermatitis atopica" },
  { code: "L57.0", label: "Queratosis actinica" },
  { code: "L40.0", label: "Psoriasis vulgar" },
  { code: "B07", label: "Verrugas viricas" },
  { code: "L30.9", label: "Dermatitis, no especificada" },
  { code: "L65.9", label: "Perdida de cabello no cicatricial" },
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
    metrics: edit?.prescription?.clinicalMetrics ?? {
      severity: 5,
      pain: 0,
      pruritus: 0,
      inflammation: 0,
      satisfaction: 5,
    },
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
        clinicalMetrics: f.metrics,
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
      title={`${edit ? "Editar" : "Nueva"} evolucion · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando..." : edit ? "Guardar cambios" : "Guardar evolucion"}
          </Btn>
        </>
      }
    >
      <Field label="Profesional">
        <select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })} style={{ maxWidth: 280 }}>
          {profs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="S · Subjetivo">
        <textarea rows={2} value={f.subjective} onChange={(e) => setF({ ...f, subjective: e.target.value })} />
      </Field>
      <Field label="O · Objetivo">
        <textarea rows={2} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} />
      </Field>
      <Field label="A · Analisis / diagnostico">
        <textarea rows={2} value={f.assessment} onChange={(e) => setF({ ...f, assessment: e.target.value })} />
      </Field>
      <Field label="Codigos CIE-10">
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
      <Field label="Metricas clinicas 0-10">
        <div className="clinical-metrics-grid">
          <MetricSlider label="Severidad" value={f.metrics.severity} onChange={(severity) => setF({ ...f, metrics: { ...f.metrics, severity } })} />
          <MetricSlider label="Dolor" value={f.metrics.pain} onChange={(pain) => setF({ ...f, metrics: { ...f.metrics, pain } })} />
          <MetricSlider label="Prurito" value={f.metrics.pruritus} onChange={(pruritus) => setF({ ...f, metrics: { ...f.metrics, pruritus } })} />
          <MetricSlider label="Inflamacion" value={f.metrics.inflammation} onChange={(inflammation) => setF({ ...f, metrics: { ...f.metrics, inflammation } })} />
          <MetricSlider label="Satisfaccion" value={f.metrics.satisfaction} onChange={(satisfaction) => setF({ ...f, metrics: { ...f.metrics, satisfaction } })} />
        </div>
      </Field>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Para prescribir, usa Receta. La evolucion guarda las metricas clinicas para graficas del paciente.
      </p>
      {m.isError ? <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p> : null}
    </Modal>
  );
}

function MetricSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="metric-slider">
      <span>{label}</span>
      <input type="range" min={0} max={10} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <b>{value}</b>
    </label>
  );
}
