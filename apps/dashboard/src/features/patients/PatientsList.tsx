import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/icons";
import { Badge, Btn, EmptyState, PageHead } from "@/components/Primitives";
import { fmtDate, fmtTime, fullName, age } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { listPatients } from "./api";
import { NewPatientModal } from "./NewPatientModal";

export function PatientsList() {
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: () => listPatients(q),
  });

  return (
    <div className="content-inner">
      <PageHead title="Pacientes" sub={`${list.length} registrados`}>
        {profile && roleCan(profile.role, "pacientes") ? (
          <Btn kind="primary" icon="plus" onClick={() => setShowNew(true)}>
            Nuevo paciente
          </Btn>
        ) : null}
      </PageHead>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <div className="hd-search" style={{ width: 340 }}>
            <Icon name="search" size={17} />
            <input
              placeholder="Filtrar por nombre o cédula…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Cédula</th>
              <th>Edad</th>
              <th>Fototipo</th>
              <th>Alergias</th>
              <th>Próxima cita</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                className="rowlink"
                onClick={() => navigate(`/patients/${p.id}/antecedentes`)}
              >
                <td>
                  <strong>{fullName(p)}</strong>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {p.city ?? "—"} · {p.phone ?? "—"}
                  </div>
                </td>
                <td className="tnum">{p.id_number}</td>
                <td className="tnum">{age(p.birth_date)}</td>
                <td>
                  <Badge cls="bg-brand">{p.background.skinType}</Badge>
                </td>
                <td>
                  {p.background.allergies.length ? (
                    <Badge cls="bg-err">{p.background.allergies.join(", ")}</Badge>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="tnum">
                  {p.next_appointment && new Date(p.next_appointment) >= new Date(new Date().toDateString())
                    ? `${fmtDate(p.next_appointment)} ${fmtTime(p.next_appointment)}`
                    : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
            {!isLoading && list.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon="users">Sin resultados para «{q}».</EmptyState>
                </td>
              </tr>
            ) : null}
            {isLoading ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon="users">Cargando…</EmptyState>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showNew ? <NewPatientModal onClose={() => setShowNew(false)} /> : null}
    </div>
  );
}
