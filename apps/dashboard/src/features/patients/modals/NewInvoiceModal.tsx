import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Badge, Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { calcInvoiceTotals, fmtMoney, fullName } from "@/lib/helpers";
import { createInvoice, listServices } from "../api";
import type { InvoiceLine, Patient } from "@/lib/types";

export function NewInvoiceModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: listServices });
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [svcPick, setSvcPick] = useState("");

  const addLine = (serviceId: string) => {
    const sv = services.find((s) => s.id === serviceId);
    if (!sv) return;
    setLines([
      ...lines,
      {
        serviceId,
        description: sv.name,
        quantity: 1,
        unitPrice: Number(sv.price),
        vatRate: sv.vatRate,
      },
    ]);
    setSvcPick("");
  };
  const updLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const totals = calcInvoiceTotals(lines);
  const valid = lines.length > 0;

  const m = useMutation({
    mutationFn: () => createInvoice(patient.id, { lines }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      wide
      title={`Nueva factura electrónica · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Generando…" : "Generar factura"}
          </Btn>
        </>
      }
    >
      <Field label="Agregar servicio">
        <select value={svcPick} onChange={(e) => addLine(e.target.value)}>
          <option value="">Seleccionar servicio…</option>
          {services
            .filter((x) => x.active)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {fmtMoney(Number(x.price))} · IVA {x.vatRate}%
              </option>
            ))}
        </select>
      </Field>

      {lines.length > 0 ? (
        <table className="tbl" style={{ marginBottom: 12 }}>
          <thead>
            <tr>
              <th>Detalle</th>
              <th style={{ width: 70 }}>Cant.</th>
              <th style={{ width: 100 }} className="num">
                P. unit.
              </th>
              <th style={{ width: 64 }}>IVA</th>
              <th className="num" style={{ width: 90 }}>
                Subtotal
              </th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.description}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={l.quantity}
                    onChange={(e) =>
                      updLine(i, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    style={{ width: 56, border: "1px solid var(--border-strong)", borderRadius: 6, padding: "4px 6px" }}
                  />
                </td>
                <td className="num tnum">{fmtMoney(l.unitPrice)}</td>
                <td>
                  <Badge cls={l.vatRate === 15 ? "bg-warn" : "bg-ok"}>{l.vatRate}%</Badge>
                </td>
                <td className="num tnum">{fmtMoney(l.quantity * l.unitPrice)}</td>
                <td>
                  <button className="mclose" onClick={() => setLines(lines.filter((_, k) => k !== i))}>
                    <Icon name="x" size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ fontSize: 13.5 }}>
          Agrega al menos un servicio.
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="muted" style={{ padding: "3px 18px 3px 0" }}>
                Subtotal 0%
              </td>
              <td className="num tnum">{fmtMoney(totals.subtotal0)}</td>
            </tr>
            <tr>
              <td className="muted" style={{ padding: "3px 18px 3px 0" }}>
                Subtotal 15%
              </td>
              <td className="num tnum">{fmtMoney(totals.subtotal15)}</td>
            </tr>
            <tr>
              <td className="muted" style={{ padding: "3px 18px 3px 0" }}>
                IVA 15%
              </td>
              <td className="num tnum">{fmtMoney(totals.vatAmount)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 18px 3px 0", fontWeight: 700 }}>TOTAL</td>
              <td className="num tnum" style={{ fontWeight: 700, fontSize: 17 }}>
                {fmtMoney(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
