import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState } from "@/components/Primitives";
import { fmtDate, fmtMoney } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { Invoice } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewInvoiceModal } from "../modals/NewInvoiceModal";

const STATUS_CLS: Record<string, string> = {
  borrador: "bg-neutral",
  generada: "bg-info",
  firmada: "bg-warn",
  autorizada: "bg-ok",
  rechazada: "bg-err",
};

export function TabFacturas({ patient, role }: TabProps) {
  const [open, setOpen] = useState(false);
  const canWrite = roleCanWrite(role, "facturacion");

  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices", patient.id],
    queryFn: () => api.get<Invoice[]>(`/patients/${patient.id}/invoices`),
  });

  return (
    <div>
      {canWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="plus" onClick={() => setOpen(true)}>
            Nueva factura
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="receipt">Cargando…</EmptyState>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState icon="receipt">Sin facturas emitidas.</EmptyState>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fecha</th>
                <th className="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id}>
                  <td className="tnum">{f.number}</td>
                  <td className="tnum">{fmtDate(f.date)}</td>
                  <td className="num">{fmtMoney(Number(f.total))}</td>
                  <td>
                    <Badge cls={STATUS_CLS[f.status] ?? "bg-neutral"}>{f.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? <NewInvoiceModal patient={patient} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
