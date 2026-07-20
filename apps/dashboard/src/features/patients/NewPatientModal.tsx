import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { createPatient } from "./api";

export function NewPatientModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPhototypeHelp, setShowPhototypeHelp] = useState(false);
  const [f, setF] = useState({
    first_name: "",
    last_name: "",
    id_type: "cedula",
    id_number: "",
    birth_date: "",
    sex: "F",
    email: "",
    phone: "",
    city: "Quito",
    skinType: "III" as "I" | "II" | "III" | "IV" | "V" | "VI",
    allergies: "",
  });

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const cedulaOk = f.id_type !== "cedula" || /^\d{10}$/.test(f.id_number);
  const valid = f.first_name && f.last_name && f.id_number && f.birth_date && cedulaOk;

  const m = useMutation({
    mutationFn: () =>
      createPatient({
        first_name: f.first_name,
        last_name: f.last_name,
        id_type: f.id_type,
        id_number: f.id_number,
        birth_date: f.birth_date,
        sex: f.sex,
        email: f.email || undefined,
        phone: f.phone || undefined,
        city: f.city || undefined,
        background: {
          skinType: f.skinType,
          usesSunscreen: false,
          allergies: f.allergies ? f.allergies.split(",").map((x) => x.trim()).filter(Boolean) : [],
          chronicConditions: [],
          currentMedications: [],
          familyHistory: [],
          dermatologicalHistory: [],
          smoker: false,
        },
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      onClose();
      if (p) navigate(`/patients/${p.id}/antecedentes`);
    },
  });

  return (
    <Modal
      title="Nuevo paciente"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn
            kind="primary"
            icon="check"
            disabled={!valid || m.isPending}
            onClick={() => m.mutate()}
          >
            {m.isPending ? "Guardando…" : "Crear paciente"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Nombres">
          <input value={f.first_name} onChange={upd("first_name")} placeholder="María José" />
        </Field>
        <Field label="Apellidos">
          <input value={f.last_name} onChange={upd("last_name")} placeholder="Pérez Vallejo" />
        </Field>
      </div>
      <div className="frow3">
        <Field label="Tipo de identificación">
          <select value={f.id_type} onChange={upd("id_type")}>
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
            <option value="ruc">RUC</option>
          </select>
        </Field>
        <Field label="Número">
          <input
            value={f.id_number}
            onChange={upd("id_number")}
            placeholder="10 dígitos"
            maxLength={f.id_type === "ruc" ? 13 : 10}
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <input type="date" value={f.birth_date} onChange={upd("birth_date")} />
        </Field>
      </div>
      {!cedulaOk && f.id_number ? (
        <p style={{ color: "var(--err)", fontSize: 13, marginTop: -8 }}>
          La cédula debe tener 10 dígitos.
        </p>
      ) : null}
      <div className="frow3">
        <Field label="Sexo">
          <select value={f.sex} onChange={upd("sex")}>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="O">Otro</option>
          </select>
        </Field>
        <Field label="Teléfono">
          <input value={f.phone} onChange={upd("phone")} placeholder="099 …" />
        </Field>
        <Field label="Ciudad">
          <input value={f.city} onChange={upd("city")} />
        </Field>
      </div>
      <Field label="Email">
        <input
          type="email"
          value={f.email}
          onChange={upd("email")}
          placeholder="correo@ejemplo.com"
        />
      </Field>
      <div className="frow">
        <Field
          label={
            <span className="field-label-with-help">
              Fototipo (Fitzpatrick)
              <button
                type="button"
                className="help-icon"
                aria-label="Más información sobre el fototipo Fitzpatrick"
                aria-describedby="phototype-help-tooltip"
                onClick={() => setShowPhototypeHelp(true)}
              >
                !
                <span id="phototype-help-tooltip" role="tooltip" className="help-tooltip">
                  Clasificación de la reacción de la piel ante el sol. Haz clic para ver el detalle.
                </span>
              </button>
            </span>
          }
        >
          <select value={f.skinType} onChange={upd("skinType")}>
            {(["I", "II", "III", "IV", "V", "VI"] as const).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Alergias (separadas por coma)">
          <input value={f.allergies} onChange={upd("allergies")} placeholder="Penicilina, sulfas…" />
        </Field>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>
          {(m.error as Error).message ?? "Error al crear paciente"}
        </p>
      ) : null}
      {showPhototypeHelp ? (
        <Modal title="Fototipo de piel (escala Fitzpatrick)" onClose={() => setShowPhototypeHelp(false)}>
          <div className="phototype-help-content">
            <p>
              El fototipo clasifica la respuesta habitual de la piel a la exposición solar, principalmente si se
              quema o se broncea. Sirve como referencia clínica para valorar el riesgo solar y planificar ciertos
              tratamientos dermatológicos.
            </p>
            <ul>
              <li><strong>I:</strong> piel muy clara; siempre se quema y no se broncea.</li>
              <li><strong>II:</strong> piel clara; se quema con facilidad y se broncea poco.</li>
              <li><strong>III:</strong> piel intermedia; a veces se quema y se broncea gradualmente.</li>
              <li><strong>IV:</strong> piel morena clara; rara vez se quema y se broncea con facilidad.</li>
              <li><strong>V:</strong> piel morena; casi nunca se quema y se broncea intensamente.</li>
              <li><strong>VI:</strong> piel muy oscura; no suele quemarse por el sol y se pigmenta intensamente.</li>
            </ul>
            <p className="phototype-help-note">
              Selecciona la opción que mejor describa la reacción usual de la piel del paciente al sol, no solo su
              tono de piel actual.
            </p>
          </div>
        </Modal>
      ) : null}
    </Modal>
  );
}
