import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { PageHead } from "@/components/Primitives";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/helpers";
import type { ChartPoint, Kpis } from "@/lib/types";

const EMPTY_CHARTS = {
  ingresosPorMes: [],
  citasPorEstado: [],
  serviciosMasVendidos: [],
  pacientesNuevosPorMes: [],
};

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: () => api.get<Kpis>("/kpis"),
  });
  const charts = data?.charts ?? EMPTY_CHARTS;
  const today = new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date());

  return (
    <div className="content-inner">
      <div className="dash-topbar">
        <PageHead title="Dashboard" sub="Vista operativa y estadistica" />
        <div className="dash-date">
          <Icon name="calendar" size={15} />
          {today}
        </div>
      </div>

      <div className="dash-welcome">
        <div>
          <span className="muted">Resumen del centro</span>
          <h2>Actividad clinica y financiera</h2>
          <p>Indicadores de agenda, pacientes, facturacion, tratamientos y seguimiento.</p>
        </div>
        <div className="dash-actions">
          <button title="Enviar reporte"><Icon name="send" size={16} /></button>
          <button title="Ver reporte"><Icon name="file" size={16} /></button>
          <button title="Comentarios"><Icon name="chat" size={16} /></button>
        </div>
      </div>

      <div className="kpi-row dash-kpis">
        <KpiCard icon="calendar" label="Citas hoy" value={isLoading ? "..." : String(data?.citasHoy ?? 0)} spark={charts.pacientesNuevosPorMes} />
        <KpiCard icon="receipt" label="Ingresos del mes" value={isLoading ? "..." : fmtMoney(data?.ingresos ?? 0)} spark={charts.ingresosPorMes} />
        <KpiCard icon="users" label="Pacientes registrados" value={isLoading ? "..." : String(data?.pacientes ?? 0)} spark={charts.pacientesNuevosPorMes} />
        <KpiCard icon="alert" label="Alertas de stock" value={isLoading ? "..." : String(data?.alertas ?? 0)} spark={charts.citasPorEstado} />
      </div>

      <section className="card chart-card dash-main-chart">
        <div className="chart-head">
          <div>
            <p className="card-title">Panel estadistico</p>
            <span>Ingresos autorizados y pacientes nuevos de los ultimos 6 meses</span>
          </div>
          <Icon name="dashboard" size={18} />
        </div>
        <ComboBars money={charts.ingresosPorMes} patients={charts.pacientesNuevosPorMes} />
      </section>

      <div className="dash-luno-grid">
        <section className="card chart-card">
          <p className="card-title">Servicios mas vendidos</p>
          <p className="stat-note">Procedimientos de los ultimos 6 meses.</p>
          <ChartBars points={charts.serviciosMasVendidos} empty="Sin procedimientos registrados." />
        </section>
        <section className="card chart-card">
          <p className="card-title">Citas por estado</p>
          <p className="stat-note">Distribucion del mes actual.</p>
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
    </div>
  );
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
    <div className="combo-chart">
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
