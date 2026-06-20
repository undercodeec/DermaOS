import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";
import { adjustInventory, deleteInventoryItem, listInventory } from "./api";
import { NewItemModal } from "./NewItemModal";

const INV_TYPE: Record<string, string> = {
  vial: "Vial / inyectable",
  principio_activo: "Principio activo",
  insumo: "Insumo",
  farmaco: "Fármaco",
};

export function InventoryView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const canWrite = roleCanWrite(role, "inventario");
  const qc = useQueryClient();

  const [openNew, setOpenNew] = useState(false);
  const [edit, setEdit] = useState<InventoryItem | null>(null);
  // per-row custom delta: Map itemId → string input value
  const [deltas, setDeltas] = useState<Record<string, string>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => adjustInventory(id, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  function getDelta(id: string): number {
    const v = Number(deltas[id] ?? "1");
    return isNaN(v) || v <= 0 ? 1 : Math.floor(v);
  }

  function handleDelete(item: InventoryItem) {
    if (window.confirm(`¿Eliminar "${item.name}" del inventario? Esta acción no se puede deshacer.`)) {
      del.mutate(item.id);
    }
  }

  const low = items.filter((i) => Number(i.stock) <= Number(i.minStock));

  return (
    <div className="content-inner">
      <PageHead title="Inventario" sub="Materias primas para fórmulas magistrales, viales e insumos">
        {canWrite ? (
          <Btn kind="primary" icon="plus" onClick={() => setOpenNew(true)}>
            Nuevo ítem
          </Btn>
        ) : null}
      </PageHead>

      <div style={{ marginBottom: 16 }}>
        {low.length > 0 ? (
          <Badge cls="bg-err">
            <Icon name="alert" size={13} /> {low.length} ítem{low.length === 1 ? "" : "s"} bajo mínimo
          </Badge>
        ) : (
          <Badge cls="bg-ok">
            <Icon name="check" size={13} /> Stock saludable
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="card">
          <EmptyState icon="box">Cargando inventario…</EmptyState>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState icon="box">Sin ítems en inventario.</EmptyState>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>Tipo</th>
                <th>Lote · Venc.</th>
                <th>Stock</th>
                <th></th>
                {canWrite ? <th style={{ width: 220 }}>Ajustar</th> : null}
                {canWrite ? <th style={{ width: 80 }}></th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const stock = Number(i.stock);
                const min = Number(i.minStock);
                const isLow = stock <= min;
                const pct = min > 0 ? Math.min(100, (stock / (min * 3)) * 100) : 100;
                const expSoon =
                  i.expiryDate && new Date(i.expiryDate).getTime() - Date.now() < 180 * 864e5;
                const d = deltas[i.id] ?? "1";
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.name}</strong>
                    </td>
                    <td>
                      <Badge cls="bg-neutral">{INV_TYPE[i.type] ?? i.type}</Badge>
                    </td>
                    <td className="tnum" style={{ fontSize: 13 }}>
                      {i.lotNumber ?? "—"}
                      {i.expiryDate ? (
                        <span
                          className={expSoon ? "" : "muted"}
                          style={expSoon ? { color: "var(--warn)", fontWeight: 700 } : {}}
                        >
                          {" · "}
                          {fmtDate(i.expiryDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="tnum">
                      <strong>{stock}</strong>{" "}
                      <span className="muted">
                        {i.unit} (mín {min})
                      </span>
                    </td>
                    <td>
                      <div className="stock-bar">
                        <i
                          style={{
                            width: pct + "%",
                            background: isLow ? "var(--err)" : pct < 55 ? "var(--warn)" : "var(--ok)",
                          }}
                        />
                      </div>
                      {isLow ? (
                        <span style={{ color: "var(--err)", fontSize: 12, fontWeight: 700 }}>
                          Reponer
                        </span>
                      ) : null}
                    </td>
                    {canWrite ? (
                      <td>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={d}
                            onChange={(e) => setDeltas({ ...deltas, [i.id]: e.target.value })}
                            style={{ width: 52, textAlign: "center" }}
                          />
                          <Btn sm onClick={() => adjust.mutate({ id: i.id, delta: -getDelta(i.id) })}>
                            −
                          </Btn>
                          <Btn sm onClick={() => adjust.mutate({ id: i.id, delta: +getDelta(i.id) })}>
                            +
                          </Btn>
                        </div>
                      </td>
                    ) : null}
                    {canWrite ? (
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn sm icon="pen" title="Editar" onClick={() => setEdit(i)} />
                          <Btn sm icon="trash" title="Eliminar" onClick={() => handleDelete(i)} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openNew ? <NewItemModal onClose={() => setOpenNew(false)} /> : null}
      {edit ? <NewItemModal edit={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
