import { useState, type FormEvent } from "react";
import { Btn, Field } from "@/components/Primitives";
import { useAuth } from "@/lib/auth";
import brandImage from "@/img/DermaOS.png";

type Step =
  | { kind: "credentials" }
  | { kind: "register" }
  | { kind: "register-code"; emailMasked?: string }
  | { kind: "email-code"; emailMasked?: string }
  | { kind: "password-reset" }
  | { kind: "password-reset-code" };

const initialRegister = {
  clinicName: "",
  ruc: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export function LoginScreen() {
  const { signIn, signUp, verifyRegistration, requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [register, setRegister] = useState(initialRegister);
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openRegister = () => {
    setStep({ kind: "register" });
    setErr(null);
  };

  const resetToCreds = () => {
    setStep({ kind: "credentials" });
    setEmailCode("");
    setNewPassword("");
    setPasswordConfirmation("");
    setNotice(null);
    setErr(null);
  };

  const openPasswordReset = () => {
    setStep({ kind: "password-reset" });
    setEmailCode("");
    setNewPassword("");
    setPasswordConfirmation("");
    setNotice(null);
    setErr(null);
  };

  const submitPasswordResetRequest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setStep({ kind: "password-reset-code" });
  };

  const resendPasswordResetCode = async () => {
    setBusy(true);
    setErr(null);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (!r.ok) setErr(r.error);
  };

  const submitPasswordResetConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== passwordConfirmation) {
      setErr("Las contrasenas no coinciden");
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await confirmPasswordReset(email, emailCode, newPassword);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setPassword("");
    setNotice("Contrasena actualizada. Ya puede iniciar sesion.");
    setStep({ kind: "credentials" });
    setEmailCode("");
    setNewPassword("");
    setPasswordConfirmation("");
  };

  const submitCreds = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok) return;
    if ("emailVerificationRequired" in r) {
      setStep({ kind: "email-code", emailMasked: r.emailMasked });
      setEmailCode("");
    } else {
      setErr(r.error);
    }
  };

  const submitEmailCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password, emailCode);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signUp(register);
    setBusy(false);
    if (r.ok) return;
    if ("emailVerificationRequired" in r) {
      setStep({ kind: "register-code", emailMasked: r.emailMasked });
      setEmailCode("");
    } else {
      setErr(r.error);
    }
  };

  const submitRegisterCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await verifyRegistration(register.adminEmail, emailCode);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  return (
    <div className="login-screen">
      <section
        className="login-brand"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={brandImage}
          alt="DERMA-OS"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </section>
      <section className="login-pane">
        <div className="login-card">
          {step.kind === "credentials" ? (
            <>
              <h2>Iniciar sesion</h2>
              <p className="muted">Use sus credenciales del centro para continuar.</p>
              <form onSubmit={submitCreds}>
                {err ? <div className="login-error">{err}</div> : null}
                {notice ? <div className="login-notice">{notice}</div> : null}
                <Field label="Correo electronico">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dermapielypelo.ec"
                    required
                  />
                </Field>
                <p className="login-forgot">
                  <button type="button" className="login-link" onClick={openPasswordReset}>
                    Olvide mi contrasena
                  </button>
                </p>
                <Field label="Contrasena">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando..." : "Entrar"}
                </Btn>
              </form>
              <p className="login-switch">
                Aun no tienes una cuenta registrada?{" "}
                <button type="button" className="login-link" onClick={openRegister}>
                  Registrate
                </button>
              </p>

            </>
          ) : null}

          {step.kind === "register" ? (
            <>
              <h2>Registro de usuario</h2>
              <p className="muted">Cree la cuenta principal de su clinica con el mismo acceso al sistema.</p>
              <form onSubmit={submitRegister}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Nombre de la clinica">
                  <input
                    value={register.clinicName}
                    onChange={(e) => setRegister((s) => ({ ...s, clinicName: e.target.value }))}
                    placeholder="Clinica Dermapiel"
                    required
                  />
                </Field>
                <Field label="RUC (opcional)">
                  <input
                    value={register.ruc}
                    onChange={(e) => setRegister((s) => ({ ...s, ruc: e.target.value }))}
                    placeholder="1790012345001"
                  />
                </Field>
                <Field label="Nombre del administrador">
                  <input
                    value={register.adminName}
                    onChange={(e) => setRegister((s) => ({ ...s, adminName: e.target.value }))}
                    placeholder="Dra. Maria Perez"
                    required
                  />
                </Field>
                <Field label="Correo electronico">
                  <input
                    type="email"
                    autoComplete="email"
                    value={register.adminEmail}
                    onChange={(e) => setRegister((s) => ({ ...s, adminEmail: e.target.value }))}
                    placeholder="admin@clinica.com"
                    required
                  />
                </Field>
                <Field label="Contrasena">
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={register.adminPassword}
                    onChange={(e) => setRegister((s) => ({ ...s, adminPassword: e.target.value }))}
                    placeholder="Minimo 8 caracteres"
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Creando cuenta..." : "Crear cuenta"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver a iniciar sesion
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "register-code" ? (
            <>
              <h2>Verifica tu correo</h2>
              <p className="muted">
                Enviamos un codigo de 6 digitos a <strong>{step.emailMasked ?? register.adminEmail}</strong>.
                Al validarlo se activara tu demo de 7 dias.
              </p>
              <form onSubmit={submitRegisterCode}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Codigo de verificacion">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || emailCode.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Activando demo..." : "Verificar y entrar"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "email-code" ? (
            <>
              <h2>Verificacion por correo</h2>
              <p className="muted">
                Introduzca el codigo de 6 digitos enviado a <strong>{step.emailMasked ?? email}</strong>.
              </p>
              <form onSubmit={submitEmailCode}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Codigo de verificacion">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || emailCode.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando..." : "Verificar y entrar"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={() => void submitCreds()}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Reenviar codigo
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "password-reset" ? (
            <>
              <h2>Recuperar contrasena</h2>
              <p className="muted">Ingrese el correo asociado a su cuenta. Le enviaremos un codigo de 6 digitos.</p>
              <form onSubmit={submitPasswordResetRequest}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Correo electronico">
                  <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@clinica.com" required />
                </Field>
                <Btn type="submit" kind="primary" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
                  {busy ? "Enviando..." : "Enviar codigo"}
                </Btn>
                <Btn type="button" kind="ghost" onClick={resetToCreds} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Volver a iniciar sesion
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "password-reset-code" ? (
            <>
              <h2>Cree una nueva contrasena</h2>
              <p className="muted">Ingrese el codigo enviado a <strong>{email}</strong> y defina su nueva contrasena.</p>
              <form onSubmit={submitPasswordResetConfirm}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Codigo de recuperacion">
                  <input inputMode="numeric" pattern="\d{6}" maxLength={6} autoFocus value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }} required />
                </Field>
                <Field label="Nueva contrasena">
                  <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimo 8 caracteres" required />
                </Field>
                <Field label="Confirmar nueva contrasena">
                  <input type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="Repita la contrasena" required />
                </Field>
                <Btn type="submit" kind="primary" disabled={busy || emailCode.length !== 6} style={{ width: "100%", justifyContent: "center" }}>
                  {busy ? "Actualizando..." : "Actualizar contrasena"}
                </Btn>
                <Btn type="button" kind="ghost" onClick={() => void resendPasswordResetCode()} disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Reenviar codigo
                </Btn>
                <Btn type="button" kind="ghost" onClick={resetToCreds} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Cancelar
                </Btn>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
