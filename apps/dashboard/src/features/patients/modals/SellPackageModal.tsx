import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtMoney, fullName } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { listPackages, listProfessionals, sellPackage } from "../api";
import type { Patient } from "@/lib/types";

const PAY_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "transferencia", label: "Transferencia" },
  { id: "payphone", label: "Payphone" },
];

export function SellPackageModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: pkgs = [] } = useQuery({
    queryKey: ["packages", { active: true }],
    queryFn: () => listPackages({ activeOnly: true }),
  });
  const { data: profs = [] } = useQuery({ queryKey: ["professionals"], queryFn: listProfessionals });

  const [f, setF] = useState({
    packageId: "",
    sellerProfessionalId: profile?.professionalId ?? "",
    initialPayment: "",
    method: "efectivo",
    note: "Abono inicial",
  });

  useEffect(() => {
    if (!f.sellerProfessionalId && profs.length > 0) {
      setF((p) => ({ ...p, sellerProfessionalId: profs[0].id }));
    }
  }, [profs, f.sellerProfessionalId]);

  const pk = pkgs.find((p) => p.id === f.packageId) ?? null;
  const valid = !!f.packageId;

  const m = useMutation({
    mutationFn: () =>
      sellPackage(patient.id, {
        packageId: f.packageId,
        sellerProfessionalId: f.sellerProfessionalId || null,
        initialPayment: f.initialPayment ? Number(f.initialPayment) : undefined,
        method: f.method,
        note: f.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balances", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      title={`Vender paquete · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Registrando…" : "Vender paquete"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Paquete">
          <select value={f.packageId} onChange={(e) => setF({ ...f, packageId: e.target.value })}>
            <option value="">Seleccionar paquete…</option>
            {pkgs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {fmtMoney(Number(p.price))}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendedor / profesional">
          <select
            value={f.sellerProfessionalId}
            onChange={(e) => setF({ ...f, sellerProfessionalId: e.target.value })}
          >
            {profs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {pk ? (
        <div
          className="warn-box"
          style={{ background: "var(--cream, var(--bg-subtle))", color: "var(--ink-1)", marginBottom: 14 }}
        >
          <Icon name="layers" size={17} />
          <div>
            <strong>
              {pk.sessions} sesiones · {fmtMoney(Number(pk.price))}
            </strong>{" "}
            ({fmtMoney(Number(pk.price) / pk.sessions)} c/u)
            <div style={{ fontSize: 12.5, marginTop: 2 }}>
              Vigencia {pk.validityDays} días · intervalo sugerido cada {pk.intervalDays} días.
            </div>
          </div>
        </div>
      ) : null}
      <div className="frow3">
        <Field label="Abono inicial (USD)">
          <input
            type="number"
            min="0"
            step="5"
            value={f.initialPayment}
            onChange={(e) => setF({ ...f, initialPayment: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Método de pago">
          <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            {PAY_METHODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nota">
          <input
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder="Abono inicial"
          />
        </Field>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        El abono inicial es opcional. El saldo restante queda registrado y se abona después.
      </p>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
