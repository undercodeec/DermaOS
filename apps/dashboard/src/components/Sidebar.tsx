import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "./icons";
import { useAuth } from "@/lib/auth";
import { roleCan, type ModuleId } from "@/lib/permissions";
import brandLogo from "@/img/logDerma-OS.png";

interface NavItem {
  path: string;
  icon: string;
  label: string;
  mod: ModuleId;
}

const NAV_SECTIONS: { label: string; sub: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    sub: "Operación diaria",
    items: [
      { path: "/", icon: "dashboard", label: "Dashboard", mod: "reportes" },
      { path: "/agenda", icon: "calendar", label: "Agenda", mod: "agenda" },
      { path: "/patients", icon: "users", label: "Pacientes", mod: "pacientes" },
    ],
  },
  {
    label: "Clínica",
    sub: "Atención y catálogo",
    items: [
      { path: "/services", icon: "flask", label: "Servicios", mod: "servicios" },
      { path: "/procedures", icon: "syringe", label: "Procedimientos", mod: "procedimientos" },
      { path: "/packages", icon: "layers", label: "Paquetes", mod: "paquetes" },
    ],
  },
  {
    label: "Administración",
    sub: "Cobros y stock",
    items: [
      { path: "/payments", icon: "card", label: "Cobros", mod: "pagos" },
      // { path: "/billing", icon: "receipt", label: "Facturación", mod: "facturacion" }, // INVOICES_ENABLED
      { path: "/inventory", icon: "box", label: "Inventario", mod: "inventario" },
    ],
  },
  {
    label: "Sistema",
    sub: "Seguridad y accesos",
    items: [{ path: "/admin", icon: "lock", label: "Usuarios y auditoría", mod: "sistema" }],
  },
];

export function Sidebar() {
  const { profile } = useAuth();
  const role = profile?.role ?? "admin";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (p: string) =>
    p === "/" ? location.pathname === "/" : location.pathname.startsWith(p);

  const sections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((it) => roleCan(role, it.mod)),
  })).filter((sec) => sec.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img className="sb-logo" src={brandLogo} alt="DERMA-OS" />
        <div className="sb-wordmark">
          <strong>
            DERMA<span className="wm-accent">·OS</span>
          </strong>
          <span className="wm-sub">producción</span>
        </div>
      </div>
      <nav className="sb-nav">
        {sections.map((sec) => (
          <ul key={sec.label} className="menu-list">
            <li className="divider">
              <span className="label">{sec.label}</span>
              <span className="subtitle">{sec.sub}</span>
            </li>
            {sec.items.map((it) => (
              <li key={it.path}>
                <button
                  className={`m-link${isActive(it.path) ? " active" : ""}`}
                  onClick={() => navigate(it.path)}
                  aria-current={isActive(it.path) ? "page" : undefined}
                >
                  <Icon name={it.icon} size={18} />
                  <span className="m-label">{it.label}</span>
                  <Icon name="chevR" size={14} className="arrow" />
                </button>
              </li>
            ))}
          </ul>
        ))}
      </nav>
      <div className="sb-foot">
        <span className="confid">
          <Icon name="lock" size={12} /> Datos sensibles · LOPDP
        </span>
      </div>
    </aside>
  );
}
