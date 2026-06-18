import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { fmtMoney } from "@/lib/helpers";
import { listAllServices } from "../services/api";
import { createPackage, updatePackage } from "./api";
import type { Package } from "@/lib/types";

export function PackageModal({
  initial,
  onClose,
}: {
  initial?: Package | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = !!initial;
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: listAllServices });
  const [f, setF] = useState({
    name: initial?.name ?? "",
    serviceId: initial?.serviceId ?? "",
    sessions: String(initial?.sessions ?? 4),
    price: initial ? String(Number(initial.price)) : "",
    intervalDays: String(initial?.intervalDays ?? 30),
    validityDays: String(initial?.validityDays ?? 180),
  });

  const sv = services.find((x) => x.id === f.serviceId) ?? null;
  const valid =
    f.name.trim() &&
    f.serviceId &&
    Number(f.sessions) > 0 &&
    Number(f.price) > 0 &&
    Number(f.intervalDays) > 0 &&
    Number(f.validityDays) > 0;

  const m = useMutation({
    mutationFn: () => {
      const payload = {
        name: f.name.trim(),
        serviceId: f.serviceId,
        sessions: Number(f.sessions),
        price: Number(f.price),
        intervalDays: Number(f.intervalDays),
        validityDays: Number(f.validityDays),
      };
      return editing ? updatePackage(initial!.id, payload) : createPackage(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
      onClose();
    },
  });

  return (
    <Modal
      title={editing ? "Editar paquete" : "Nuevo paquete de sesiones"}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear paquete"}
          </Btn>
        </>
      }
    >
      <Field label="Nombre del paquete">
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Láser CO₂ · 4 sesiones"
        />
      </Field>
      <Field label="Servicio base">
        <select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
          <option value="">Seleccionar servicio…</option>
          {services
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {fmtMoney(Number(s.price))}
              </option>
            ))}
        </select>
      </Field>
      <div className="frow3">
        <Field label="Nº de sesiones">
          <input
            type="number"
            min="1"
            value={f.sessions}
            onChange={(e) => setF({ ...f, sessions: e.target.value })}
          />
        </Field>
        <Field label="Precio total (USD)">
          <input
            type="number"
            min="0"
            step="5"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
            placeholder="850"
          />
        </Field>
        <Field label="Intervalo sugerido (días)">
          <input
            type="number"
            min="1"
            value={f.intervalDays}
            onChange={(e) => setF({ ...f, intervalDays: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Vigencia (días desde la venta)">
        <input
          type="number"
          min="1"
          value={f.validityDays}
          onChange={(e) => setF({ ...f, validityDays: e.target.value })}
        />
      </Field>
      {sv && Number(f.sessions) > 0 && Number(f.price) > 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          {fmtMoney(Number(f.price) / Number(f.sessions))} por sesión · precio individual{" "}
          {fmtMoney(Number(sv.price))}
          {Number(sv.price) * Number(f.sessions) > Number(f.price)
            ? ` · ahorro ${fmtMoney(Number(sv.price) * Number(f.sessions) - Number(f.price))}`
            : ""}
        </p>
      ) : null}
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
