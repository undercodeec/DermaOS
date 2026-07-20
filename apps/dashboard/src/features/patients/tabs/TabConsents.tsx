import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { Consent } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { NewConsentModal } from "../modals/NewConsentModal";
import { SignConsentModal } from "../modals/SignConsentModal";
import { downloadConsentPdf } from "../api";

const STATUS_CLS: Record<string, string> = {
  pendiente: "bg-warn",
  firmado: "bg-ok",
  revocado: "bg-err",
};

export function TabConsents({ patient, role }: TabProps) {
  const [openNew, setOpenNew] = useState(false);
  const [signTarget, setSignTarget] = useState<Consent | null>(null);
  const canWrite = roleCanWrite(role, "consentimientos");

  const { data: cs = [], isLoading } = useQuery({
    queryKey: ["consents", patient.id],
    queryFn: () => api.get<Consent[]>(`/patients/${patient.id}/consents`),
  });

  return (
    <div>
      {canWrite ? (
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
              {c.status === "firmado" && c.signedAt ? (
                <>
                <div className="consent-sig">
                  <div className="sig-frame">
                    <span className="signature">— firma archivada —</span>
                  </div>
                  <div className="consent-sig-meta">
                    <strong>
                      {patient.first_name} {patient.last_name}
                    </strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      Firmado el {fmtDate(c.signedAt)} a las {fmtTime(c.signedAt)} · CI {patient.id_number}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Btn sm icon="file" onClick={() => downloadConsentPdf(c)}>Descargar PDF firmado</Btn>
                </div>
                </>
              ) : canWrite ? (
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
    </div>
  );
}
