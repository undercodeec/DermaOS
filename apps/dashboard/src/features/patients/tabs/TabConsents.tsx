import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState, Field } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { roleCanAddConsentEvent, roleCanCaptureConsentSignature, roleCanGenerateConsent } from "@/lib/permissions";
import type { Consent } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewConsentModal } from "../modals/NewConsentModal";
import { SignConsentModal } from "../modals/SignConsentModal";
import { createConsentEvent, downloadConsentPdf } from "../api";

const STATUS_CLS: Record<string, string> = {
  pendiente: "bg-warn",
  firmado: "bg-ok",
  revocado: "bg-err",
};

export function TabConsents({ patient, role }: TabProps) {
  const [openNew, setOpenNew] = useState(false);
  const [signTarget, setSignTarget] = useState<Consent | null>(null);
  const [eventTarget, setEventTarget] = useState<Consent | null>(null);
  const canGenerate = roleCanGenerateConsent(role);
  const canCapture = roleCanCaptureConsentSignature(role);
  const canAddEvent = roleCanAddConsentEvent(role);

  const { data: cs = [], isLoading } = useQuery({
    queryKey: ["consents", patient.id],
    queryFn: () => api.get<Consent[]>(`/patients/${patient.id}/consents`),
  });

  return (
    <div>
      <div className="consent-policy-card">
        <Icon name="lock" size={20} />
        <div>
          <strong>Integridad de documentos firmados</strong>
          <p>
            Una vez firmado, el contenido, la firma y el PDF quedan bloqueados. Las correcciones, adendas o revocaciones
            se registran como eventos nuevos y nunca reemplazan el documento original.
          </p>
        </div>
      </div>
      {canGenerate ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="plus" onClick={() => setOpenNew(true)}>
            Generar consentimiento
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="pen">Cargando…</EmptyState>
        </div>
      ) : cs.length === 0 ? (
        <div className="card">
          <EmptyState icon="pen">Sin consentimientos generados.</EmptyState>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cs.map((c) => (
            <div key={c.id} className="card card-pad consent-card">
              <div className="consent-hd">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong>{c.templateTitle ?? c.template?.title ?? "Consentimiento"}</strong>
                  <span
                    className={`consent-kind ${(c.templateKind ?? c.template?.kind) === "imagen" ? "ck-imagen" : "ck-clinico"}`}
                  >
                    <Icon name={(c.templateKind ?? c.template?.kind) === "imagen" ? "camera" : "stetho"} size={12} />{" "}
                    {(c.templateKind ?? c.template?.kind) === "imagen" ? "Uso de imagen" : "Clínico"}
                    {c.templateVersion ? ` · v${c.templateVersion}` : ""}
                  </span>
                </div>
                <Badge cls={STATUS_CLS[c.status] ?? "bg-neutral"}>{c.status}</Badge>
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.55,
                  margin: "0 0 12px",
                }}
              >
                {c.templateBody ?? c.template?.body}
              </p>
              {(c.status === "firmado" || c.status === "revocado") && c.signedAt ? (
                <>
                <div className="consent-sig">
                  <div className="sig-frame">
                    <span className="signature">— firma archivada —</span>
                  </div>
                  <div className="consent-sig-meta">
                    <strong>
                      {c.patientName ?? `${patient.first_name} ${patient.last_name}`}
                    </strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      Firmado el {fmtDate(c.signedAt)} a las {fmtTime(c.signedAt)} · {c.patientIdType ?? "CI"} {c.patientIdNumber ?? patient.id_number}
                    </span>
                  </div>
                </div>
                <div className="consent-integrity">
                  <Icon name="lock" size={14} />
                  <span>Documento inmutable</span>
                  {c.contentHash ? <code title={c.contentHash}>Contenido {shortHash(c.contentHash)}</code> : <span className="muted">Registro histórico sin hash</span>}
                  {c.pdfHash ? <code title={c.pdfHash}>PDF {shortHash(c.pdfHash)}</code> : null}
                </div>
                {c.status === "revocado" ? (
                  <p className="consent-revoked-note"><strong>Revocado:</strong> {c.revocationReason}</p>
                ) : null}
                {c.events?.length ? (
                  <div className="consent-events">
                    {c.events.map((event) => (
                      <div key={event.id}>
                        <Badge cls={event.kind === "revocacion" ? "bg-err" : "bg-neutral"}>{event.kind}</Badge>
                        <span>{event.body}</span>
                        <small>{fmtDate(event.at)} · {event.createdByName} · {shortHash(event.hash)}</small>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn sm icon="file" onClick={() => downloadConsentPdf(c)}>Descargar PDF firmado</Btn>
                  {canAddEvent ? <Btn sm icon="plus" onClick={() => setEventTarget(c)}>Registrar adenda o revocación</Btn> : null}
                </div>
                </>
              ) : canCapture ? (
                <Btn kind="primary" sm icon="pen" onClick={() => setSignTarget(c)}>
                  Capturar firma del paciente
                </Btn>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {openNew ? <NewConsentModal patient={patient} onClose={() => setOpenNew(false)} /> : null}
      {signTarget ? (
        <SignConsentModal
          consent={signTarget}
          patient={patient}
          onClose={() => setSignTarget(null)}
        />
      ) : null}
      {eventTarget ? <ConsentEventModal consent={eventTarget} patientId={patient.id} onClose={() => setEventTarget(null)} /> : null}
    </div>
  );
}

function ConsentEventModal({ consent, patientId, onClose }: { consent: Consent; patientId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"adenda" | "correccion" | "revocacion">("adenda");
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: () => createConsentEvent(consent.id, { kind, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consents", patientId] });
      onClose();
    },
  });
  return (
    <Modal title="Registrar evento sin alterar el original" onClose={onClose} foot={
      <><Btn onClick={onClose}>Cancelar</Btn><Btn kind="primary" icon="check" disabled={body.trim().length < 10 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Registrando…" : "Registrar evento"}</Btn></>
    }>
      <Field label="Tipo de evento">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="adenda">Adenda informativa</option>
          <option value="correccion">Corrección documentada</option>
          {consent.status === "firmado" ? <option value="revocacion">Revocación del consentimiento</option> : null}
        </select>
      </Field>
      <Field label={kind === "revocacion" ? "Motivo de revocación" : "Detalle del evento"}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 130 }} />
      </Field>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Este registro quedará encadenado criptográficamente al documento y no podrá editarse ni eliminarse.
      </p>
      {mutation.isError ? <p className="form-error">{(mutation.error as Error).message}</p> : null}
    </Modal>
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}
