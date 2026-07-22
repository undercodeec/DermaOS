import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { Badge, EmptyState, NoAccess } from "@/components/Primitives";
import { fullName, initials, age } from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { roleCan, ROLES, type ModuleId } from "@/lib/permissions";
import { getPatient, getPatientCounts } from "./api";
import { TabAntecedentes } from "./tabs/TabAntecedentes";
import { TabEstadisticas } from "./tabs/TabEstadisticas";
import { TabEvolucion } from "./tabs/TabEvolucion";
import { TabRecetas } from "./tabs/TabRecetas";
import { TabFotos } from "./tabs/TabFotos";
import { TabConsents } from "./tabs/TabConsents";
import { TabProcs } from "./tabs/TabProcs";
import { TabPaquetes } from "./tabs/TabPaquetes";
import { ClinicalFileModal } from "./ClinicalFileModal";
// import { TabFacturas } from "./tabs/TabFacturas"; // INVOICES_ENABLED

const TABS = [
  { id: "antecedentes", label: "Antecedentes" },
  { id: "estadisticas", label: "Estadisticas" },
  { id: "evolucion", label: "Evolucion" },
  { id: "recetas", label: "Recetas" },
  { id: "fotos", label: "Fotos" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "procedimientos", label: "Procedimientos" },
  { id: "paquetes", label: "Paquetes" },
  // { id: "facturas", label: "Facturas" }, // INVOICES_ENABLED
] as const;

const TAB_MOD: Record<(typeof TABS)[number]["id"], ModuleId> = {
  antecedentes: "pacientes",
  estadisticas: "pacientes",
  evolucion: "historia",
  recetas: "historia",
  fotos: "fotos",
  consentimientos: "consentimientos",
  procedimientos: "procedimientos",
  paquetes: "paquetes",
  // facturas: "facturacion", // INVOICES_ENABLED
};

export function PatientDetail() {
  const { id = "", tab = "antecedentes" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const [clinicalFileOpen, setClinicalFileOpen] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
    enabled: !!id,
  });

  const { data: counts } = useQuery({
    queryKey: ["patient-counts", id],
    queryFn: () => getPatientCounts(id),
    enabled: !!id,
  });

  const tabAllowed = (t: string) => roleCan(role, TAB_MOD[t as keyof typeof TAB_MOD] ?? "pacientes");

  if (isLoading) {
    return (
      <div className="content-inner">
        <EmptyState icon="users">Cargando paciente...</EmptyState>
      </div>
    );
  }
  if (!patient) {
    return (
      <div className="content-inner">
        <EmptyState icon="users">Paciente no encontrado.</EmptyState>
      </div>
    );
  }

  const visibleTabs = TABS.filter((t) => tabAllowed(t.id));
  const TabBody =
    {
      antecedentes: TabAntecedentes,
      estadisticas: TabEstadisticas,
      evolucion: TabEvolucion,
      recetas: TabRecetas,
      fotos: TabFotos,
      consentimientos: TabConsents,
      procedimientos: TabProcs,
      paquetes: TabPaquetes,
      // facturas: TabFacturas, // INVOICES_ENABLED
    }[tab as (typeof TABS)[number]["id"]] ?? TabAntecedentes;

  return (
    <div className="content-inner">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => navigate("/patients")}>
        <Icon name="chevL" size={14} /> Pacientes
      </button>
      <div className="card card-pad" style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
          {initials(patient)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 23 }}>
            {fullName(patient)}
          </h1>
          <p className="page-sub">
            {age(patient.birth_date)} anos · {patient.sex === "F" ? "Femenino" : patient.sex === "M" ? "Masculino" : "Otro"} · CI{" "}
            {patient.id_number} · {patient.city ?? "-"} · {patient.phone ?? "-"}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {(role === "admin" || role === "profesional") ? (
            <button className="btn btn-primary btn-sm" onClick={() => setClinicalFileOpen(true)}>
              <Icon name="file" size={14} /> Ficha clínica
            </button>
          ) : null}
          <div className="chips">
            <Badge cls="bg-brand">Fototipo {patient.background.skinType}</Badge>
            {patient.background.allergies.map((a) => (
              <Badge key={a} cls="bg-err">
                <Icon name="alert" size={12} /> {a}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="ptabs">
        {visibleTabs.map((t) => {
          const c = (counts as Record<string, number> | undefined)?.[t.id] ?? 0;
          return (
            <button key={t.id} className={`ptab${tab === t.id ? " active" : ""}`} onClick={() => navigate(`/patients/${patient.id}/${t.id}`)}>
              {t.label}
              {c > 0 ? ` (${c})` : ""}
            </button>
          );
        })}
      </div>

      {tabAllowed(tab) ? (
        <TabBody patient={patient} role={role} />
      ) : (
        <NoAccess>
          El rol <strong>{ROLES[role].label}</strong> no puede abrir esta seccion. Intento registrado en la auditoria.
        </NoAccess>
      )}
      {clinicalFileOpen ? <ClinicalFileModal patient={patient} role={role} onClose={() => setClinicalFileOpen(false)} /> : null}
    </div>
  );
}
