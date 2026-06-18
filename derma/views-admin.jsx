// DERMA-OS · M1 — Roles, permisos y auditoría: login, menú de usuario, panel admin
const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef, useMemo: aUseMemo } = React;

// ---------- Helpers visuales ----------
function userInitials(u) {
  const parts = (u.name || "").replace(/^(Dra?\.)\s*/i, "").trim().split(/\s+/);
  return ((parts[0] || "")[0] || "") + ((parts[1] || "")[0] || "");
}
function UserAvatar({ user, size = 36 }) {
  const role = ROLES[user.role];
  return (
    <span className="uavatar" style={{ width: size, height: size, fontSize: size * 0.4, background: (role ? role.color : "#888") + "22", color: role ? role.color : "#555" }}>
      {userInitials(user).toUpperCase()}
    </span>
  );
}
function RoleBadge({ role, sm }) {
  const r = ROLES[role];
  if (!r) return null;
  return <span className="role-badge" style={{ background: r.color + "1A", color: r.color, fontSize: sm ? 11 : 12 }}>{r.label}</span>;
}

// ---------- Pantalla de login ----------
function LoginScreen() {
  const s = useStore();
  const [picked, setPicked] = aUseState(null);   // usuario en paso MFA
  const [code, setCode] = aUseState("");
  const [err, setErr] = aUseState("");
  const activeUsers = s.users;

  const choose = (u) => {
    if (!u.active) { setErr("La cuenta de " + u.name + " está desactivada. Contacte al administrador."); return; }
    setErr("");
    if (u.mfaEnabled) { setPicked(u); setCode(""); }
    else A.login(u.id);
  };
  const verify = () => {
    if (code.length < 6) { setErr("Ingrese el código de 6 dígitos."); return; }
    A.login(picked.id);
  };

  return (
    <div className="login-wrap">
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-logo"><strong>DERMA<span>·OS</span></strong></div>
          <h1>El sistema operativo de tu centro dermatológico.</h1>
          <p>Historia clínica, fotos con consentimiento, agenda, inventario y facturación electrónica — con control de acceso por rol.</p>
          <ul className="login-feats">
            <li><Icon name="lock" size={16} /> Acceso basado en roles (RBAC)</li>
            <li><Icon name="check" size={16} /> Verificación en dos pasos para administradores</li>
            <li><Icon name="file" size={16} /> Auditoría de cada apertura de historia y factura</li>
          </ul>
          <span className="login-foot"><Icon name="lock" size={12} /> Datos sensibles protegidos · LOPDP Ecuador</span>
        </div>
      </div>

      <div className="login-panel">
        {!picked ? (
          <div className="login-card">
            <h2>Iniciar sesión</h2>
            <p className="muted">Demo · selecciona un usuario para entrar con su rol y ver cómo cambian los permisos.</p>
            <div className="login-users">
              {activeUsers.map(u => (
                <button key={u.id} className={`login-user${u.active ? "" : " off"}`} onClick={() => choose(u)}>
                  <UserAvatar user={u} size={40} />
                  <span className="lu-info">
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </span>
                  <span className="lu-right">
                    <RoleBadge role={u.role} sm />
                    {u.mfaEnabled ? <span className="lu-mfa"><Icon name="lock" size={11} /> MFA</span> : null}
                    {!u.active ? <span className="lu-off">Inactiva</span> : null}
                  </span>
                </button>
              ))}
            </div>
            {err ? <p className="login-err">{err}</p> : null}
          </div>
        ) : (
          <div className="login-card">
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 6, paddingLeft: 0 }} onClick={() => { setPicked(null); setErr(""); }}><Icon name="chevL" size={14} /> Volver</button>
            <h2>Verificación en dos pasos</h2>
            <div className="mfa-user"><UserAvatar user={picked} size={38} /><div><strong>{picked.name}</strong><div className="muted" style={{ fontSize: 12.5 }}>{picked.email}</div></div></div>
            <p className="muted" style={{ fontSize: 13.5 }}>Enviamos un código de 6 dígitos a la app autenticadora de <strong>{picked.name.split(" ")[0]}</strong>. Ingréselo para continuar.</p>
            <input className="mfa-input" value={code} inputMode="numeric" maxLength={6} placeholder="••••••"
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }} autoFocus />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Btn kind="primary" icon="check" disabled={code.length < 6} onClick={verify}>Verificar e ingresar</Btn>
              <button className="btn btn-ghost btn-sm" onClick={() => setCode("000000")}>Usar código demo</button>
            </div>
            {err ? <p className="login-err">{err}</p> : null}
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Demo: cualquier código de 6 dígitos es aceptado. En producción se valida contra TOTP/SMS.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Menú de usuario (header) ----------
function UserMenu() {
  const s = useStore();
  const me = SEL.currentUser(s);
  const [open, setOpen] = aUseState(false);
  const ref = aUseRef(null);
  aUseEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  if (!me) return null;
  return (
    <div className="usermenu" ref={ref}>
      <button className="usermenu-btn" onClick={() => setOpen(o => !o)}>
        <UserAvatar user={me} size={32} />
        <span className="um-meta">
          <strong>{me.name}</strong>
          <small style={{ color: ROLES[me.role].color }}>{ROLES[me.role].label}</small>
        </span>
        <Icon name="chevD" size={14} className="muted" />
      </button>
      {open ? (
        <div className="usermenu-pop">
          <div className="um-sec-label">Cambiar de usuario (demo)</div>
          {s.users.filter(u => u.active).map(u => (
            <button key={u.id} className={`um-item${u.id === me.id ? " current" : ""}`} onClick={() => { setOpen(false); if (u.id !== me.id) A.switchUser(u.id); }}>
              <UserAvatar user={u} size={28} />
              <span className="um-item-info"><strong>{u.name}</strong><small>{ROLES[u.role].label}</small></span>
              {u.id === me.id ? <Icon name="check" size={15} style={{ color: "var(--brown-700)" }} /> : null}
            </button>
          ))}
          <div className="um-divider"></div>
          {roleCan(me.role, "sistema") ? (
            <button className="um-action" onClick={() => { setOpen(false); H.nav("/admin"); }}><Icon name="lock" size={15} /> Usuarios y auditoría</button>
          ) : null}
          <button className="um-action danger" onClick={() => { setOpen(false); A.logout(); }}><Icon name="chevL" size={15} /> Cerrar sesión</button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Estado "sin permiso" (reutilizable) ----------
function NoAccess({ children }) {
  return (
    <div className="card noaccess">
      <span className="na-ring"><Icon name="lock" size={26} /></span>
      <strong>Acceso restringido</strong>
      <p className="muted">{children || "Tu rol no tiene permiso para ver esta sección. La apertura quedó registrada en la auditoría."}</p>
    </div>
  );
}

// ---------- Panel de administración ----------
function AdminView() {
  const s = useStore();
  const me = SEL.currentUser(s);
  const [tab, setTab] = aUseState("usuarios");
  const allowed = !!(me && roleCan(me.role, "sistema"));
  aUseEffect(() => { if (!allowed) A.audit("Intento de acceso denegado", "sistema", "Usuarios y auditoría"); }, [allowed]);
  if (!allowed) {
    return <div className="content-inner"><PageHead title="Sistema" /><NoAccess>Solo el rol Dueño / Admin puede administrar usuarios, permisos y auditoría.</NoAccess></div>;
  }
  const tabs = [{ id: "usuarios", label: "Usuarios" }, { id: "permisos", label: "Matriz de permisos" }, { id: "auditoria", label: "Auditoría" }];
  return (
    <div className="content-inner">
      <PageHead title="Usuarios y auditoría" sub="Control de acceso por rol, verificación en dos pasos y bitácora de actividad." />
      <div className="ptabs" style={{ marginBottom: 20 }}>
        {tabs.map(t => <button key={t.id} className={`ptab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === "usuarios" ? <UsersTab s={s} /> : tab === "permisos" ? <PermMatrix /> : <AuditTab s={s} />}
    </div>
  );
}

function UsersTab({ s }) {
  const counts = aUseMemo(() => {
    const c = {};
    s.users.forEach(u => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [s.users]);
  return (
    <div>
      <div className="role-strip">
        {Object.values(ROLES).map(r => (
          <div key={r.id} className="role-chip" style={{ borderColor: r.color + "55" }}>
            <span className="role-dot" style={{ background: r.color }}></span>
            <div><strong>{r.label}</strong><div className="muted" style={{ fontSize: 12 }}>{r.desc}</div></div>
            <span className="role-count">{counts[r.id] || 0}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <table className="tbl">
          <thead><tr><th>Usuario</th><th>Rol</th><th>MFA</th><th>Estado</th><th>Último acceso</th></tr></thead>
          <tbody>
            {s.users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <UserAvatar user={u} size={36} />
                    <div><strong>{u.name}</strong><div className="muted" style={{ fontSize: 12.5 }}>{u.email}</div></div>
                  </div>
                </td>
                <td><RoleBadge role={u.role} /></td>
                <td>
                  <button className={`toggle${u.mfaEnabled ? " on" : ""}`} onClick={() => A.toggleUserMfa(u.id)} title="Activar/desactivar MFA" aria-pressed={u.mfaEnabled}>
                    <span className="toggle-knob"></span>
                  </button>
                </td>
                <td>{u.active ? <Badge cls="bg-ok">Activa</Badge> : <Badge cls="bg-neutral">Inactiva</Badge>}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span className="muted tnum" style={{ fontSize: 13 }}>{H.fmtDate(u.lastAccess)} · {H.fmtTime(u.lastAccess)}</span>
                    <Btn sm kind="ghost" onClick={() => A.toggleUserActive(u.id)}>{u.active ? "Desactivar" : "Activar"}</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}><Icon name="lock" size={12} style={{ verticalAlign: -2 }} /> Cada cambio de permiso o de MFA queda registrado en la pestaña Auditoría.</p>
    </div>
  );
}

function permTone(v) {
  if (!v || v === "—") return "off";
  if (v === "Total") return "full";
  return "partial";
}
function PermMatrix() {
  const roles = Object.values(ROLES);
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl perm-tbl">
        <thead>
          <tr>
            <th style={{ minWidth: 170 }}>Módulo</th>
            {roles.map(r => <th key={r.id} style={{ textAlign: "center" }}><span style={{ color: r.color }}>{r.label}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {PERM_MODULES.map(m => (
            <tr key={m.id}>
              <td><strong>{m.label}</strong></td>
              {roles.map(r => {
                const v = PERM[r.id][m.id];
                return <td key={r.id} style={{ textAlign: "center" }}><span className={`perm-cell ${permTone(v)}`}>{v || "—"}</span></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ s }) {
  const [cat, setCat] = aUseState("todas");
  const logs = aUseMemo(() => {
    const list = [...s.auditLogs].sort((a, b) => b.at.localeCompare(a.at));
    return cat === "todas" ? list : list.filter(l => l.cat === cat);
  }, [s.auditLogs, cat]);
  return (
    <div>
      <div className="audit-filters">
        <button className={`afilter${cat === "todas" ? " active" : ""}`} onClick={() => setCat("todas")}>Todas</button>
        {Object.entries(AUDIT_CATS).map(([id, c]) => (
          <button key={id} className={`afilter${cat === id ? " active" : ""}`} onClick={() => setCat(id)} style={cat === id ? { borderColor: c.color, color: c.color } : null}>
            <span className="afilter-dot" style={{ background: c.color }}></span>{c.label}
          </button>
        ))}
      </div>
      <div className="card card-pad">
        <div className="audit-feed">
          {logs.map(l => {
            const u = SEL.user(s, l.userId);
            const c = AUDIT_CATS[l.cat] || AUDIT_CATS.sistema;
            return (
              <div key={l.id} className="audit-row">
                <span className="audit-cat" style={{ background: c.color }}></span>
                {u ? <UserAvatar user={u} size={32} /> : <span className="uavatar" style={{ width: 32, height: 32 }}>?</span>}
                <div className="audit-main">
                  <div className="audit-line"><strong>{u ? u.name : "Usuario"}</strong> <span className="muted">{l.action.toLowerCase()}</span> {l.label ? <span className="audit-label">{l.label}</span> : null}</div>
                  <div className="audit-meta muted">{u ? ROLES[u.role].label : ""} · {H.fmtDate(l.at)} {H.fmtTime(l.at)} · IP {l.ip}</div>
                </div>
                <span className="audit-tag" style={{ color: c.color, borderColor: c.color + "44" }}>{c.label}</span>
              </div>
            );
          })}
          {logs.length === 0 ? <EmptyState icon="file">Sin eventos para este filtro.</EmptyState> : null}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, UserMenu, UserAvatar, RoleBadge, NoAccess, AdminView });
