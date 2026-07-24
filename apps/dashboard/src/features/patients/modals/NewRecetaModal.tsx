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

function HelpLabel({ text, help }: { text: string; help: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {text}
      <span
        aria-label={`Ayuda: ${help}`}
        title={help}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 17,
          height: 17,
          borderRadius: "50%",
          background: "var(--info-bg)",
          color: "var(--info)",
          fontSize: 11,
          fontWeight: 800,
          cursor: "help",
        }}
      >
        !
      </span>
    </span>
  );
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
  const professionalsQuery = useQuery({
    queryKey: ["professionals"],
    queryFn: listProfessionals,
    refetchOnMount: "always",
  });
  const profs = professionalsQuery.data ?? [];
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

  const selectedProfessional = profs.find((professional) => professional.id === professionalId);
  const valid =
    professionalId
    && selectedProfessional?.identifierType === "acess_msp"
    && !!selectedProfessional.registrationNo
    && items.some((it) => it.ingredients.some((g) => g.name.trim()) && it.instructions.trim());

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
        <Field label={<HelpLabel text="Profesional que emite la receta" help="Selecciona al profesional responsable de la prescripción. Para emitirla debe tener un identificador profesional registrado." />}>
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            disabled={professionalsQuery.isPending || professionalsQuery.isError || profs.length === 0}
          >
            {professionalsQuery.isPending ? <option value="">Cargando profesionales…</option> : null}
            {professionalsQuery.isError ? <option value="">No se pudo cargar la lista</option> : null}
            {!professionalsQuery.isPending && !professionalsQuery.isError && profs.length === 0 ? (
              <option value="">No hay perfiles profesionales</option>
            ) : null}
            {profs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {!edit ? (
          <Field label={<HelpLabel text="Plantilla de receta" help="Opcional. Completa automáticamente una fórmula frecuente y luego puedes modificarla." />}>
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
      {professionalsQuery.isError ? (
        <p className="form-error">
          No se pudieron consultar los profesionales: {(professionalsQuery.error as Error).message}.{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void professionalsQuery.refetch()}>
            Reintentar
          </button>
        </p>
      ) : null}
      {!professionalsQuery.isPending && !professionalsQuery.isError && profs.length === 0 ? (
        <p className="form-error">
          No existen perfiles profesionales clínicos para esta clínica. Un administrador debe crearlos en
          Sistema → Profesionales clínicos; crear solamente un usuario con rol Profesional no llena este selector.
        </p>
      ) : null}
      {professionalId && (selectedProfessional?.identifierType !== "acess_msp" || !selectedProfessional.registrationNo) ? (
        <p className="form-error">
          El profesional seleccionado todavía no tiene Registro ACESS/MSP. Complétalo en Sistema antes de emitir la receta.
        </p>
      ) : null}
      <div className="frow">
        <Field label={<HelpLabel text="Diagnóstico o motivo de atención" help="Describe brevemente la condición tratada o el motivo clínico de esta receta." />}>
          <input
            value={diagnosis}
            placeholder="Ej. Acné vulgar"
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </Field>
        <Field label={<HelpLabel text="Advertencias para el paciente" help="Incluye alergias relevantes, señales de alarma, precauciones o cuándo suspender el tratamiento." />}>
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
              <strong style={{ fontSize: 13.5 }}>Medicamento o fórmula {i + 1}</strong>
              {items.length > 1 ? (
                <Btn sm kind="ghost" icon="trash" onClick={() => setItems(items.filter((_, k) => k !== i))}>
                  Quitar
                </Btn>
              ) : null}
            </div>
            {it.ingredients.map((g, j) => (
              <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 150px 34px", gap: 8, marginBottom: 8, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  <HelpLabel text="Medicamento o principio activo" help="Escribe el nombre genérico, comercial o cada componente de una fórmula magistral." />
                  <input
                    value={g.name}
                    placeholder="Ej. adapaleno"
                    onChange={(e) => updIng(i, j, { name: e.target.value })}
                    style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  <HelpLabel text="Concentración" help="Indica la potencia del medicamento, por ejemplo 0.1%, 500 mg o 10 mg/ml." />
                  <input
                    value={g.concentration}
                    placeholder="Ej. 0.1%"
                    onChange={(e) => updIng(i, j, { concentration: e.target.value })}
                    style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }}
                  />
                </label>
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
              <Field label={<HelpLabel text="Forma farmacéutica o base" help="Indica cómo se presenta: crema, gel, loción, cápsula, solución o base magistral." />}>
                <input
                  value={it.vehicle}
                  placeholder="gel, crema base…"
                  onChange={(e) => updItem(i, { vehicle: e.target.value })}
                />
              </Field>
              <Field label={<HelpLabel text="Cantidad a entregar" help="Especifica la cantidad total: 30 g, 20 tabletas, 1 frasco, etc." />}>
                <input
                  value={it.quantity}
                  placeholder="30 g"
                  onChange={(e) => updItem(i, { quantity: e.target.value })}
                />
              </Field>
            </div>
            <div className="frow">
              <Field label={<HelpLabel text="Dosis por toma o aplicación" help="Cantidad que debe usar cada vez, por ejemplo una cápsula o una capa fina." />}>
                <input
                  value={it.dosage ?? ""}
                  placeholder="Ej. una cápsula"
                  onChange={(e) => updItem(i, { dosage: e.target.value })}
                />
              </Field>
              <Field label={<HelpLabel text="Cada cuánto usar" help="Frecuencia de uso: cada 12 horas, una vez al día, tres veces por semana, etc." />}>
                <input
                  value={it.frequency ?? ""}
                  placeholder="Ej. cada 12 horas"
                  onChange={(e) => updItem(i, { frequency: e.target.value })}
                />
              </Field>
              <Field label={<HelpLabel text="Tiempo de tratamiento" help="Duración total del tratamiento, por ejemplo 7 días, 4 semanas o hasta el próximo control." />}>
                <input
                  value={it.duration ?? ""}
                  placeholder="Ej. 7 días"
                  onChange={(e) => updItem(i, { duration: e.target.value })}
                />
              </Field>
            </div>
            <Field label={<HelpLabel text="Cómo usar el medicamento" help="Explica dónde, cuándo y cómo aplicarlo o tomarlo, incluyendo cuidados adicionales." />}>
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
