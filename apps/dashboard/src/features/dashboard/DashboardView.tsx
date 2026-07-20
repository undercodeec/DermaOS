import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Btn, Field, PageHead } from "@/components/Primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtMoney } from "@/lib/helpers";
import type { ChartPoint, Kpis, ReportNote } from "@/lib/types";

const EMPTY_CHARTS = {
  ingresosPorMes: [],
  citasPorEstado: [],
  serviciosMasVendidos: [],
  pacientesNuevosPorMes: [],
};

export function DashboardView() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const today = localDate(new Date());
  const [dateFrom, setDateFrom] = useState(() => sessionStorage.getItem("dashboard-date-from") ?? today);
  const [dateTo, setDateTo] = useState(() => sessionStorage.getItem("dashboard-date-to") ?? today);
  const [showDates, setShowDates] = useState(false);
  const [view, setView] = useState<"report" | "share" | "notes" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const range = `dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
  useEffect(() => {
    sessionStorage.setItem("dashboard-date-from", dateFrom);
    sessionStorage.setItem("dashboard-date-to", dateTo);
  }, [dateFrom, dateTo]);
  const { data, isLoading } = useQuery({
    queryKey: ["kpis", dateFrom, dateTo],
    queryFn: () => api.get<Kpis>(`/kpis?${range}`),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["report-notes"],
    queryFn: () => api.get<ReportNote[]>("/report-notes"),
  });
  const sharePreview = useMutation({ mutationFn: () => api.post<void>("/reports/operational/share-preview", { dateFrom, dateTo }) });
  const createNote = useMutation({
    mutationFn: () => api.post<ReportNote>("/report-notes", { title: noteTitle, body: noteBody, dateFrom, dateTo, metricKey: "dashboard" }),
    onSuccess: () => { setNoteTitle(""); setNoteBody(""); qc.invalidateQueries({ queryKey: ["report-notes"] }); },
  });
  const updateNote = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportNote["status"] }) => api.patch<ReportNote>(`/report-notes/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-notes"] }),
  });
  const charts = data?.charts ?? EMPTY_CHARTS;
  const periodLabel = formatPeriod(dateFrom, dateTo);
  const setPreset = (preset: "today" | "yesterday" | "week" | "month" | "30days") => {
    const now = new Date();
    const end = localDate(now);
    if (preset === "today") { setDateFrom(end); setDateTo(end); }
    if (preset === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); const day = localDate(d); setDateFrom(day); setDateTo(day); }
    if (preset === "week") { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); setDateFrom(localDate(d)); setDateTo(end); }
    if (preset === "month") { setDateFrom(`${end.slice(0, 8)}01`); setDateTo(end); }
    if (preset === "30days") { const d = new Date(now); d.setDate(d.getDate() - 29); setDateFrom(localDate(d)); setDateTo(end); }
    setShowDates(false);
  };

  return (
    <div className="content-inner">
      <div className="dash-topbar">
        <PageHead title="Dashboard" sub="Vista operativa y estadistica" />
        <button className="dash-date" onClick={() => setShowDates(true)} title="Cambiar período de información">
          <Icon name="calendar" size={15} />
          {periodLabel}
        </button>
      </div>

      <div className="dash-welcome">
        <div>
          <span className="muted">Resumen del centro</span>
          <h2>Actividad clinica y financiera</h2>
          <p>Indicadores operativos para el período seleccionado.</p>
        </div>
        <div className="dash-actions">
          <button title="Preparar reporte para envío" disabled={profile?.role !== "admin"} onClick={() => { sharePreview.mutate(); setView("share"); }}><Icon name="send" size={16} /></button>
          <button title="Ver e imprimir reporte" disabled={profile?.role !== "admin"} onClick={() => setView("report")}><Icon name="file" size={16} /></button>
          <button title="Notas y alertas operativas" onClick={() => setView("notes")}><Icon name="chat" size={16} /></button>
        </div>
      </div>

      <div className="kpi-row dash-kpis">
        <KpiCard icon="calendar" label="Citas del período" value={isLoading ? "..." : String(data?.citasHoy ?? 0)} spark={charts.pacientesNuevosPorMes} />
        <KpiCard icon="receipt" label="Ingresos autorizados" value={isLoading ? "..." : fmtMoney(data?.ingresos ?? 0)} spark={charts.ingresosPorMes} />
        <KpiCard icon="users" label="Pacientes nuevos" value={isLoading ? "..." : String(data?.pacientes ?? 0)} spark={charts.pacientesNuevosPorMes} />
        <KpiCard icon="alert" label="Alertas de stock" value={isLoading ? "..." : String(data?.alertas ?? 0)} spark={charts.citasPorEstado} />
      </div>

      <section className="card chart-card dash-main-chart">
        <div className="chart-head">
          <div>
            <p className="card-title">Panel estadistico</p>
            <span>Ingresos autorizados y pacientes nuevos del período seleccionado</span>
          </div>
          <Icon name="dashboard" size={18} />
        </div>
        <ComboBars money={charts.ingresosPorMes} patients={charts.pacientesNuevosPorMes} />
      </section>

      <div className="dash-luno-grid">
        <section className="card chart-card">
          <p className="card-title">Servicios mas vendidos</p>
          <p className="stat-note">Procedimientos del período seleccionado.</p>
          <ChartBars points={charts.serviciosMasVendidos} empty="Sin procedimientos registrados." />
        </section>
        <section className="card chart-card">
          <p className="card-title">Citas por estado</p>
          <p className="stat-note">Distribución de citas del período seleccionado.</p>
          <ChartBars points={charts.citasPorEstado} empty="Sin citas registradas este mes." />
        </section>
      </div>

      <section className="card card-pad dash-table-card">
        <p className="card-title">Lectura rapida</p>
        <div className="dash-readout">
          <Readout label="Mejor mes de ingresos" value={bestPoint(charts.ingresosPorMes, "money")} />
          <Readout label="Crecimiento de pacientes" value={bestPoint(charts.pacientesNuevosPorMes, "number")} />
          <Readout label="Servicio lider" value={charts.serviciosMasVendidos[0]?.label ?? "Sin datos"} />
          <Readout label="Estado dominante" value={charts.citasPorEstado[0]?.label ?? "Sin datos"} />
        </div>
      </section>

      {showDates ? (
        <Modal title="Filtrar información del Dashboard" onClose={() => setShowDates(false)} foot={<Btn onClick={() => setShowDates(false)}>Aplicar rango</Btn>}>
          <p className="muted">Este período actualiza los indicadores, gráficos y el reporte operativo.</p>
          <div className="dash-presets">
            <button onClick={() => setPreset("today")}>Hoy</button><button onClick={() => setPreset("yesterday")}>Ayer</button><button onClick={() => setPreset("week")}>Esta semana</button><button onClick={() => setPreset("month")}>Este mes</button><button onClick={() => setPreset("30days")}>Últimos 30 días</button>
          </div>
          <div className="grid-2">
            <Field label="Desde"><input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} /></Field>
            <Field label="Hasta"><input type="date" value={dateTo} min={dateFrom} max={today} onChange={(e) => setDateTo(e.target.value)} /></Field>
          </div>
        </Modal>
      ) : null}

      {view === "report" ? <ReportModal data={data} periodLabel={periodLabel} dateFrom={dateFrom} dateTo={dateTo} onClose={() => setView(null)} /> : null}
      {view === "share" ? <ShareModal data={data} periodLabel={periodLabel} error={sharePreview.error?.message} onClose={() => setView(null)} /> : null}
      {view === "notes" ? <NotesModal notes={notes} canEdit={profile?.role === "admin"} title={noteTitle} body={noteBody} saving={createNote.isPending} error={createNote.error?.message} onTitle={setNoteTitle} onBody={setNoteBody} onCreate={() => createNote.mutate()} onToggle={(note) => updateNote.mutate({ id: note.id, status: note.status === "abierta" ? "resuelta" : "abierta" })} onClose={() => setView(null)} /> : null}
    </div>
  );
}

