import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { errorHandler } from "./lib/errors.js";
import authRouter from "./routes/auth.js";
import clinicsRouter from "./routes/clinics.js";
import patientsRouter from "./routes/patients.js";
import photosRouter from "./routes/photos.js";
import catalogRouter from "./routes/catalog.js";
import consentsRouter from "./routes/consents.js";
import balancesRouter from "./routes/balances.js";
import servicesRouter from "./routes/services.js";
import packagesRouter from "./routes/packages.js";
import inventoryRouter from "./routes/inventory.js";
import appointmentsRouter from "./routes/appointments.js";
import paymentsRouter from "./routes/payments.js";
// import invoicesRouter from "./routes/invoices.js"; // INVOICES_ENABLED
import adminRouter from "./routes/admin.js";
import platformRouter from "./routes/platform.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
console.log("[cors] allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (!requestOrigin) return callback(null, true);
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      console.warn(`[cors] BLOCKED origin: "${requestOrigin}"`);
      return callback(new Error(`Origin ${requestOrigin} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/auth", authRouter);
app.use("/clinics", clinicsRouter);
app.use("/patients", patientsRouter);
app.use("/photos", photosRouter);
app.use("/consents", consentsRouter);
app.use("/balances", balancesRouter);
app.use("/services", servicesRouter);
app.use("/packages", packagesRouter);
app.use("/inventory", inventoryRouter);
app.use("/appointments", appointmentsRouter);
app.use("/payments", paymentsRouter);
// app.use("/invoices", invoicesRouter); // INVOICES_ENABLED — pendiente integración SRI
app.use("/admin", adminRouter);
app.use("/platform", platformRouter);
app.use("/", catalogRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[derma-os/api] listening on port ${env.PORT}`);
});
