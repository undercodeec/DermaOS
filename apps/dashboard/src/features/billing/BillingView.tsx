import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, EmptyState, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtMoney, fullName } from "@/lib/helpers";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { listInvoices } from "./api";
import { RideModal } from "./RideModal";

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "bg-neutral" },
  generada: { label: "Generada", cls: "bg-info" },
  firmada: { label: "Firmada", cls: "bg-warn" },
  autorizada: { label: "Autorizada", cls: "bg-ok" },
  rechazada: { label: "Rechazada", cls: "bg-err" },
};

export function BillingView() {
  const [openRide, setOpenRide] = useState<Invoice | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: listInvoices,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const mes = now.getMonth();
    const anio = now.getFullYear();
    const ingresosMes = list
      .filter((f) => {
        if (f.status !== "autorizada") return false;
        const d = new Date(f.date);
        return d.getMonth() === mes && d.getFullYear() === anio;
      })
      .reduce((t, f) => t + Number(f.total), 0);
    const pendientes = list.filter((f) => f.status === "generada" || f.status === "firmada");
    const autorizadas = list.filter((f) => f.status === "autorizada").length;
    return { ingresosMes, pendientes, autorizadas };
  }, [list]);

  return (
    <div className="content-inner">
      <PageHead
        title="Facturación SRI"
        sub="Emisión electrónica · clave de acceso 49 dígitos (módulo 11) · flujo Generada → Firmada → Autorizada"
      />

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="receipt" size={15} /> Ingresos del mes
          </div>
          <div className="k-value">{fmtMoney(stats.ingresosMes)}</div>
          <div className="k-foot">facturas autorizadas</div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="clock" size={15} /> En trámite
          </div>
          <div className="k-value">{stats.pendientes.length}</div>
          <div className="k-foot">generadas o firmadas</div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="check" size={15} /> Autorizadas
          </div>
          <div className="k-value">
            {stats.autorizadas}
            <span className="muted" style={{ fontSize: 18 }}> / {list.length}</span>
          </div>
          <div className="k-foot">aceptadas por el SRI</div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <EmptyState icon="receipt">Cargando facturas…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon="receipt">Aún no se ha emitido ninguna factura.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="num">Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const m = INVOICE_STATUS[f.status];
                const patName = f.patient
                  ? fullName({
                      first_name: f.patient.firstName,
                      last_name: f.patient.lastName,
                    })
                  : f.customerName ?? "Consumidor final";
                return (
                  <tr key={f.id} className="rowlink" onClick={() => setOpenRide(f)}>
                    <td>
                      <strong className="tnum">{f.number}</strong>
                    </td>
                    <td>{patName}</td>
                    <td className="tnum">{fmtDate(f.date)}</td>
                    <td className="num tnum">
                      <strong>{fmtMoney(Number(f.total))}</strong>
                    </td>
                    <td>
                      <Badge cls={m.cls}>{m.label}</Badge>
                    </td>
                    <td>
                      <Icon name="chevR" size={14} className="muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="muted mt" style={{ fontSize: 13 }}>
        Flujo SRI: <strong>Generada</strong> → <strong>Firmada</strong> → <strong>Autorizada</strong>. La
        clave de acceso usa el algoritmo módulo 11 real; firma y autorización se simulan en demo (sin
        XML real ni webservice del SRI).
      </p>

      {openRide ? <RideModal invoiceId={openRide.id} onClose={() => setOpenRide(null)} /> : null}
    </div>
  );
}
