import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, PageHead } from "@/components/Primitives";
import { fmtMoney } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import type { Service } from "@/lib/types";
import { listAllServices, updateService } from "./api";
import { ServiceModal } from "./ServiceModal";

const CAT_LABEL: Record<string, string> = {
  consulta: "Consulta",
  tratamiento: "Tratamiento",
  procedimiento_estetico: "Procedimiento estético",
  estudio: "Estudio",
};

export function ServicesView() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const canWrite = roleCanWrite(role, "servicios");
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: listAllServices,
  });

  const toggle = useMutation({
    mutationFn: (s: Service) => updateService(s.id, { active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  return (
    <div className="content-inner">
      <PageHead
        title="Servicios"
        sub="Catálogo de prestaciones · IVA 0% (salud) · 15% (estética)"
      >
        {canWrite ? (
          <Btn kind="primary" icon="plus" onClick={() => setOpenNew(true)}>
            Nuevo servicio
          </Btn>
        ) : null}
      </PageHead>

      {isLoading ? (
        <div className="card">
          <EmptyState icon="flask">Cargando servicios…</EmptyState>
        </div>
      ) : services.length === 0 ? (
        <div className="card">
          <EmptyState icon="flask">Sin servicios registrados.</EmptyState>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Categoría</th>
                <th>Duración</th>
                <th className="num">Precio</th>
                <th>IVA</th>
                <th>Estado</th>
                {canWrite ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>
                    <Badge cls={s.category === "procedimiento_estetico" ? "bg-brand" : "bg-neutral"}>
                      {CAT_LABEL[s.category] ?? s.category}
                    </Badge>
                  </td>
                  <td className="tnum">{s.durationMin} min</td>
                  <td className="num tnum">{fmtMoney(Number(s.price))}</td>
                  <td>
                    <Badge cls={s.vatRate === 15 ? "bg-warn" : "bg-ok"}>
                      {s.vatRate === 15 ? "15%" : "0%"}
                    </Badge>
                  </td>
                  <td>
                    {canWrite ? (
                      <button
                        className={`badge ${s.active ? "bg-ok" : "bg-neutral"}`}
                        style={{ cursor: "pointer", border: "none" }}
                        title="Activar / desactivar"
                        onClick={() => toggle.mutate(s)}
                      >
                        {s.active ? "Activo" : "Inactivo"}
                      </button>
                    ) : (
                      <Badge cls={s.active ? "bg-ok" : "bg-neutral"}>
                        {s.active ? "Activo" : "Inactivo"}
                      </Badge>
                    )}
                  </td>
                  {canWrite ? (
                    <td>
                      <Btn sm kind="ghost" icon="pen" onClick={() => setEditing(s)}>
                        Editar
                      </Btn>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        Las consultas y tratamientos médicos facturan IVA 0% (servicios de salud). Los
        procedimientos estéticos facturan IVA 15%.
      </p>

      {openNew ? <ServiceModal onClose={() => setOpenNew(false)} /> : null}
      {editing ? <ServiceModal initial={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
