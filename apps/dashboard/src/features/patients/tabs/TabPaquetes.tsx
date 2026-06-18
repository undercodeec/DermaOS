import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Btn, EmptyState } from "@/components/Primitives";
import { fmtDate, fmtMoney } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { PackageBalance } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { SellPackageModal } from "../modals/SellPackageModal";
import { AbonoModal } from "../modals/AbonoModal";

interface Row extends PackageBalance {
  paid: number;
}

export function TabPaquetes({ patient, role }: TabProps) {
  const [openSell, setOpenSell] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<Row | null>(null);
  const canWrite = roleCanWrite(role, "paquetes");

  const { data = [], isLoading } = useQuery({
    queryKey: ["balances", patient.id],
    queryFn: async () => {
      const list = await api.get<PackageBalance[]>(`/patients/${patient.id}/balances`);
      return list.map<Row>((b) => ({
        ...b,
        paid: (b.payments ?? []).reduce((t, x) => t + Number(x.amount || 0), 0),
      }));
    },
  });

  return (
    <div>
      {canWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn kind="primary" icon="layers" onClick={() => setOpenSell(true)}>
            Vender paquete
          </Btn>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <EmptyState icon="layers">Cargando…</EmptyState>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState icon="layers">Sin paquetes activos.</EmptyState>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {data.map((b) => {
            const sessionsLeft = b.sessionsTotal - b.sessionsUsed;
            const econLeft = Number(b.price) - b.paid;
            return (
              <div key={b.id} className="card card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong>{b.package?.name ?? "Paquete"}</strong>
                  <Badge cls={b.status === "completado" ? "bg-ok" : "bg-info"}>{b.status}</Badge>
                </div>
                <p className="muted" style={{ fontSize: 12.5, margin: "0 0 10px" }}>
                  Vendido {fmtDate(b.soldAt)} · Vence {fmtDate(b.vencimiento)}
                </p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <span className="pay-k">Sesiones</span>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {b.sessionsUsed} / {b.sessionsTotal}
                    </div>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {sessionsLeft} por usar
                    </span>
                  </div>
                  <div>
                    <span className="pay-k">Saldo</span>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtMoney(econLeft)}</div>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      pagado {fmtMoney(b.paid)} / {fmtMoney(Number(b.price))}
                    </span>
                  </div>
                </div>
                {canWrite && econLeft > 0 ? (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <Btn sm icon="receipt" onClick={() => setAbonoTarget(b)}>
                      Registrar abono
                    </Btn>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {openSell ? <SellPackageModal patient={patient} onClose={() => setOpenSell(false)} /> : null}
      {abonoTarget ? (
        <AbonoModal
          patient={patient}
          balance={abonoTarget}
          onClose={() => setAbonoTarget(null)}
        />
      ) : null}
    </div>
  );
}
