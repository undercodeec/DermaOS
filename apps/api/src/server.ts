import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { errorHandler } from "./lib/errors.js";
import authRouter from "./routes/auth.js";
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
import invoicesRouter from "./routes/invoices.js";
import adminRouter from "./routes/admin.js";

const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
console.log("[cors] allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(requestOrigin, callback) {
      // Allow requests with no origin (health checks, server-to-server, etc.)
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
app.use("/patients", patientsRouter);
app.use("/photos", photosRouter);
app.use("/consents", consentsRouter);
app.use("/balances", balancesRouter);
app.use("/services", servicesRouter);
app.use("/packages", packagesRouter);
app.use("/inventory", inventoryRouter);
app.use("/appointments", appointmentsRouter);
app.use("/payments", paymentsRouter);
app.use("/invoices", invoicesRouter);
app.use("/admin", adminRouter);
app.use("/", catalogRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[derma-os/api] listening on port ${env.PORT}`);
});
