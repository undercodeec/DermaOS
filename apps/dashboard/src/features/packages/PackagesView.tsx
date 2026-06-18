import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge, Btn, EmptyState, PageHead } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fmtDate, fmtMoney } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import type { Package } from "@/lib/types";
import { listAllBalances, listAllPackages, updatePackage } from "./api";
import { PackageModal } from "./PackageModal";

export function PackagesView() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const canWrite = roleCanWrite(role, "paquetes");
  const qc = useQueryClient();

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);

  const { data: pkgs = [], isLoading: loadingPkg } = useQuery({
    queryKey: ["packages"],
    queryFn: listAllPackages,
  });
  const { data: balances = [], isLoading: loadingBal } = useQuery({
    queryKey: ["balances-all"],
    queryFn: listAllBalances,
  });

  const toggle = useMutation({
    mutationFn: (p: Package) => updatePackage(p.id, { active: !p.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] }),
  });

  const activeBalances = balances.filter((b) => b.status === "activo");
  const sesionesPorConsumir = activeBalances.reduce(
    (t, b) => t + (b.sessionsTotal - b.sessionsUsed),
    0,
  );
  const porCobrar = balances.reduce((t, b) => {
    const paid = (b.payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    return t + Math.max(0, Number(b.price) - paid);
  }, 0);

  return (
    <div className="content-inner">
      <PageHead
        title="Paquetes y bonos"
        sub="Define paquetes de sesiones, véndelos por paciente y descuenta al atender"
      />

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="layers" size={15} /> Bonos activos
          </div>
          <div className="k-value">{activeBalances.length}</div>
          <div className="k-foot">{balances.length} vendidos en total</div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="check" size={15} /> Sesiones por consumir
          </div>
          <div className="k-value">{sesionesPorConsumir}</div>
          <div className="k-foot">en bonos vigentes</div>
        </div>
        <div className="card kpi">
          <div className="k-label">
            <Icon name="receipt" size={15} /> Saldo por cobrar
          </div>
          <div className="k-value">{fmtMoney(porCobrar)}</div>
          <div className="k-foot">abonos pendientes</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "4px 0 12px",
        }}
      >
        <p className="card-title" style={{ margin: 0 }}>
          Catálogo de paquetes
        </p>
        {canWrite ? (
          <Btn sm icon="plus" onClick={() => setOpenNew(true)}>
            Nuevo paquete
          </Btn>
        ) : null}
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        {loadingPkg ? (
          <EmptyState icon="layers">Cargando catálogo…</EmptyState>
        ) : pkgs.length === 0 ? (
          <EmptyState icon="layers">Sin paquetes en el catálogo.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Paquete</th>
                <th>Servicio base</th>
                <th className="num">Sesiones</th>
                <th className="num">Precio</th>
                <th className="num">Por sesión</th>
                <th>Vigencia</th>
                <th>Estado</th>
                {canWrite ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {pkgs.map((pk) => (
                <tr key={pk.id}>
                  <td>
                    <strong>{pk.name}</strong>
                  </td>
                  <td>{pk.service?.name ?? "—"}</td>
                  <td className="num tnum">{pk.sessions}</td>
                  <td className="num tnum">{fmtMoney(Number(pk.price))}</td>
                  <td className="num tnum muted">
                    {fmtMoney(Number(pk.price) / pk.sessions)}
                  </td>
                  <td className="tnum">
                    {pk.validityDays} días · c/{pk.intervalDays} d
                  </td>
                  <td>
                    {canWrite ? (
                      <button
                        className={`badge ${pk.active ? "bg-ok" : "bg-neutral"}`}
                        style={{ cursor: "pointer", border: "none" }}
                        title="Activar / desactivar"
                        onClick={() => toggle.mutate(pk)}
                      >
                        {pk.active ? "Activo" : "Inactivo"}
                      </button>
                    ) : (
                      <Badge cls={pk.active ? "bg-ok" : "bg-neutral"}>
                        {pk.active ? "Activo" : "Inactivo"}
                      </Badge>
                    )}
                  </td>
                  {canWrite ? (
                    <td>
                      <Btn sm kind="ghost" icon="pen" onClick={() => setEditing(pk)}>
                        Editar
                      </Btn>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="card-title" style={{ marginBottom: 12 }}>
        Paquetes vendidos · saldo por paciente
      </p>
      {loadingBal ? (
        <div className="card">
          <EmptyState icon="layers">Cargando bonos…</EmptyState>
        </div>
      ) : balances.length === 0 ? (
        <div className="card">
          <EmptyState icon="layers">Aún no se ha vendido ningún paquete.</EmptyState>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {balances.map((b) => {
            const paid = (b.payments ?? []).reduce((t, p) => t + Number(p.amount || 0), 0);
            const econ = Number(b.price) - paid;
            const left = b.sessionsTotal - b.sessionsUsed;
            return (
              <div
                key={b.id}
                className="card card-pad rowlink"
                onClick={() => b.patient && navigate(`/patients/${b.patient.id}/paquetes`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <strong>{b.package?.name ?? "Paquete"}</strong>
                  <Badge cls={b.status === "completado" ? "bg-ok" : "bg-info"}>{b.status}</Badge>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>
                  {b.patient ? `${b.patient.firstName} ${b.patient.lastName} · CI ${b.patient.idNumber}` : "—"}
                </p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <span className="pay-k">Sesiones</span>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {b.sessionsUsed} / {b.sessionsTotal}
                    </div>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {left} por usar
                    </span>
                  </div>
                  <div>
                    <span className="pay-k">Saldo</span>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtMoney(econ)}</div>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      vendido {fmtDate(b.soldAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openNew ? <PackageModal onClose={() => setOpenNew(false)} /> : null}
      {editing ? <PackageModal initial={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
