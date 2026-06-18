import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fmtDateLong, fullName } from "@/lib/helpers";
import { ROLES } from "@/lib/permissions";
import type { SearchPatient } from "@/lib/types";

export function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: results = [] } = useQuery({
    queryKey: ["patients-search", q],
    enabled: q.trim().length >= 2,
    queryFn: () =>
      api.get<SearchPatient[]>(`/search/patients?q=${encodeURIComponent(q.trim())}`),
  });

  const me = profile;
  const roleMeta = useMemo(() => (me ? ROLES[me.role] : null), [me]);

  return (
    <header className="header">
      <div className="hd-search">
        <Icon name="search" size={17} />
        <input
          placeholder="Buscar paciente por nombre o cédula…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {results.length > 0 ? (
          <div className="hd-results">
            {results.map((p) => (
              <button
                key={p.id}
                className="hd-result"
                onClick={() => {
                  setQ("");
                  navigate(`/patients/${p.id}/antecedentes`);
                }}
              >
                <span>{fullName(p)}</span>
                <small>{p.id_number}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="hd-spacer" />
      <span className="hd-date">{fmtDateLong(new Date())}</span>
      <div className="hd-userdivider" />
      <div style={{ position: "relative" }}>
        <button className="hd-user" onClick={() => setMenuOpen((v) => !v)}>
          <span className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
            {me ? me.fullName.split(" ").map((s) => s[0]).join("").slice(0, 2) : "?"}
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{me?.fullName ?? "—"}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{roleMeta?.label ?? ""}</div>
          </div>
          <Icon name="chevD" size={13} />
        </button>
        {menuOpen ? (
          <div className="hd-menu">
            <button onClick={() => { setMenuOpen(false); signOut(); }}>
              <Icon name="lock" size={14} /> Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
