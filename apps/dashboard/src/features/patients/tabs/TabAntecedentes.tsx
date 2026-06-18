import type { TabProps } from "./TabProps";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="soap-row">
      <span className="soap-k">{k}</span>
      <span>{v}</span>
    </div>
  );
}

const li = (arr?: string[]) => (arr && arr.length ? arr.join(" · ") : "Sin registro");

export function TabAntecedentes({ patient }: TabProps) {
  const b = patient.background;
  return (
    <div className="grid-2">
      <div className="card card-pad">
        <p className="card-title">Perfil dermatológico</p>
        <Row k="Fototipo" v={`Fitzpatrick ${b.skinType}`} />
        <Row
          k="Fotoprotector"
          v={b.usesSunscreen ? `Sí · SPF ${b.sunscreenSpf ?? "?"}` : "No usa"}
        />
        <Row k="Tabaquismo" v={b.smoker ? "Fumador/a" : "No"} />
        <Row k="Hist. dermat." v={li(b.dermatologicalHistory)} />
        {b.notes ? <Row k="Notas" v={b.notes} /> : null}
      </div>
      <div className="card card-pad">
        <p className="card-title">Antecedentes médicos</p>
        <Row
          k="Alergias"
          v={b.allergies.length ? b.allergies.join(" · ") : "Ninguna conocida"}
        />
        <Row k="Crónicos" v={li(b.chronicConditions)} />
        <Row k="Medicación" v={li(b.currentMedications)} />
        <Row k="Familiares" v={li(b.familyHistory)} />
      </div>
    </div>
  );
}
