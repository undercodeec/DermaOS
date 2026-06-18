import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Btn, Field } from "@/components/Primitives";
import { useAuth } from "@/lib/auth";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <div className="login-screen">
      <section
        className="login-brand"
        style={{
          background:
            "linear-gradient(140deg, #00AC9A 0%, #008B7B 55%, #0D3330 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="login-brand-inner">
          <Icon name="stetho" size={36} />
          <h1>DERMA-OS · Plataforma del centro dermatológico</h1>
          <p>
            Historia clínica, agenda, paquetes, cobros Payphone y facturación SRI
            en un solo lugar. Acceso por rol con auditoría y cifrado de fotos.
          </p>
        </div>
      </section>
      <section className="login-pane">
        <div className="login-card">
          <h2>Iniciar sesión</h2>
          <p className="muted">Use sus credenciales del centro para continuar.</p>
          <form onSubmit={submit}>
            {err ? <div className="login-error">{err}</div> : null}
            <Field label="Correo electrónico">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@dermapielypelo.ec"
                required
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
            <Btn type="submit" kind="primary" icon="check" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Verificando…" : "Entrar"}
            </Btn>
          </form>
          <div className="login-help">
            Usuarios Demo:
            <br />
            <code>admin@dermapielypelo.ec</code>  contraseña común <code>derma123</code>.
          </div>
        </div>
      </section>
    </div>
  );
}
