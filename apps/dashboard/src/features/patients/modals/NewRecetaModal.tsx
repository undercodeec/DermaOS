import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fullName } from "@/lib/helpers";
import { createReceta, listProfessionals, updateReceta } from "../api";
import type { ClinicalRecord, Patient, RxItem } from "@/lib/types";

const RX_TEMPLATES: { id: string; name: string; items: RxItem[] }[] = [
  {
    id: "tpl-acne",
    name: "Fórmula despigmentante anti-acné",
    items: [
      {
        ingredients: [
          { name: "Peróxido de benzoilo", concentration: "5%" },
          { name: "Clindamicina", concentration: "1%" },
        ],
        vehicle: "gel",
        quantity: "30 g",
        instructions: "Aplicar capa fina por las noches.",
      },
    ],
  },
  {
    id: "tpl-melasma",
    name: "Despigmentante para melasma",
    items: [
      {
        ingredients: [
          { name: "Hidroquinona", concentration: "4%" },
          { name: "Tretinoína", concentration: "0.05%" },
        ],
        vehicle: "crema base",
        quantity: "30 g",
        instructions: "Aplicar solo en las manchas por la noche. Fotoprotección estricta.",
      },
    ],
  },
];

function emptyItem(): RxItem {
  return {
    ingredients: [{ name: "", concentration: "" }],
    vehicle: "",
    quantity: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  };
}

export function NewRecetaModal({
  patient,
  onClose,
  edit,
}: {
  patient: Patient;
  onClose: () => void;
  edit?: ClinicalRecord;
}) {
  const qc = useQueryClient();
  const { data: profs = [] } = useQuery({ queryKey: ["professionals"], queryFn: listProfessionals });
  const [professionalId, setProfessionalId] = useState(edit?.professionalId ?? "");
  const [templateId, setTemplateId] = useState(edit?.prescription?.templateId ?? "");
  const [diagnosis, setDiagnosis] = useState(edit?.prescription?.diagnosis ?? "");
  const [warnings, setWarnings] = useState(edit?.prescription?.warnings ?? "");
  const [items, setItems] = useState<RxItem[]>(
    edit?.prescription?.items?.length ? JSON.parse(JSON.stringify(edit.prescription.items)) : [emptyItem()],
  );

  useEffect(() => {
    if (!professionalId && profs.length > 0) setProfessionalId(profs[0].id);
  }, [profs, professionalId]);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = RX_TEMPLATES.find((t) => t.id === id);
    if (tpl) setItems(JSON.parse(JSON.stringify(tpl.items)));
  };

  const updItem = (i: number, patch: Partial<RxItem>) =>
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const updIng = (i: number, j: number, patch: Partial<RxItem["ingredients"][number]>) =>
    updItem(i, {
      ingredients: items[i].ingredients.map((g, k) => (k === j ? { ...g, ...patch } : g)),
    });

  const valid =
    professionalId && items.some((it) => it.ingredients.some((g) => g.name.trim()) && it.instructions.trim());

  const m = useMutation({
    mutationFn: () => {
      const cleanItems = items.filter((it) => it.ingredients.some((g) => g.name.trim()));
      if (edit) {
        return updateReceta(patient.id, edit.id, {
          professionalId,
          diagnosis: diagnosis.trim(),
          warnings: warnings.trim(),
          items: cleanItems,
        });
      }
      return createReceta(patient.id, {
        professionalId,
        templateId: templateId || undefined,
        diagnosis: diagnosis.trim(),
        warnings: warnings.trim(),
        items: cleanItems,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recetas", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      wide
      title={`${edit ? "Editar" : "Nueva"} receta · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Guardando…" : edit ? "Guardar cambios" : "Guardar receta"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Profesional">
          <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            {profs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {!edit ? (
          <Field label="Desde plantilla">
            <select value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">— Receta en blanco —</option>
              {RX_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <div className="frow">
        <Field label="Diagnóstico o motivo">
          <input
            value={diagnosis}
            placeholder="Ej. Acné vulgar"
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </Field>
        <Field label="Advertencias generales">
          <input
            value={warnings}
            placeholder="Ej. Suspender ante irritación intensa"
            onChange={(e) => setWarnings(e.target.value)}
          />
        </Field>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((it, i) => (
          <div key={i} className="rx-card" style={{ background: "var(--bg-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 13.5 }}>Fórmula {i + 1}</strong>
              {items.length > 1 ? (
                <Btn sm kind="ghost" icon="trash" onClick={() => setItems(items.filter((_, k) => k !== i))}>
                  Quitar
                </Btn>
              ) : null}
            </div>
            {it.ingredients.map((g, j) => (
              <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 110px 34px", gap: 8, marginBottom: 8 }}>
                <input
                  value={g.name}
                  placeholder="Principio activo"
                  onChange={(e) => updIng(i, j, { name: e.target.value })}
                  style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }}
                />
                <input
                  value={g.concentration}
                  placeholder="Conc."
                  onChange={(e) => updIng(i, j, { concentration: e.target.value })}
                  style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }}
                />
                <button
                  className="mclose"
                  title="Quitar principio activo"
                  onClick={() =>
                    updItem(i, { ingredients: it.ingredients.filter((_, k) => k !== j) })
                  }
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            <Btn
              sm
              kind="ghost"
              icon="plus"
              onClick={() => updItem(i, { ingredients: [...it.ingredients, { name: "", concentration: "" }] })}
            >
              Principio activo
            </Btn>
            <div className="frow" style={{ marginTop: 10 }}>
              <Field label="Vehículo">
                <input
                  value={it.vehicle}
                  placeholder="gel, crema base…"
                  onChange={(e) => updItem(i, { vehicle: e.target.value })}
                />
              </Field>
              <Field label="Cantidad">
                <input
                  value={it.quantity}
                  placeholder="30 g"
                  onChange={(e) => updItem(i, { quantity: e.target.value })}
                />
              </Field>
            </div>
            <div className="frow">
              <Field label="Dosis">
                <input
                  value={it.dosage ?? ""}
                  placeholder="Ej. una cápsula"
                  onChange={(e) => updItem(i, { dosage: e.target.value })}
                />
              </Field>
              <Field label="Frecuencia">
                <input
                  value={it.frequency ?? ""}
                  placeholder="Ej. cada 12 horas"
                  onChange={(e) => updItem(i, { frequency: e.target.value })}
                />
              </Field>
              <Field label="Duración">
                <input
                  value={it.duration ?? ""}
                  placeholder="Ej. 7 días"
                  onChange={(e) => updItem(i, { duration: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Instrucciones de uso">
              <textarea
                rows={2}
                value={it.instructions}
                placeholder="Aplicar capa fina por las noches…"
                onChange={(e) => updItem(i, { instructions: e.target.value })}
              />
            </Field>
          </div>
        ))}
        <Btn sm icon="plus" onClick={() => setItems([...items, emptyItem()])}>
          Agregar otra fórmula
        </Btn>
      </div>

      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
