import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/icons";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { roleCanWrite } from "@/lib/permissions";
import type { InvoiceLine, InvoiceStatus } from "@/lib/types";
import { advanceInvoice, getInvoice } from "./api";

const EMISOR = {
  razonSocial: "Derma Piel y Pelo Cía. Ltda.",
  nombreComercial: "Derma Piel y Pelo · Centro Dermatológico",
  ruc: "1792345678001",
  direccion: "Av. República de El Salvador N34-229 y Moscú, Quito",
  contribuyente: "Régimen General · Obligado a llevar contabilidad: SÍ",
};

const STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "bg-neutral" },
  generada: { label: "Generada", cls: "bg-info" },
  firmada: { label: "Firmada", cls: "bg-warn" },
  autorizada: { label: "Autorizada", cls: "bg-ok" },
  rechazada: { label: "Rechazada", cls: "bg-err" },
};

const NEXT: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  borrador: "generada",
  generada: "firmada",
  firmada: "autorizada",
};

interface Props {
  invoiceId: string;
  onClose: () => void;
}

export function RideModal({ invoiceId, onClose }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const canWrite = roleCanWrite(profile?.role ?? "admin", "facturacion");

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(invoiceId),
  });

  const advance = useMutation({
    mutationFn: () => advanceInvoice(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
    },
  });

  if (isLoading || !inv) {
    return (
      <Modal title="RIDE" onClose={onClose}>
        <p className="muted">Cargando factura…</p>
      </Modal>
    );
  }

  const lines = (inv.lines ?? []) as InvoiceLine[];
  const next = NEXT[inv.status];
  const stMeta = STATUS[inv.status];

  return (
    <Modal
      title={`RIDE · Factura ${inv.number}`}
      wide
      onClose={onClose}
      foot={
        <>
          <Btn icon="file" onClick={() => window.print()}>
            Imprimir
          </Btn>
          <div style={{ flex: 1 }} />
          {canWrite && next ? (
            <Btn
              kind="primary"
              icon="check"
              onClick={() => advance.mutate()}
              disabled={advance.isPending}
            >
              {advance.isPending ? "…" : `Marcar ${STATUS[next].label.toLowerCase()}`}
            </Btn>
          ) : null}
        </>
      }
    >
      <div className="ride">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <strong style={{ fontSize: 16 }}>{EMISOR.razonSocial}</strong>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {EMISOR.nombreComercial}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {EMISOR.direccion}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              RUC {EMISOR.ruc} · {EMISOR.contribuyente}
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 220 }}>
            <Badge cls={stMeta.cls}>{stMeta.label}</Badge>
            <div style={{ marginTop: 6, fontWeight: 800 }}>FACTURA</div>
            <div className="tnum" style={{ fontSize: 14 }}>{inv.number}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtDate(inv.date)} · {fmtTime(inv.date)}
            </div>
          </div>
        </header>

        <section style={{ marginBottom: 12 }}>
          <span className="pay-k">Cliente</span>
          <div style={{ fontWeight: 700 }}>{inv.customerName ?? "—"}</div>
          {inv.patient ? (
            <div className="muted" style={{ fontSize: 12.5 }}>CI {inv.patient.idNumber}</div>
          ) : null}
        </section>

        <section style={{ marginBottom: 12 }}>
          <span className="pay-k">Clave de acceso (49 dígitos)</span>
          <code
            className="tnum"
            style={{
              display: "block",
              wordBreak: "break-all",
              background: "var(--cream, #F6EFE3)",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {inv.accessKey}
          </code>
        </section>

        <table className="tbl" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="num">Cant.</th>
              <th className="num">P. unit.</th>
              <th className="num">IVA</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.description}</td>
                <td className="num tnum">{l.quantity}</td>
                <td className="num tnum">{fmtMoney(l.unitPrice)}</td>
                <td className="num tnum">{l.vatRate}%</td>
                <td className="num tnum">{fmtMoney(l.quantity * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            marginTop: 12,
            gap: 12,
          }}
        >
          <div className="muted" style={{ fontSize: 12.5 }}>
            <Icon name="lock" size={12} /> Documento RIDE · Demo. Firma electrónica y autorización
            del SRI simuladas.
          </div>
          <table className="tbl" style={{ fontSize: 13 }}>
            <tbody>
              <tr>
                <td className="muted">Subtotal 0%</td>
                <td className="num tnum">{fmtMoney(Number(inv.subtotal0 ?? 0))}</td>
              </tr>
              <tr>
                <td className="muted">Subtotal 15%</td>
                <td className="num tnum">{fmtMoney(Number(inv.subtotal15 ?? 0))}</td>
              </tr>
              <tr>
                <td className="muted">IVA 15%</td>
                <td className="num tnum">{fmtMoney(Number(inv.vatAmount ?? 0))}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 800 }}>TOTAL</td>
                <td className="num tnum" style={{ fontWeight: 800 }}>
                  {fmtMoney(Number(inv.total))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
