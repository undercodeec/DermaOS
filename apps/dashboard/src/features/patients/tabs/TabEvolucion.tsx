import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState } from "@/components/Primitives";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { ClinicalRecord } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewEvolucionModal } from "../modals/NewEvolucionModal";
import { deleteEvolucion } from "../api";

export function TabEvolucion({ patient, role }: TabProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ClinicalRecord | null>(null);
  const canWrite = roleCanWrite(role, "historia");

  const { data: evo = [], isLoading } = useQuery({
    queryKey: ["evolucion", patient.id],
    queryFn: () => api.get<ClinicalRecord[]>(`/patients/${patient.id}/evolucion`),
  });

  const del = useMutation({
    mutationFn: (rid: string) => deleteEvolucion(patient.id, rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evolucion", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
    },
  });

  const onDelete = (r: ClinicalRecord) => {
    if (window.confirm(`¿Eliminar esta evolución del ${fmtDate(r.date)}? Esta acción no se puede deshacer.`)) {
      del.mutate(r.id);
    }
  };

  return (
    <div>
      {canWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="plus" onClick={() => setOpen(true)}>
            Nueva evolución
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="file">Cargando…</EmptyState>
        </div>
      ) : evo.length === 0 ? (
        <div className="card">
          <EmptyState icon="file">Sin notas de evolución todavía.</EmptyState>
        </div>
      ) : (
        <div className="timeline">
          {evo.map((r) => (
            <div key={r.id} className="tl-item">
              <div className="tl-date">
                {fmtDate(r.date)} · {fmtTime(r.date)}{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  — {r.professional?.name ?? ""}
                </span>
              </div>
              <div className="card card-pad tl-card">
                {r.subjective ? (
                  <div className="soap-row">
                    <span className="soap-k">Subjetivo</span>
                    <span>{r.subjective}</span>
                  </div>
                ) : null}
                {r.objective ? (
                  <div className="soap-row">
                    <span className="soap-k">Objetivo</span>
                    <span>{r.objective}</span>
                  </div>
                ) : null}
                {r.assessment ? (
                  <div className="soap-row">
                    <span className="soap-k">Análisis</span>
                    <span>
                      {r.assessment}{" "}
                      {(r.cie10Codes ?? []).map((c) => (
                        <Badge key={c} cls="bg-info">
                          {c}
                        </Badge>
                      ))}
                    </span>
                  </div>
                ) : null}
                {r.plan ? (
                  <div className="soap-row">
                    <span className="soap-k">Plan</span>
                    <span>{r.plan}</span>
                  </div>
                ) : null}
                {canWrite ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                    <Btn sm kind="ghost" icon="pen" onClick={() => setEdit(r)}>
                      Editar
                    </Btn>
                    <Btn sm kind="ghost" icon="trash" onClick={() => onDelete(r)} disabled={del.isPending}>
                      Eliminar
                    </Btn>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? <NewEvolucionModal patient={patient} onClose={() => setOpen(false)} /> : null}
      {edit ? <NewEvolucionModal patient={patient} edit={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
