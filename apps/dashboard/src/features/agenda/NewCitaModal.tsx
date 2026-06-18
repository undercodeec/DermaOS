import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Btn, Field } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import type { AppointmentKind, SearchPatient } from "@/lib/types";
import { listProfessionals, listServices } from "@/features/patients/api";
import { createAppointment } from "./api";

interface Props {
  seed: { date: string; time: string };
  onClose: () => void;
  patientId?: string;
}

const KIND_OPTIONS: { value: AppointmentKind; label: string }[] = [
  { value: "consulta_nueva", label: "Consulta nueva" },
  { value: "control", label: "Control" },
  { value: "procedimiento", label: "Procedimiento" },
];

export function NewCitaModal({ seed, onClose, patientId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selPatient, setSelPatient] = useState<SearchPatient | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(seed.date);
  const [time, setTime] = useState(seed.time);
  const [kind, setKind] = useState<AppointmentKind>("consulta_nueva");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services-active"],
    queryFn: listServices,
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: listProfessionals,
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["patients-search", q],
    enabled: !patientId && q.trim().length >= 2 && !selPatient,
    queryFn: () =>
      api.get<SearchPatient[]>(`/search/patients?q=${encodeURIComponent(q.trim())}`),
  });

  useEffect(() => {
    if (patientId && !selPatient) {
      api.get<SearchPatient>(`/patients/${patientId}`).then((p) => {
        if (!p) return;
        setSelPatient({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          id_number: p.id_number,
        });
      }).catch(() => undefined);
    }
  }, [patientId, selPatient]);

  const svc = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  const mut = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit() {
    setErr(null);
    if (!selPatient) return setErr("Selecciona un paciente.");
    if (!serviceId) return setErr("Selecciona un servicio.");
    if (!professionalId) return setErr("Selecciona un profesional.");
    const startAt = new Date(`${date}T${time}:00`);
    const dur = svc?.durationMin ?? 30;
    const endAt = new Date(startAt.getTime() + dur * 60_000);
    mut.mutate({
      patientId: selPatient.id,
      serviceId,
      professionalId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      kind,
      notes: notes.trim() ? notes.trim() : null,
    });
  }

  return (
    <Modal
      title="Nueva cita"
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? "Agendando…" : "Agendar"}
          </Btn>
        </>
      }
    >
      {!patientId ? (
        <Field label="Paciente">
          {selPatient ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong>
                {selPatient.first_name} {selPatient.last_name}
              </strong>
              <span className="muted">CI {selPatient.id_number}</span>
              <Btn sm kind="ghost" onClick={() => { setSelPatient(null); setQ(""); }}>
                Cambiar
              </Btn>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o cédula…"
              />
              {matches.length > 0 ? (
                <div className="hd-results" style={{ position: "absolute", left: 0, right: 0 }}>
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      className="hd-result"
                      onClick={() => {
                        setSelPatient(p);
                        setQ("");
                      }}
                    >
                      <span>
                        {p.first_name} {p.last_name}
                      </span>
                      <small>{p.id_number}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Field>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fecha">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Hora">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={900} />
        </Field>
      </div>

      <Field label="Servicio">
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Selecciona…</option>
          {services.filter((s) => s.active).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMin}′)
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Profesional">
          <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            <option value="">Selecciona…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={kind} onChange={(e) => setKind(e.target.value as AppointmentKind)}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notas (opcional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Indicaciones internas…"
        />
      </Field>

      {err ? <p style={{ color: "var(--err)", margin: "8px 0 0" }}>{err}</p> : null}
    </Modal>
  );
}
