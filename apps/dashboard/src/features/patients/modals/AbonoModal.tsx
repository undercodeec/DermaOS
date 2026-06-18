import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtMoney, fullName } from "@/lib/helpers";
import { addAbono } from "../api";
import type { PackageBalance, Patient } from "@/lib/types";

const PAY_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "transferencia", label: "Transferencia" },
  { id: "payphone", label: "Payphone" },
];

export function AbonoModal({
  patient,
  balance,
  onClose,
}: {
  patient: Patient;
  balance: PackageBalance & { paid: number };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const econ = Number(balance.price) - balance.paid;
  const [amount, setAmount] = useState(econ > 0 ? String(econ) : "");
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");

  const valid = Number(amount) > 0;

  const m = useMutation({
    mutationFn: () => addAbono(balance.id, { amount: Number(amount), method, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balances", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      title="Registrar abono"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Registrando…" : "Registrar abono"}
          </Btn>
        </>
      }
    >
      <div
        className="warn-box"
        style={{ background: "var(--bg-subtle)", color: "var(--ink-2)", marginBottom: 14 }}
      >
        <Icon name="layers" size={16} />
        <div>
          <strong>{balance.package?.name ?? "Paquete"}</strong> · {fullName(patient)}
          <div style={{ fontSize: 12.5, marginTop: 2 }}>
            Precio {fmtMoney(Number(balance.price))} · abonado {fmtMoney(balance.paid)} · saldo{" "}
            <strong style={{ color: "var(--warn)" }}>{fmtMoney(econ)}</strong>
          </div>
        </div>
      </div>
      <div className="frow">
        <Field label="Monto del abono (USD)">
          <input
            type="number"
            min="0"
            step="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Método de pago">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAY_METHODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Nota (opcional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="2º abono, saldo…" />
      </Field>
      {Number(amount) > econ && econ >= 0 ? (
        <p className="muted" style={{ fontSize: 12.5 }}>
          El monto supera el saldo pendiente ({fmtMoney(econ)}); quedará como saldo a favor.
        </p>
      ) : null}
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
