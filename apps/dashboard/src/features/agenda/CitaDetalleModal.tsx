import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge, Btn } from "@/components/Primitives";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/icons";
import { fmtDateLong, fmtMoney, fmtTime } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { roleCanWrite } from "@/lib/permissions";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { getCoverage, patchAppointment } from "./api";
import { STATUS_META } from "./AgendaView";

const FLOW: AppointmentStatus[] = ["agendada", "confirmada", "en_sala", "atendida"];
const KIND_LABEL: Record<string, string> = {
  consulta_nueva: "Consulta nueva",
  control: "Control",
  procedimiento: "Procedimiento",
};

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

export function CitaDetalleModal({ appointment: a, onClose }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canWrite = roleCanWrite(profile?.role ?? "admin", "agenda");

  const { data: cov } = useQuery({
    queryKey: ["appointment-coverage", a.id],
    queryFn: () => getCoverage(a.id),
  });

  const setStatus = useMutation({
    mutationFn: (status: AppointmentStatus) => patchAppointment(a.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-coverage", a.id] });
      qc.invalidateQueries({ queryKey: ["balances-all"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
    },
  });

  const m = STATUS_META[a.status];
  const next = FLOW[FLOW.indexOf(a.status) + 1];
  const fullName = `${a.patient?.firstName ?? ""} ${a.patient?.lastName ?? ""}`.trim();

  return (
    <Modal
      title="Detalle de cita"
      onClose={onClose}
      foot={
        canWrite ? (
          <>
            {a.status !== "atendida" && a.status !== "cancelada" && a.status !== "no_show" ? (
              <>
                <Btn sm onClick={() => setStatus.mutate("no_show")}>No asistió</Btn>
                <Btn sm onClick={() => setStatus.mutate("cancelada")}>Cancelar cita</Btn>
              </>
            ) : null}
            {next ? (
              <Btn
                kind="primary"
                sm
                icon="check"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate(next)}
              >
                Marcar {STATUS_META[next].label.toLowerCase()}
              </Btn>
            ) : null}
          </>
        ) : null
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div className="avatar">{(a.patient?.firstName?.[0] ?? "?") + (a.patient?.lastName?.[0] ?? "")}</div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 16 }}>{fullName || "—"}</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {a.patient ? `CI ${a.patient.idNumber}` : ""}
          </div>
        </div>
        <Badge cls="bg-neutral">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
            {m.label}
          </span>
        </Badge>
      </div>

      <table className="tbl" style={{ fontSize: 14 }}>
        <tbody>
          <tr>
            <td className="muted" style={{ width: 130 }}>Fecha</td>
            <td>{fmtDateLong(a.startAt)}</td>
          </tr>
          <tr>
            <td className="muted">Hora</td>
            <td className="tnum">
              {fmtTime(a.startAt)} – {fmtTime(a.endAt)}
            </td>
          </tr>
          <tr>
            <td className="muted">Servicio</td>
            <td>
              {a.service?.name ?? "—"}{" "}
              <span className="muted">· {a.service ? fmtMoney(Number(a.service.price)) : ""}</span>
            </td>
          </tr>
          <tr>
            <td className="muted">Tipo</td>
            <td>{KIND_LABEL[a.kind] ?? a.kind}</td>
          </tr>
          <tr>
            <td className="muted">Profesional</td>
            <td>{a.professional?.name ?? "—"}</td>
          </tr>
          {a.notes ? (
            <tr>
              <td className="muted">Notas</td>
              <td>{a.notes}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <Btn
          sm
          kind="ghost"
          icon="user"
          onClick={() => {
            onClose();
            navigate(`/patients/${a.patientId}/antecedentes`);
          }}
        >
          Abrir ficha del paciente →
        </Btn>
      </div>

      {cov?.consumed ? (
        <div
          className="warn-box"
          style={{ background: "var(--ok-bg, #E8F3EC)", color: "var(--ok, #3A8A5F)", marginTop: 12 }}
        >
          <Icon name="layers" size={16} />
          <span>
            Se descontó <strong>1 sesión</strong> del paquete{" "}
            <strong>{cov.packageName}</strong> al atender esta cita · quedan{" "}
            <strong>{(cov.sessionsTotal ?? 0) - (cov.sessionsUsed ?? 0)}</strong> de{" "}
            {cov.sessionsTotal}.
          </span>
        </div>
      ) : cov?.cover ? (
        <div
          className="warn-box"
          style={{ background: "var(--cream, #F6EFE3)", color: "var(--brown-800, #4A2E1A)", marginTop: 12 }}
        >
          <Icon name="layers" size={16} />
          <span>
            Cubierta por el paquete <strong>{cov.cover.packageName}</strong> (
            {cov.cover.sessionsLeft} sesiones disponibles). Se descontará una sesión al marcar{" "}
            <strong>Atendida</strong>.
          </span>
        </div>
      ) : null}
    </Modal>
  );
}
