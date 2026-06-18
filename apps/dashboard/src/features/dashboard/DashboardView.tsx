import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { PageHead } from "@/components/Primitives";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/helpers";
import type { Kpis } from "@/lib/types";

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: () => api.get<Kpis>("/kpis"),
  });

  return (
    <div className="content-inner">
      <PageHead title="Dashboard" sub="Vista operativa del día" />
      <div className="kpi-row">
        <KpiCard icon="calendar" label="Citas hoy" value={isLoading ? "…" : String(data?.citasHoy ?? 0)} />
        <KpiCard icon="receipt" label="Ingresos del mes" value={isLoading ? "…" : fmtMoney(data?.ingresos ?? 0)} />
        <KpiCard icon="users" label="Pacientes registrados" value={isLoading ? "…" : String(data?.pacientes ?? 0)} />
        <KpiCard icon="alert" label="Alertas de stock" value={isLoading ? "…" : String(data?.alertas ?? 0)} />
      </div>
      <div className="card card-pad">
        <p className="card-title">Bienvenido a la build de producción</p>
        <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
          Este dashboard consume la API Express+Prisma contra PostgreSQL local. El módulo{" "}
          <strong>Pacientes</strong> está conectado end-to-end (listado + ficha 7 pestañas). El
          resto de módulos están como placeholders y se irán portando módulo por módulo desde el
          prototipo HTML.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card kpi">
      <div className="k-label">
        <Icon name={icon} size={14} />
        {label}
      </div>
      <div className="k-value">{value}</div>
    </div>
  );
}