function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

function formatPeriod(from: string, to: string) {
  const format = (value: string) => new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
  return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}

function reportText(data: Kpis | undefined, periodLabel: string) {
  return [
    "DERMA-OS · Resumen operativo",
    `Período: ${periodLabel}`,
    `Citas: ${data?.citasHoy ?? 0}`,
    `Ingresos autorizados: ${fmtMoney(data?.ingresos ?? 0)}`,
    `Pacientes nuevos: ${data?.pacientes ?? 0}`,
    `Alertas de stock: ${data?.alertas ?? 0}`,
    "Información operativa agregada; no incluye datos clínicos ni de pacientes.",
  ].join("\n");
}

function ReportModal({ data, periodLabel, dateFrom, dateTo, onClose }: { data: Kpis | undefined; periodLabel: string; dateFrom: string; dateTo: string; onClose: () => void }) {
  const [error, setError] = useState("");
  const print = async () => {
    try {
      await api.post<void>("/reports/operational/export", { dateFrom, dateTo });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la exportación");
      return;
    }
    const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=720");
    if (!popup) return;
    popup.document.write(`<pre style="font:16px system-ui;white-space:pre-wrap;padding:32px;color:#1f2937">${escapeHtml(reportText(data, periodLabel))}</pre>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };
  return <Modal title="Reporte operativo" wide onClose={onClose} foot={<><Btn kind="secondary" onClick={onClose}>Cerrar</Btn><Btn icon="file" onClick={print}>Imprimir / guardar PDF</Btn></>}>
    <p className="muted">{periodLabel}</p>
    <div className="dash-report-grid">
      <ReportValue label="Citas" value={String(data?.citasHoy ?? 0)} />
      <ReportValue label="Ingresos autorizados" value={fmtMoney(data?.ingresos ?? 0)} />
      <ReportValue label="Pacientes nuevos" value={String(data?.pacientes ?? 0)} />
      <ReportValue label="Alertas de stock" value={String(data?.alertas ?? 0)} />
    </div>
    {error ? <p className="login-error">{error}</p> : null}
    <p className="confid"><Icon name="lock" size={14} /> Reporte agregado: no contiene diagnósticos, fotos ni datos identificativos de pacientes.</p>
  </Modal>;
}

function ShareModal({ data, periodLabel, error, onClose }: { data: Kpis | undefined; periodLabel: string; error?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = reportText(data, periodLabel);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  };
  return <Modal title="Preparar reporte para envío" onClose={onClose} foot={<><Btn kind="secondary" onClick={onClose}>Cerrar</Btn><Btn icon="send" onClick={copy}>{copied ? "Copiado" : "Copiar resumen"}</Btn></>}>
    <p className="muted">Revisa el resumen antes de compartirlo. El envío por correo o WhatsApp se habilitará al configurar un canal autorizado para la clínica.</p>
    {error ? <p className="login-error">No se pudo registrar la vista previa: {error}</p> : null}
    <pre className="dash-share-preview">{text}</pre>
  </Modal>;
}

function NotesModal({ notes, canEdit, title, body, saving, error, onTitle, onBody, onCreate, onToggle, onClose }: {
  notes: ReportNote[]; canEdit: boolean; title: string; body: string; saving: boolean; error?: string;
  onTitle: (value: string) => void; onBody: (value: string) => void; onCreate: () => void;
  onToggle: (note: ReportNote) => void; onClose: () => void;
}) {
  return <Modal title="Notas y alertas operativas" wide onClose={onClose} foot={<Btn kind="secondary" onClick={onClose}>Cerrar</Btn>}>
    {canEdit ? <div className="dash-note-form">
      <Field label="Título"><input value={title} maxLength={140} placeholder="Ej.: revisar stock de toxina" onChange={(e) => onTitle(e.target.value)} /></Field>
      <Field label="Detalle"><textarea value={body} maxLength={2000} placeholder="Acción o contexto operativo" onChange={(e) => onBody(e.target.value)} /></Field>
      {error ? <p className="login-error">{error}</p> : null}
      <Btn sm icon="plus" disabled={!title.trim() || saving} onClick={onCreate}>{saving ? "Guardando…" : "Crear nota"}</Btn>
    </div> : <p className="muted">Solo el administrador puede crear o cerrar notas operativas.</p>}
    <div className="dash-notes-list">
      {notes.length ? notes.map((note) => <div className="dash-note" key={note.id}>
        <div><strong>{note.title}</strong>{note.body ? <p>{note.body}</p> : null}<small>{note.createdByName} · {new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(note.createdAt))}</small></div>
        {canEdit ? <Btn sm kind={note.status === "abierta" ? "secondary" : "ghost"} onClick={() => onToggle(note)}>{note.status === "abierta" ? "Resolver" : "Reabrir"}</Btn> : <span className={`badge ${note.status === "abierta" ? "bg-warn" : "bg-ok"}`}>{note.status}</span>}
      </div>) : <p className="muted">No hay notas operativas todavía.</p>}
    </div>
  </Modal>;
}

function ReportValue({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function KpiCard({ icon, label, value, spark }: { icon: string; label: string; value: string; spark: ChartPoint[] }) {
  return (
    <div className="card kpi">
      <div className="k-label">
        <Icon name={icon} size={14} />
        {label}
      </div>
      <div className="k-value">{value}</div>
      <MiniSpark points={spark} />
    </div>
  );
}

function MiniSpark({ points }: { points: ChartPoint[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="mini-spark">
      {points.slice(-8).map((p) => (
        <span key={p.label} style={{ height: `${Math.max((p.value / max) * 100, 10)}%` }} />
      ))}
    </div>
  );
}

function ComboBars({ money, patients }: { money: ChartPoint[]; patients: ChartPoint[] }) {
  const max = Math.max(...money.map((p) => p.value), ...patients.map((p) => p.value), 1);
  const labels = money.length ? money : patients;
  if (!labels.some((p) => p.value > 0) && !patients.some((p) => p.value > 0)) {
    return <div className="chart-empty">Sin datos suficientes para el periodo.</div>;
  }
  return (
    <div className="combo-chart" style={{ gridTemplateColumns: `repeat(${Math.max(labels.length, 1)}, minmax(0, 1fr))` }}>
      {labels.map((m, idx) => {
        const p = patients[idx] ?? { label: m.label, value: 0 };
        return (
          <div className="combo-col" key={m.label}>
            <div className="combo-bars">
              <span className="income" style={{ height: `${Math.max((m.value / max) * 100, 5)}%` }} />
              <span className="patients" style={{ height: `${Math.max((p.value / max) * 100, 5)}%` }} />
            </div>
            <b>{m.label}</b>
          </div>
        );
      })}
    </div>
  );
}

function ChartBars({ points, empty }: { points: ChartPoint[]; empty: string }) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (!points.length || max === 0) return <div className="chart-empty">{empty}</div>;
  return (
    <div className="bar-chart">
      {points.map((p) => (
        <div className="bar-row" key={p.label}>
          <span className="bar-label" title={p.label}>{p.label}</span>
          <div className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max((p.value / max) * 100, 4)}%` }} />
          </div>
          <span className="bar-value">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function bestPoint(points: ChartPoint[], type: "money" | "number") {
  const best = [...points].sort((a, b) => b.value - a.value)[0];
  if (!best) return "Sin datos";
  return `${best.label} · ${type === "money" ? fmtMoney(best.value) : best.value}`;
}
