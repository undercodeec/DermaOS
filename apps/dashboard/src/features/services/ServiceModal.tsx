import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { createService, updateService, type ServiceCategory } from "./api";
import type { Service } from "@/lib/types";

const CAT_LABEL: Record<ServiceCategory, string> = {
  consulta: "Consulta",
  tratamiento: "Tratamiento",
  procedimiento_estetico: "Procedimiento estético",
  estudio: "Estudio",
};

export function ServiceModal({
  initial,
  onClose,
}: {
  initial?: Service | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = !!initial;
  const [f, setF] = useState({
    name: initial?.name ?? "",
    category: (initial?.category as ServiceCategory) ?? "consulta",
    durationMin: String(initial?.durationMin ?? 30),
    price: initial ? String(Number(initial.price)) : "",
    vatRate: String(initial?.vatRate ?? 0),
  });

  const auto15 = f.category === "procedimiento_estetico";
  const valid = f.name.trim() && Number(f.price) >= 0 && Number(f.durationMin) > 0;

  const m = useMutation({
    mutationFn: () => {
      const payload = {
        name: f.name.trim(),
        category: f.category,
        durationMin: Number(f.durationMin),
        price: Number(f.price),
        vatRate: (auto15 ? 15 : Number(f.vatRate)) as 0 | 15,
      };
      return editing ? updateService(initial!.id, payload) : createService(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      onClose();
    },
  });

  return (
    <Modal
      title={editing ? "Editar servicio" : "Nuevo servicio"}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear servicio"}
          </Btn>
        </>
      }
    >
      <Field label="Nombre">
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Peeling despigmentante…"
        />
      </Field>
      <div className="frow">
        <Field label="Categoría">
          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value as ServiceCategory })}
          >
            {Object.entries(CAT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Duración (min)">
          <input
            type="number"
            min="10"
            step="5"
            value={f.durationMin}
            onChange={(e) => setF({ ...f, durationMin: e.target.value })}
          />
        </Field>
      </div>
      <div className="frow">
        <Field label="Precio (USD)">
          <input
            type="number"
            min="0"
            step="5"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
          />
        </Field>
        <Field label="IVA">
          <select
            value={auto15 ? "15" : f.vatRate}
            onChange={(e) => setF({ ...f, vatRate: e.target.value })}
            disabled={auto15}
          >
            <option value="0">0% · servicio de salud</option>
            <option value="15">15% · estético</option>
          </select>
        </Field>
      </div>
      {auto15 ? (
        <p className="muted" style={{ fontSize: 12.5 }}>
          Los procedimientos estéticos siempre facturan IVA 15%.
        </p>
      ) : null}
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
