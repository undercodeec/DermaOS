import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/icons";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import type { Payment } from "@/lib/types";
import { markPaymentPaid, markPaymentSent, voidPayment } from "./api";
import { PAY_CONCEPTS, PAY_STATUS, canCobrar, canConciliar } from "./meta";

const EMISOR_COMERCIAL = "Derma Piel y Pelo";

function buildPayMsg(pay: Payment): string {
  const first = pay.patient?.firstName ?? "";
  return [
    `Hola ${first}, le saluda ${EMISOR_COMERCIAL}. 💳`,
    "",
    "Puede completar su pago de forma segura desde este enlace:",
    `• ${pay.conceptLabel || "Cobro"}`,
    `• Monto: ${fmtMoney(Number(pay.amount))}`,
    "",
    `🔗 ${pay.payphoneLink ?? ""}`,
    "",
    "Pago protegido vía Payphone. Una vez confirmado, su comprobante queda registrado automáticamente. ¡Gracias!",
  ].join("\n");
}

interface Props {
  payment: Payment;
  onClose: () => void;
}

export function CobroDetalleModal({ payment, onClose }: Props) {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [sentNote, setSentNote] = useState("");
  const [current, setCurrent] = useState(payment);

  const m = PAY_STATUS[current.status];
  const c = PAY_CONCEPTS[current.conceptType] ?? PAY_CONCEPTS.libre;
  const isPaquete = current.conceptType === "paquete";
  const hasPhone = !!current.patient?.phone;

  const refresh = (next: Payment) => {
    setCurrent(next);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["balances-all"] });
    qc.invalidateQueries({ queryKey: ["balances", current.patientId] });
    qc.invalidateQueries({ queryKey: ["kpis"] });
  };

  const sentMut = useMutation({
    mutationFn: (via: "whatsapp" | "email") => markPaymentSent(current.id, via),
    onSuccess: (next, via) => {
      refresh(next);
      setSentNote(via === "email" ? "Link enviado por correo electrónico." : "Link enviado por WhatsApp.");
      setTimeout(() => setSentNote(""), 2600);
    },
  });
  const paidMut = useMutation({
    mutationFn: () => markPaymentPaid(current.id),
    onSuccess: refresh,
  });
  const voidMut = useMutation({
    mutationFn: () => voidPayment(current.id),
    onSuccess: refresh,
  });

  function copy() {
    if (!current.payphoneLink) return;
    try {
      navigator.clipboard.writeText(current.payphoneLink);
    } catch {
      /* navegador sin permiso */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const fullName = `${current.patient?.firstName ?? ""} ${current.patient?.lastName ?? ""}`.trim();

  const foot =
    current.status === "pendiente" ? (
      <>
        {canCobrar(role) ? (
          <Btn kind="ghost" icon="trash" onClick={() => voidMut.mutate()} disabled={voidMut.isPending}>
            Anular
          </Btn>
        ) : null}
        <div style={{ flex: 1 }} />
        {canConciliar(role) ? (
          <Btn
            kind="primary"
            icon="check"
            onClick={() => paidMut.mutate()}
            disabled={paidMut.isPending}
          >
            {paidMut.isPending ? "Conciliando…" : "Marcar como pagado"}
          </Btn>
        ) : null}
      </>
    ) : (
      <Btn onClick={onClose}>Cerrar</Btn>
    );

  return (
    <Modal title={`Cobro · ${c.label}`} onClose={onClose} foot={foot}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="pay-amount">{fmtMoney(Number(current.amount))}</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{current.conceptLabel || c.label}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {fullName || "—"}{current.patient ? ` · CI ${current.patient.idNumber}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Badge cls={m.cls}>{m.label}</Badge>
          <div className="pp-tag" style={{ marginTop: 8 }}>
            <Icon name="card" size={12} /> Payphone
          </div>
        </div>
      </div>

      {current.status === "pagado" ? (
        <div className="cita-ok" style={{ marginTop: 14 }}>
          <span className="cita-ok-icon">
            <Icon name="check" size={20} />
          </span>
          <div>
            <strong>Pago conciliado</strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
              {current.paidAt ? `${fmtDate(current.paidAt)} · ${fmtTime(current.paidAt)}` : ""}
              {isPaquete ? " · abono registrado en el paquete" : ""}
            </p>
          </div>
        </div>
      ) : current.status === "anulado" ? (
        <div className="warn-box" style={{ marginTop: 14 }}>
          <Icon name="alert" size={16} />
          <div>
            <strong>Link anulado</strong>
            {current.note ? <div style={{ fontSize: 12.5, marginTop: 2 }}>{current.note}</div> : null}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <span className="pay-k">Link de pago</span>
        <div className="pay-linkbox">
          <Icon name="link" size={16} className="muted" />
          <code>{current.payphoneLink ?? "—"}</code>
          <button className="pay-copy" onClick={copy} title="Copiar link">
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="pay-detail-grid">
        <div>
          <span className="pay-k">ID transacción</span>
          <span className="tnum">{current.txId ?? "—"}</span>
        </div>
        <div>
          <span className="pay-k">Generado</span>
          {fmtDate(current.createdAt)} · {fmtTime(current.createdAt)}
        </div>
        <div>
          <span className="pay-k">Método</span>
          Payphone
        </div>
        <div>
          <span className="pay-k">Envío</span>
          {current.sentVia === "email"
            ? "Correo electrónico"
            : current.sentVia === "whatsapp"
              ? "WhatsApp"
              : "Sin enviar"}
        </div>
      </div>

      {current.status === "pendiente" ? (
        <>
          <div className="wa-meta">
            <Icon name="chat" size={15} />
            <span>Enviar recordatorio de pago a&nbsp;</span>
            <strong className="tnum">{hasPhone ? current.patient?.phone : "—"}</strong>
          </div>
          <div className="wa-preview">
            <div className="wa-bubble">
              <pre className="wa-text">{buildPayMsg(current)}</pre>
              <span className="wa-time">{fmtTime(new Date().toISOString())} ✓✓</span>
            </div>
          </div>
          {canCobrar(role) ? (
            <div style={{ display: "flex", gap: 10 }}>
              <Btn icon="send" disabled={!hasPhone || sentMut.isPending} onClick={() => sentMut.mutate("whatsapp")}>
                Enviar por WhatsApp
              </Btn>
              <Btn kind="ghost" icon="file" disabled={sentMut.isPending} onClick={() => sentMut.mutate("email")}>
                Enviar por correo
              </Btn>
            </div>
          ) : null}
          {sentNote ? (
            <p style={{ color: "var(--ok, #3A8A5F)", fontSize: 13, margin: "10px 0 0", fontWeight: 700 }}>
              {sentNote}
            </p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
