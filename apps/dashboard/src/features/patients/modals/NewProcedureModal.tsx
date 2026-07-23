import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fullName } from "@/lib/helpers";
import { createProcedure, listProfessionals, listServices, listSignedConsents } from "../api";
import type { Patient } from "@/lib/types";

export function NewProcedureModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const professionalsQuery = useQuery({
    queryKey: ["professionals"],
    queryFn: listProfessionals,
    refetchOnMount: "always",
  });
  const profs = professionalsQuery.data ?? [];
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: listServices });
  const { data: signedConsents = [] } = useQuery({
    queryKey: ["consents-signed", patient.id],
    queryFn: () => listSignedConsents(patient.id),
  });

  const [f, setF] = useState({
    serviceId: "",
    professionalId: "",
    consentId: "",
    productUsed: "",
    units: "",
    lotNumber: "",
    expiry: "",
    zonas: "",
    notes: "",
  });

  useEffect(() => {
    if (!f.professionalId && profs.length > 0) setF((p) => ({ ...p, professionalId: profs[0].id }));
  }, [profs, f.professionalId]);

  const estServices = services.filter((s) => s.category === "procedimiento_estetico" && s.active);
  const valid = f.serviceId && f.professionalId && f.consentId;

  const m = useMutation({
    mutationFn: () =>
      createProcedure(patient.id, {
        serviceId: f.serviceId,
        professionalId: f.professionalId,
        consentId: f.consentId,
        productUsed: f.productUsed || undefined,
        units: f.units ? Number(f.units) : undefined,
        lotNumber: f.lotNumber || undefined,
        expiry: f.expiry || undefined,
        injectionAreas: f.zonas
          ? f.zonas.split(",").map((x) => x.trim()).filter(Boolean)
          : [],
        notes: f.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procs", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      wide
      title={`Registrar procedimiento · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Registrando…" : "Registrar"}
          </Btn>
        </>
      }
    >
      <div className="frow">
        <Field label="Procedimiento">
          <select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
            <option value="">Seleccionar…</option>
            {estServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profesional">
          <select
            value={f.professionalId}
            onChange={(e) => setF({ ...f, professionalId: e.target.value })}
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
          Sistema → Profesionales clínicos.
        </p>
      ) : null}

      {signedConsents.length === 0 ? (
        <div
          className="warn-box"
          style={{ background: "var(--err-bg)", color: "var(--err)", marginBottom: 14 }}
        >
          <Icon name="alert" size={17} />
          <div>
            <strong>Bloqueado:</strong> este paciente no tiene consentimientos firmados. Genera y
            captura la firma antes de registrar el procedimiento.
            <div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--err)", padding: "4px 0" }}
                onClick={() => {
                  onClose();
                  navigate(`/patients/${patient.id}/consentimientos`);
                }}
              >
                Ir a consentimientos →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Field label="Consentimiento firmado (obligatorio)">
          <select value={f.consentId} onChange={(e) => setF({ ...f, consentId: e.target.value })}>
            <option value="">Seleccionar consentimiento…</option>
            {signedConsents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.template?.title ?? c.id}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="frow">
        <Field label="Producto utilizado">
          <input
            value={f.productUsed}
            onChange={(e) => setF({ ...f, productUsed: e.target.value })}
            placeholder="Toxina botulínica tipo A…"
          />
        </Field>
        <Field label="Unidades / volumen">
          <input
            type="number"
            value={f.units}
            onChange={(e) => setF({ ...f, units: e.target.value })}
            placeholder="24"
          />
        </Field>
      </div>
      <div className="frow">
        <Field label="Lote">
          <input
            value={f.lotNumber}
            onChange={(e) => setF({ ...f, lotNumber: e.target.value })}
            placeholder="B7231-EC"
          />
        </Field>
        <Field label="Vencimiento">
          <input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} />
        </Field>
      </div>
      <Field label="Zonas de aplicación (separadas por coma)">
        <input
          value={f.zonas}
          onChange={(e) => setF({ ...f, zonas: e.target.value })}
          placeholder="Frente, entrecejo, patas de gallo"
        />
      </Field>
      <Field label="Notas clínicas">
        <textarea
          rows={2}
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
          placeholder="Dilución, técnica, complicaciones…"
        />
      </Field>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
