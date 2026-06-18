import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Btn, Field } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/helpers";
import type { Payment, PaymentConcept, SearchPatient } from "@/lib/types";
import { createPayment, listPatientBalances, listPatientInvoices } from "./api";
import { PAY_CONCEPTS } from "./meta";

interface Props {
  onClose: () => void;
  onCreated?: (p: Payment) => void;
  patientId?: string;
  conceptType?: PaymentConcept;
  refId?: string;
}

export function GenerarCobroModal({ onClose, onCreated, patientId, conceptType: initType, refId: initRef }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<SearchPatient | null>(null);
  const [conceptType, setConceptType] = useState<PaymentConcept>(initType ?? "libre");
  const [refId, setRefId] = useState(initRef ?? "");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const lockConcept = !!initRef;

  useEffect(() => {
    if (patientId && !sel) {
      api.get<SearchPatient>(`/patients/${patientId}`).then((p) => {
        if (p) {
          setSel({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            id_number: p.id_number,
          });
        }
      }).catch(() => undefined);
    }
  }, [patientId, sel]);

  const { data: matches = [] } = useQuery({
    queryKey: ["patients-search", q],
    enabled: !patientId && q.trim().length >= 2 && !sel,
    queryFn: () => api.get<SearchPatient[]>(`/search/patients?q=${encodeURIComponent(q.trim())}`),
  });

  const pid = sel?.id ?? patientId ?? "";
  const { data: balances = [] } = useQuery({
    queryKey: ["balances", pid],
    enabled: !!pid && conceptType === "paquete",
    queryFn: () => listPatientBalances(pid),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", pid],
    enabled: !!pid && conceptType === "factura",
    queryFn: () => listPatientInvoices(pid),
  });

  const balancesWithDeuda = useMemo(
    () =>
      balances
        .map((b) => {
          const paid = (b.payments ?? []).reduce((t, p) => t + Number(p.amount || 0), 0);
          const deuda = Number(b.price) - paid;
          return { ...b, deuda };
        })
        .filter((b) => b.deuda > 0),
    [balances],
  );

  useEffect(() => {
    if (conceptType === "paquete" && refId) {
      const b = balancesWithDeuda.find((x) => x.id === refId);
      if (b) {
        setAmount(String(b.deuda.toFixed(2)));
        setLabel(`Saldo paquete · ${b.package?.name ?? ""}`);
      }
    } else if (conceptType === "factura" && refId) {
      const f = invoices.find((x) => x.id === refId);
      if (f) {
        setAmount(String(Number(f.total).toFixed(2)));
        setLabel(`Factura ${f.number}`);
      }
    } else if (conceptType === "deposito") {
      setLabel((cur) =>
        cur && !/^Saldo paquete|^Factura/.test(cur) ? cur : "Depósito de reserva",
      );
    }
  }, [conceptType, refId, balancesWithDeuda, invoices]);

  const mut = useMutation({
    mutationFn: createPayment,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
      if (onCreated) setTimeout(() => onCreated(p), 50);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const valid =
    pid &&
    Number(amount) > 0 &&
    label.trim().length > 0 &&
    (conceptType === "paquete" || conceptType === "factura" ? !!refId : true);

  function submit() {
    setErr(null);
    if (!pid) return setErr("Selecciona un paciente.");
    mut.mutate({
      patientId: pid,
      conceptType,
      conceptRefId: refId || null,
      conceptLabel: label.trim(),
      amount: Number(amount),
    });
  }

  return (
    <Modal
      title="Generar cobro · link Payphone"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="link" disabled={!valid || mut.isPending} onClick={submit}>
            {mut.isPending ? "Generando…" : "Generar link"}
          </Btn>
        </>
      }
    >
      {!patientId ? (
        <Field label="Paciente">
          {sel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong>{sel.first_name} {sel.last_name}</strong>
              <span className="muted">CI {sel.id_number}</span>
              <Btn sm kind="ghost" onClick={() => { setSel(null); setQ(""); setRefId(""); }}>
                Cambiar
              </Btn>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o cédula…" />
              {matches.length > 0 ? (
                <div className="hd-results" style={{ position: "absolute", left: 0, right: 0 }}>
                  {matches.map((p) => (
                    <button key={p.id} className="hd-result" onClick={() => { setSel(p); setQ(""); }}>
                      <span>{p.first_name} {p.last_name}</span>
                      <small>{p.id_number}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Field>
      ) : null}

      <Field label="Tipo de cobro">
        <select
          value={conceptType}
          onChange={(e) => {
            setConceptType(e.target.value as PaymentConcept);
            setRefId("");
            setAmount("");
            setLabel("");
          }}
          disabled={lockConcept}
        >
          {(Object.entries(PAY_CONCEPTS) as [PaymentConcept, (typeof PAY_CONCEPTS)[PaymentConcept]][]).map(
            ([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ),
          )}
        </select>
      </Field>

      {conceptType === "paquete" ? (
        <Field label="Paquete con saldo pendiente">
          <select value={refId} onChange={(e) => setRefId(e.target.value)} disabled={lockConcept}>
            <option value="">Seleccionar bono…</option>
            {balancesWithDeuda.map((b) => (
              <option key={b.id} value={b.id}>
                {b.package?.name ?? "Paquete"} · saldo {fmtMoney(b.deuda)}
              </option>
            ))}
          </select>
          {pid && balancesWithDeuda.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
              Este paciente no tiene bonos con saldo pendiente.
            </p>
          ) : null}
        </Field>
      ) : null}

      {conceptType === "factura" ? (
        <Field label="Factura del paciente">
          <select value={refId} onChange={(e) => setRefId(e.target.value)}>
            <option value="">Seleccionar factura…</option>
            {invoices.map((f) => (
              <option key={f.id} value={f.id}>
                {f.number} · {fmtMoney(Number(f.total))} · {f.status}
              </option>
            ))}
          </select>
          {pid && invoices.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
              Este paciente no tiene facturas emitidas.
            </p>
          ) : null}
        </Field>
      ) : null}

      <Field label="Concepto (aparece en el link y el mensaje)">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={
            conceptType === "deposito" ? "Depósito de reserva · Consulta" : "Descripción del cobro"
          }
        />
      </Field>
      <Field label="Monto a cobrar (USD)">
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </Field>

      <div
        className="warn-box"
        style={{ background: "var(--cream, #F6EFE3)", color: "var(--brown-800, #4A2E1A)", marginTop: 6 }}
      >
        <Icon name="card" size={17} />
        <div>
          <strong>Se generará un link de pago Payphone</strong>
          <div style={{ fontSize: 12.5, marginTop: 2 }}>
            {sel ? `Para ${sel.first_name} ${sel.last_name}. ` : ""}
            Podrás enviarlo por WhatsApp o correo y conciliarlo cuando el paciente complete el pago.
            Sirve para pagos parciales y depósitos de reserva.
          </div>
        </div>
      </div>

      {err ? <p style={{ color: "var(--err)", margin: "8px 0 0" }}>{err}</p> : null}
    </Modal>
  );
}
