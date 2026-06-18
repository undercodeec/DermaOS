import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState } from "@/components/Primitives";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { ClinicalRecord } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewEvolucionModal } from "../modals/NewEvolucionModal";

export function TabEvolucion({ patient, role }: TabProps) {
  const [open, setOpen] = useState(false);
  const canWrite = roleCanWrite(role, "historia");

  const { data: evo = [], isLoading } = useQuery({
    queryKey: ["evolucion", patient.id],
    queryFn: () => api.get<ClinicalRecord[]>(`/patients/${patient.id}/evolucion`),
  });

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
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? <NewEvolucionModal patient={patient} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
