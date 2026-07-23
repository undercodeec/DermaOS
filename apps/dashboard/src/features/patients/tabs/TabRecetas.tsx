import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Btn, EmptyState } from "@/components/Primitives";
import { fmtDate } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { ClinicalRecord } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewRecetaModal } from "../modals/NewRecetaModal";
import { PrescriptionPrintModal } from "../modals/PrescriptionPrintModal";
import { deleteReceta } from "../api";

export function TabRecetas({ patient, role }: TabProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ClinicalRecord | null>(null);
  const [printTarget, setPrintTarget] = useState<ClinicalRecord | null>(null);
  const canWrite = roleCanWrite(role, "historia");
  const canPrint = role === "admin" || role === "profesional";

  const { data: rx = [], isLoading } = useQuery({
    queryKey: ["recetas", patient.id],
    queryFn: () => api.get<ClinicalRecord[]>(`/patients/${patient.id}/recetas`),
  });

  const del = useMutation({
    mutationFn: (rid: string) => deleteReceta(patient.id, rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recetas", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
    },
  });

  const onDelete = (r: ClinicalRecord) => {
    if (window.confirm(`¿Eliminar esta receta del ${fmtDate(r.date)}?`)) del.mutate(r.id);
  };

  return (
    <div>
      {canWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="pill" onClick={() => setOpen(true)}>
            Nueva receta
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="pill">Cargando…</EmptyState>
        </div>
      ) : rx.length === 0 ? (
        <div className="card">
          <EmptyState icon="pill">Sin recetas registradas.</EmptyState>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {rx.map((r) => (
            <div key={r.id} className="rx-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <strong>Fórmula magistral</strong>
                <span className="muted tnum" style={{ fontSize: 12.5 }}>
                  {fmtDate(r.date)}
                </span>
              </div>
              {(r.prescription?.items ?? []).map((it, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  {it.ingredients.map((g, j) => (
                    <div key={j} className="rx-ing">
                      <span>{g.name}</span>
                      <b>{g.concentration}</b>
                    </div>
                  ))}
                  <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>
                    {it.vehicle} · {it.quantity}
                  </div>
                  <div className="rx-instr">{it.instructions}</div>
                </div>
              ))}
              {r.prescription?.diagnosis ? (
                <p className="muted" style={{ fontSize: 12.5 }}>
                  Diagnóstico: {r.prescription.diagnosis}
                </p>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {r.professional?.name ?? ""}
                </span>
                {canWrite || canPrint ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    {canPrint ? (
                      <Btn sm icon="file" onClick={() => setPrintTarget(r)}>
                        Imprimir
                      </Btn>
                    ) : null}
                    {canWrite ? (
                      <>
                        <Btn sm kind="ghost" icon="pen" onClick={() => setEdit(r)}>
                          Editar
                        </Btn>
                        <Btn sm kind="ghost" icon="trash" onClick={() => onDelete(r)} disabled={del.isPending}>
                          Eliminar
                        </Btn>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? <NewRecetaModal patient={patient} onClose={() => setOpen(false)} /> : null}
      {edit ? <NewRecetaModal patient={patient} edit={edit} onClose={() => setEdit(null)} /> : null}
      {printTarget ? (
        <PrescriptionPrintModal
          patient={patient}
          record={printTarget}
          onClose={() => setPrintTarget(null)}
        />
      ) : null}
    </div>
  );
}
