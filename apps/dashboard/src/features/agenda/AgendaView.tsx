import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Btn, EmptyState, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { roleCanWrite } from "@/lib/permissions";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { fmtTime } from "@/lib/helpers";
import { listAppointments } from "./api";
import { listProfessionals } from "@/features/patients/api";
import { NewCitaModal } from "./NewCitaModal";
import { CitaDetalleModal } from "./CitaDetalleModal";

const AG_START = 8;
const AG_END = 18;
const AG_CELL = 48;
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  agendada: { label: "Agendada", color: "#8C7D6C", bg: "#F3EDE4" },
  confirmada: { label: "Confirmada", color: "#3E6B8C", bg: "#E9F0F5" },
  en_sala: { label: "En sala", color: "#B27A1F", bg: "#FAF0DB" },
  atendida: { label: "Atendida", color: "#3A8A5F", bg: "#E8F3EC" },
  no_show: { label: "No asistió", color: "#BE4438", bg: "#FAE8E5" },
  cancelada: { label: "Cancelada", color: "#9A8D7D", bg: "#EFEAE3" },
};

function weekStart(offset: number): Date {
  const d = new Date();
  const day = d.getDay(); // 0 dom .. 6 sab
  const diff = (day === 0 ? -6 : 1) - day; // lunes
  d.setDate(d.getDate() + diff + offset * 7);
  return startOfDay(d);
}

function isSameDay(iso: string, d: Date): boolean {
  const a = new Date(iso);
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
}

interface NewCitaSeed {
  date: string;
  time: string;
}

export function AgendaView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const canWrite = roleCanWrite(role, "agenda");

  const [weekOffset, setWeekOffset] = useState(0);
  const [prof, setProf] = useState("all");
  const [openNew, setOpenNew] = useState<NewCitaSeed | null>(null);
  const [openDetail, setOpenDetail] = useState<Appointment | null>(null);

  const start = weekStart(weekOffset);
  const days = useMemo(() => [...Array(6)].map((_, i) => addDays(start, i)), [start]);
  const hours = useMemo(
    () => [...Array(AG_END - AG_START)].map((_, i) => AG_START + i),
    [],
  );

  const from = startOfDay(start).toISOString();
  const to = endOfDay(days[5]).toISOString();

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: listProfessionals,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", from, to, prof],
    queryFn: () =>
      listAppointments({
        from,
        to,
        professionalId: prof === "all" ? undefined : prof,
      }),
  });

  const subtitle = `Semana del ${format(days[0], "d 'de' MMMM", { locale: es })}`;

  return (
    <div className="content-inner">
      <PageHead title="Agenda" sub={subtitle}>
        <select
          value={prof}
          onChange={(e) => setProf(e.target.value)}
          style={{
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "8px 10px",
            background: "#fff",
          }}
        >
          <option value="all">Todos los profesionales</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Btn icon="chevL" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior" />
        <Btn onClick={() => setWeekOffset(0)}>Hoy</Btn>
        <Btn icon="chevR" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semana siguiente" />
        {canWrite ? (
          <Btn kind="primary" icon="plus" onClick={() => setOpenNew({ date: format(days[0], "yyyy-MM-dd"), time: "09:00" })}>
            Nueva cita
          </Btn>
        ) : null}
      </PageHead>

      {isLoading ? (
        <div className="card">
          <EmptyState icon="calendar">Cargando agenda…</EmptyState>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="ag-grid">
            <div></div>
            {days.map((d, i) => {
              const isToday = isSameDay(d.toISOString(), new Date());
              return (
                <div key={i} className={`ag-dayhead${isToday ? " today" : ""}`}>
                  {DIAS_CORTO[i]} <span className="dnum">{d.getDate()}</span>
                </div>
              );
            })}
            <div>
              {hours.map((h) => (
                <div key={h} className="ag-hourcell ag-timecol" style={{ border: "none" }}>
                  {h}:00
                </div>
              ))}
            </div>
            {days.map((d, di) => (
              <div key={di} className="ag-daycol">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="ag-hourcell"
                    title={canWrite ? "Clic para agendar" : ""}
                    onClick={() => {
                      if (!canWrite) return;
                      setOpenNew({
                        date: format(d, "yyyy-MM-dd"),
                        time: `${String(h).padStart(2, "0")}:00`,
                      });
                    }}
                  />
                ))}
                {appointments
                  .filter((a) => isSameDay(a.startAt, d))
                  .map((a) => renderAppt(a, (appt) => setOpenDetail(appt)))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card card-pad mt">
        <div className="ag-legend">
          <strong style={{ fontSize: 12.5 }}>Profesional:</strong>
          {professionals.map((p) => (
            <span key={p.id}>
              <i className="ag-dot" style={{ background: p.color }} />
              {p.name}
            </span>
          ))}
          <span style={{ width: 18 }} />
          <strong style={{ fontSize: 12.5 }}>Estado:</strong>
          {(Object.entries(STATUS_META) as [AppointmentStatus, (typeof STATUS_META)[AppointmentStatus]][]).map(
            ([k, m]) => (
              <span key={k}>
                <i className="ag-dot" style={{ background: m.bg, border: `1.5px solid ${m.color}` }} />
                {m.label}
              </span>
            ),
          )}
        </div>
      </div>

      {openNew ? <NewCitaModal seed={openNew} onClose={() => setOpenNew(null)} /> : null}
      {openDetail ? (
        <CitaDetalleModal
          appointment={openDetail}
          onClose={() => setOpenDetail(null)}
        />
      ) : null}
    </div>
  );
}

function renderAppt(a: Appointment, openDetail: (appt: Appointment) => void) {
  const st = new Date(a.startAt);
  const en = new Date(a.endAt);
  const top = (st.getHours() + st.getMinutes() / 60 - AG_START) * AG_CELL;
  const h = Math.max(26, ((en.getTime() - st.getTime()) / 3.6e6) * AG_CELL - 3);
  const m = STATUS_META[a.status];
  const cancel = a.status === "cancelada" || a.status === "no_show";
  const pColor = a.professional?.color ?? m.color;
  const lastName = a.patient?.lastName?.split(" ")[0] ?? "";
  return (
    <div
      key={a.id}
      className="ag-evt"
      style={{
        top,
        height: h,
        background: cancel ? "#F4F0EA" : m.bg,
        borderColor: cancel ? "var(--border-strong)" : m.color,
        color: cancel ? "var(--ink-3)" : "var(--ink)",
        borderLeftColor: pColor,
        textDecoration: cancel ? "line-through" : "none",
      }}
      onClick={(e) => {
        e.stopPropagation();
        openDetail(a);
      }}
    >
      <strong>
        {fmtTime(a.startAt)} · {a.patient?.firstName} {lastName}
      </strong>
      <div style={{ fontSize: 12.5 }}>{a.service?.name ?? ""}</div>
      <Icon name="user" size={10} aria-hidden />
    </div>
  );
}
