import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import type { InventoryItem } from "@/lib/types";
import { createInventoryItem, updateInventoryItem, type NewInventoryItem } from "./api";

const TYPE_LABEL: Record<NewInventoryItem["type"], string> = {
  vial: "Vial / inyectable",
  principio_activo: "Principio activo",
  insumo: "Insumo",
  farmaco: "Fármaco",
};

function toDateStr(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function NewItemModal({
  onClose,
  edit,
}: {
  onClose: () => void;
  edit?: InventoryItem;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: edit?.name ?? "",
    type: (edit?.type ?? "insumo") as NewInventoryItem["type"],
    unit: edit?.unit ?? "unidad",
    stock: edit ? String(edit.stock) : "0",
    minStock: String(edit?.minStock ?? "0"),
    lotNumber: edit?.lotNumber ?? "",
    expiryDate: toDateStr(edit?.expiryDate),
  });

  const valid = f.name.trim() && f.unit.trim() && Number(f.stock) >= 0 && Number(f.minStock) >= 0;

  const m = useMutation({
    mutationFn: () =>
      edit
        ? updateInventoryItem(edit.id, {
            name: f.name.trim(),
            type: f.type,
            unit: f.unit.trim(),
            minStock: Number(f.minStock),
            lotNumber: f.lotNumber || undefined,
            expiryDate: f.expiryDate || undefined,
          })
        : createInventoryItem({
            name: f.name.trim(),
            type: f.type,
            unit: f.unit.trim(),
            stock: Number(f.stock),
            minStock: Number(f.minStock),
            lotNumber: f.lotNumber || undefined,
            expiryDate: f.expiryDate || undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
  });

  return (
    <Modal
      title={edit ? "Editar ítem" : "Nuevo ítem de inventario"}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? (edit ? "Guardando…" : "Creando…") : edit ? "Guardar cambios" : "Crear ítem"}
          </Btn>
        </>
      }
    >
      <Field label="Nombre del ítem">
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Ácido hialurónico · jeringa 1 ml"
        />
      </Field>
      <div className="frow">
        <Field label="Tipo">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as NewInventoryItem["type"] })}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidad">
          <input
            value={f.unit}
            onChange={(e) => setF({ ...f, unit: e.target.value })}
            placeholder="vial, jeringa, g, unidad…"
          />
        </Field>
      </div>
      <div className="frow">
        {!edit ? (
          <Field label="Stock inicial">
            <input
              type="number"
              min="0"
              step="1"
              value={f.stock}
              onChange={(e) => setF({ ...f, stock: e.target.value })}
            />
          </Field>
        ) : null}
        <Field label="Stock mínimo">
          <input
            type="number"
            min="0"
            step="1"
            value={f.minStock}
            onChange={(e) => setF({ ...f, minStock: e.target.value })}
          />
        </Field>
      </div>
      <div className="frow">
        <Field label="Lote (opcional)">
          <input
            value={f.lotNumber}
            onChange={(e) => setF({ ...f, lotNumber: e.target.value })}
            placeholder="B7231-EC"
          />
        </Field>
        <Field label="Vencimiento (opcional)">
          <input
            type="date"
            value={f.expiryDate}
            onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
          />
        </Field>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
