import { useMemo, type CSSProperties } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/Primitives";
import { fmtDate } from "@/lib/helpers";
import type { ClinicalRecord, PackageBalance, Photo, Procedure } from "@/lib/types";
import type { TabProps } from "./TabProps";

type Point = { label: string; value: number };

export function TabEstadisticas({ patient }: TabProps) {
  const [procsQ, balancesQ, evolQ, photosQ] = useQueries({
    queries: [
      { queryKey: ["procs", patient.id], queryFn: () => api.get<Procedure[]>(`/patients/${patient.id}/procedures`) },
      { queryKey: ["balances", patient.id], queryFn: () => api.get<PackageBalance[]>(`/patients/${patient.id}/balances`) },
      { queryKey: ["evolucion", patient.id], queryFn: () => api.get<ClinicalRecord[]>(`/patients/${patient.id}/evolucion`) },
      { queryKey: ["photos", patient.id], queryFn: () => api.get<Photo[]>(`/patients/${patient.id}/photos`) },
    ],
  });

  const procedures = procsQ.data ?? [];
  const balances = balancesQ.data ?? [];
  const evolutions = evolQ.data ?? [];
  const photos = photosQ.data ?? [];
  const isLoading = procsQ.isLoading || balancesQ.isLoading || evolQ.isLoading || photosQ.isLoading;

  const stats = useMemo(() => {
    const servicePoints = toPoints(countBy(procedures, (p) => p.service?.name ?? "Procedimiento"));
    const areaPoints = toPoints(countBy(procedures.flatMap((p) => p.injectionAreas ?? []), (area) => area));
    const photoPoints = toPoints(countBy(photos, (p) => p.lesionTag || p.bodyArea || "Sin etiqueta"));
    const totalSessions = balances.reduce((sum, b) => sum + b.sessionsTotal, 0);
    const usedSessions = balances.reduce((sum, b) => sum + b.sessionsUsed, 0);
    const packageProgress = totalSessions > 0 ? Math.round((usedSessions / totalSessions) * 100) : 0;
    const metricRecords = [...evolutions]
      .filter((r) => r.prescription?.clinicalMetrics)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestMetrics = metricRecords.at(-1)?.prescription?.clinicalMetrics;

    return {
      servicePoints,
      areaPoints,
      photoPoints,
      totalSessions,
      usedSessions,
      packageProgress,
      pendingSessions: Math.max(totalSessions - usedSessions, 0),
      lastProcedure: procedures[0],
      lastEvolution: evolutions[0],
      latestMetrics,
      metricTrend: metricRecords.slice(-6).map((r) => ({
        label: fmtDate(r.date),
        value: r.prescription!.clinicalMetrics!.severity,
      })),
      timeline: [...procedures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    };
  }, [procedures, balances, evolutions, photos]);

  if (isLoading) {
    return (
      <div className="card">
        <EmptyState icon="dashboard">Cargando estadisticas...</EmptyState>
      </div>
    );
  }

  return (
    <div className="patient-stats">
      <div className="patient-stat-kpis">
        <Metric label="Procedimientos" value={procedures.length} />
        <Metric label="Evoluciones" value={evolutions.length} />
        <Metric label="Fotos clinicas" value={photos.length} />
        <Metric label="Paquetes activos" value={balances.filter((b) => b.status === "activo").length} />
      </div>

      <div className="patient-stat-grid">
        <section className="card chart-card">
          <p className="card-title">Evolucion por tratamiento</p>
          <p className="stat-note">Frecuencia de procedimientos aplicados al paciente.</p>
          <MiniBars points={stats.servicePoints} empty="Sin procedimientos registrados." />
        </section>
        <section className="card chart-card">
          <p className="card-title">Zonas tratadas</p>
          <p className="stat-note">Areas marcadas en procedimientos.</p>
          <MiniBars points={stats.areaPoints} empty="Sin zonas registradas." />
        </section>
        <section className="card chart-card">
          <p className="card-title">Progreso de paquetes</p>
          <p className="stat-note">Sesiones consumidas frente a sesiones vendidas.</p>
          {stats.totalSessions > 0 ? (
            <div className="package-progress">
              <div className="progress-ring" style={{ "--pct": `${stats.packageProgress}%` } as CSSProperties}>
                <span>{stats.packageProgress}%</span>
              </div>
              <div>
                <strong>
                  {stats.usedSessions} / {stats.totalSessions} sesiones
                </strong>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
                  {stats.pendingSessions} sesiones pendientes.
                </p>
              </div>
            </div>
          ) : (
            <div className="chart-empty">Sin paquetes vendidos.</div>
          )}
        </section>
        <section className="card chart-card">
          <p className="card-title">Seguimiento fotografico</p>
          <p className="stat-note">Fotos agrupadas por lesion o zona.</p>
          <MiniBars points={stats.photoPoints} empty="Sin fotos clinicas registradas." />
        </section>
      </div>

      <div className="patient-stat-grid">
        <section className="card chart-card">
          <p className="card-title">Tendencia clinica</p>
          <p className="stat-note">Severidad registrada en evoluciones recientes.</p>
          <MiniBars points={stats.metricTrend} empty="Sin metricas clinicas registradas." />
        </section>

        <section className="card card-pad">
          <p className="card-title">Timeline de tratamientos</p>
          {stats.timeline.length ? (
            <div className="mini-timeline">
              {stats.timeline.map((p) => (
                <div className="mini-timeline-row" key={p.id}>
                  <span className="dot" />
                  <div>
                    <strong>{p.service?.name ?? "Procedimiento"}</strong>
                    <p>
                      {fmtDate(p.date)}
                      {p.productUsed ? ` · ${p.productUsed}` : ""}
                      {p.units ? ` · ${p.units} U` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty">Sin tratamientos registrados.</div>
          )}
        </section>
        <section className="card card-pad">
          <p className="card-title">Lectura clinica rapida</p>
          <div className="clinical-summary">
            <SummaryRow label="Ultimo procedimiento" value={stats.lastProcedure ? `${stats.lastProcedure.service?.name ?? "Procedimiento"} · ${fmtDate(stats.lastProcedure.date)}` : "Sin registro"} />
            <SummaryRow label="Ultima evolucion" value={stats.lastEvolution ? fmtDate(stats.lastEvolution.date) : "Sin registro"} />
            <SummaryRow label="Severidad actual" value={stats.latestMetrics ? `${stats.latestMetrics.severity}/10` : "Sin registro"} />
            <SummaryRow label="Satisfaccion actual" value={stats.latestMetrics ? `${stats.latestMetrics.satisfaction}/10` : "Sin registro"} />
            <SummaryRow label="Fototipo" value={patient.background.skinType} />
            <SummaryRow label="Uso de protector" value={patient.background.usesSunscreen ? `Si${patient.background.sunscreenSpf ? ` · SPF ${patient.background.sunscreenSpf}` : ""}` : "No registrado"} />
          </div>
          <div className="measurement-note">
            Para medir respuesta clinica real, conviene registrar en cada evolucion una escala 0-10 de severidad,
            satisfaccion, dolor, inflamacion o prurito segun el tratamiento.
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card patient-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniBars({ points, empty }: { points: Point[]; empty: string }) {
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item).trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function toPoints(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}
