import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Btn, EmptyState } from "@/components/Primitives";
import { fmtDate } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { Procedure } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewProcedureModal } from "../modals/NewProcedureModal";

export function TabProcs({ patient, role }: TabProps) {
  const [open, setOpen] = useState(false);
  const canWrite = roleCanWrite(role, "procedimientos");

  const { data = [], isLoading } = useQuery({
    queryKey: ["procs", patient.id],
    queryFn: () => api.get<Procedure[]>(`/patients/${patient.id}/procedures`),
  });

  return (
    <div>
      {canWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="plus" onClick={() => setOpen(true)}>
            Registrar procedimiento
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="syringe">Cargando…</EmptyState>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState icon="syringe">Sin procedimientos registrados.</EmptyState>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.map((r) => (
            <div key={r.id} className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>{r.service?.name ?? "Procedimiento"}</strong>
                <span className="muted tnum">{fmtDate(r.date)}</span>
              </div>
              <div className="muted" style={{ fontSize: 13.5 }}>
                {r.professional?.name}
              </div>
              {r.productUsed ? (
                <p style={{ margin: "6px 0", fontSize: 13.5 }}>
                  <strong>Producto:</strong> {r.productUsed}
                  {r.units ? ` · ${r.units} U` : ""}
                  {r.lotNumber ? ` · Lote ${r.lotNumber}` : ""}
                </p>
              ) : null}
              {r.notes ? (
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>{r.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {open ? <NewProcedureModal patient={patient} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
