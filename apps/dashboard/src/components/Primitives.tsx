import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons";

type BtnKind = "primary" | "secondary" | "ghost";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: BtnKind;
  sm?: boolean;
  icon?: string;
}

export function Btn({ kind = "secondary", sm, icon, children, className = "", ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${kind}${sm ? " btn-sm" : ""} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={sm ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function Badge({ cls = "bg-neutral", children }: { cls?: string; children: ReactNode }) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function EmptyState({ icon = "file", children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={34} />
      <div>{children}</div>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
    </div>
  );
}

export function NoAccess({ children }: { children: ReactNode }) {
  return (
    <div className="card card-pad" style={{ textAlign: "center" }}>
      <Icon name="lock" size={28} />
      <p style={{ marginTop: 8 }}>{children}</p>
    </div>
  );
}
