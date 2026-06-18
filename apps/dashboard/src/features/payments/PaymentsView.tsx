import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtMoney, fullName } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import type { Payment } from "@/lib/types";
import { listPayments } from "./api";
import { PAY_CONCEPTS, PAY_STATUS, canCobrar } from "./meta";
import { GenerarCobroModal } from "./GenerarCobroModal";
import { CobroDetalleModal } from "./CobroDetalleModal";

export function PaymentsView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const [openNew, setOpenNew] = useState(false);
  const [openDetail, setOpenDetail] = useState<Payment | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => listPayments(),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const mes = now.getMonth();
    const anio = now.getFullYear();
    const cobradoMes = list
      .filter((p) => {
        if (p.status !== "pagado" || !p.paidAt) return false;
        const d = new Date(p.paidAt);
        return d.getMonth() === mes && d.getFullYear() === anio;
      })
      .reduce((t, p) => t + Number(p.amount), 0);
    const pendientes = list.filter((p) => p.status === "pendiente");
    const porCobrar = pendientes.reduce((t, p) => t + Number(p.amount), 0);
    const conciliados = list.filter((p) => p.status === "pagado").length;
    const anulados = list.filter((p) => p.status === "anulado").length;
    return { cobradoMes, pendientes, porCobrar, conciliados, anulados };
  }, [list]);

  return (
    <div className="content-inner">
      <PageHead
        title="Cobros"
        sub="Genera un link de pago Payphone, envíalo por WhatsApp o correo y concílialo cuando el paciente lo complete"
      >
        {canCobrar(role) ? (
          <Btn kind="primary" icon="link" onClick={() => setOpenNew(true)}>
            Generar cobro
          </Btn>
        ) : null}
      </PageHead>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="card" size={15} /> Cobrado este mes
          </div>
          <div className="k-value">{fmtMoney(stats.cobradoMes)}</div>
          <div className="k-foot">vía Payphone, conciliado</div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="clock" size={15} /> Pendiente de cobro
          </div>
          <div className="k-value">{fmtMoney(stats.porCobrar)}</div>
          <div className="k-foot">
            {stats.pendientes.length} link{stats.pendientes.length === 1 ? "" : "s"} activo
            {stats.pendientes.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="check" size={15} /> Conciliados
          </div>
          <div className="k-value">
            {stats.conciliados}
            <span className="muted" style={{ fontSize: 18 }}> / {list.length}</span>
          </div>
          <div className="k-foot">
            {stats.anulados} anulado{stats.anulados === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <EmptyState icon="card">Cargando cobros…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon="card">Aún no se ha generado ningún cobro.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Paciente</th>
                <th className="num">Monto</th>
                <th>Estado</th>
                <th>Generado</th>
                <th>Envío</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((pay) => {
                const c = PAY_CONCEPTS[pay.conceptType] ?? PAY_CONCEPTS.libre;
                const m = PAY_STATUS[pay.status];
                const patName = pay.patient
                  ? fullName({ first_name: pay.patient.firstName, last_name: pay.patient.lastName })
                  : "—";
                return (
                  <tr key={pay.id} className="rowlink" onClick={() => setOpenDetail(pay)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span className="pay-ico">
                          <Icon name={c.icon} size={16} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{pay.conceptLabel || c.label}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {c.label} · <span className="tnum">{pay.txId ?? "—"}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{patName}</td>
                    <td className="num tnum">
                      <strong>{fmtMoney(Number(pay.amount))}</strong>
                    </td>
                    <td>
                      <Badge cls={m.cls}>{m.label}</Badge>
                    </td>
                    <td className="tnum">{fmtDate(pay.createdAt)}</td>
                    <td>
                      {pay.sentVia ? (
                        <span
                          className="muted"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5 }}
                        >
                          <Icon name={pay.sentVia === "email" ? "file" : "chat"} size={13} />
                          {pay.sentVia === "email" ? "Email" : "WhatsApp"}
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Sin enviar
                        </span>
                      )}
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
        Flujo Payphone: <strong>Generar link</strong> → <strong>Enviar</strong> (WhatsApp/correo)
        → el paciente paga → <strong>Conciliar</strong> (estado «Pagado»). Los cobros de un
        paquete registran el abono automáticamente. Demo — la API de Payphone es simulada.
      </p>

      {openNew ? <GenerarCobroModal onClose={() => setOpenNew(false)} onCreated={(p) => setOpenDetail(p)} /> : null}
      {openDetail ? (
        <CobroDetalleModal payment={openDetail} onClose={() => setOpenDetail(null)} />
      ) : null}
    </div>
  );
}
