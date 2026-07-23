import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;

function crc32(value: Buffer) {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createTestPng(width = 100, height = 30) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const offset = row * (width * 4 + 1);
    for (let pixel = 0; pixel < width; pixel += 1) scanlines[offset + 1 + pixel * 4 + 3] = 255;
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

test("HTTP/BD: aislamiento, roles y concurrencia", { skip: !integrationDatabaseUrl }, async (t) => {
  const databaseUrl = new URL(integrationDatabaseUrl!);
  if (!/(test|smoke|integration)/i.test(decodeURIComponent(databaseUrl.pathname))) {
    throw new Error("INTEGRATION_DATABASE_URL debe apuntar a una base cuyo nombre contenga test, smoke o integration");
  }

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = integrationDatabaseUrl!;
  process.env.DIRECT_URL = integrationDatabaseUrl!;
  process.env.JWT_SECRET ||= "integration-jwt-secret-at-least-32-characters";
  process.env.PLATFORM_REGISTER_KEY ||= "integration-register-key-at-least-32-characters";
  process.env.PAYPHONE_CREDENTIAL_KEY ||= "integration-payphone-key-at-least-32-characters";
  process.env.PLATFORM_ADMIN_PASSWORD ||= "integration-platform-password";
  process.env.PLATFORM_JWT_SECRET ||= "integration-platform-jwt-secret-at-least-32-characters";
  process.env.CORS_ORIGIN ||= "http://localhost:5173";
  const uploadDir = await mkdtemp(join(tmpdir(), "derma-os-integration-"));
  process.env.UPLOAD_DIR = uploadDir;

  const [{ app }, { prisma }, { signToken }, { ALL_MODULES }] = await Promise.all([
    import("../app.js"),
    import("../db.js"),
    import("../lib/jwt.js"),
    import("../lib/entitlements.js"),
  ]);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clinicOne = await prisma.clinic.create({ data: { name: `Integracion Uno ${suffix}` } });
  const clinicTwo = await prisma.clinic.create({ data: { name: `Integracion Dos ${suffix}` } });
  await prisma.clinicSubscription.createMany({
    data: [clinicOne.id, clinicTwo.id].map((clinicId) => ({
      clinicId,
      status: "active",
      verifiedAt: new Date(),
      subscriptionEndsAt: new Date(Date.now() + 86_400_000),
      allowedModules: ALL_MODULES,
    })),
  });

  const professionalOne = await prisma.professional.create({
    data: { clinicId: clinicOne.id, name: "Dra. Integracion", registrationNo: `REG-${suffix}` },
  });
  const professionalTwo = await prisma.professional.create({
    data: { clinicId: clinicTwo.id, name: "Dr. Otra Clinica", registrationNo: `REG2-${suffix}` },
  });
  const roles = ["admin", "profesional", "recepcion", "esteticista", "contador"] as const;
  const users = await Promise.all(roles.map((role) => prisma.user.create({
    data: {
      clinicId: clinicOne.id,
      fullName: `Usuario ${role}`,
      email: `${role}.${suffix}@integration.test`,
      passwordHash: "integration-only",
      role,
      professionalId: role === "profesional" ? professionalOne.id : null,
    },
  })));
  const adminTwo = await prisma.user.create({
    data: {
      clinicId: clinicTwo.id,
      fullName: "Admin dos",
      email: `admin2.${suffix}@integration.test`,
      passwordHash: "integration-only",
      role: "admin",
    },
  });
  const unlinkedProfessionalUser = await prisma.user.create({
    data: {
      clinicId: clinicOne.id,
      fullName: "Profesional pendiente de perfil",
      email: `perfil.${suffix}@integration.test`,
      passwordHash: "integration-only",
      role: "profesional",
    },
  });

  const background = {
    skinType: "III",
    usesSunscreen: true,
    sunscreenSpf: 50,
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    familyHistory: [],
    dermatologicalHistory: [],
    smoker: false,
  };
  const patientOne = await prisma.patient.create({
    data: {
      clinicId: clinicOne.id,
      firstName: "Paciente",
      lastName: "Integracion",
      idNumber: `ID1-${suffix}`,
      birthDate: new Date("1990-01-15"),
      sex: "F",
      background,
    },
  });
  const patientTwo = await prisma.patient.create({
    data: {
      clinicId: clinicTwo.id,
      firstName: "Paciente",
      lastName: "Ajeno",
      idNumber: `ID2-${suffix}`,
      birthDate: new Date("1992-02-20"),
      sex: "M",
      background,
    },
  });
  const serviceOne = await prisma.service.create({
    data: {
      clinicId: clinicOne.id,
      name: "Consulta integracion",
      category: "consulta",
      durationMin: 30,
      price: 40,
      vatRate: 0,
    },
  });
  const packageOne = await prisma.package.create({
    data: {
      clinicId: clinicOne.id,
      serviceId: serviceOne.id,
      name: "Paquete integracion",
      sessions: 2,
      price: 100,
    },
  });
  const balance = await prisma.packageBalance.create({
    data: {
      clinicId: clinicOne.id,
      patientId: patientOne.id,
      packageId: packageOne.id,
      sessionsTotal: 2,
      sessionsUsed: 0,
      price: 100,
      vencimiento: new Date(Date.now() + 86_400_000),
    },
  });
  const storeId = `STORE-${suffix}`;
  const transactionId = `PAY-${suffix}`;
  await prisma.clinicPaymentProvider.create({
    data: { clinicId: clinicOne.id, storeId, tokenEncrypted: "integration-only" },
  });
  const payment = await prisma.payment.create({
    data: {
      clinicId: clinicOne.id,
      patientId: patientOne.id,
      conceptType: "libre",
      conceptLabel: "Cobro integracion",
      amount: 25,
      status: "pendiente",
      clientTransactionId: transactionId,
      payphoneStoreId: storeId,
    },
  });
  const consentTemplate = await prisma.consentTemplate.create({
    data: {
      clinicId: clinicOne.id,
      title: "Consentimiento de integracion",
      procedureType: "Consulta",
      body: "Declaro que recibi informacion suficiente sobre beneficios, riesgos, alternativas y revocacion.",
      status: "aprobada",
      approvedAt: new Date(),
    },
  });
  const consentTemplateTwo = await prisma.consentTemplate.create({
    data: {
      clinicId: clinicTwo.id,
      title: "Consentimiento de otra clinica",
      procedureType: "Consulta",
      body: "Plantilla creada para comprobar que una clinica no puede usar documentos de otra.",
      status: "aprobada",
      approvedAt: new Date(),
    },
  });
  const consent = await prisma.consent.create({
    data: { clinicId: clinicOne.id, patientId: patientOne.id, templateId: consentTemplate.id },
  });
  const prescription = await prisma.clinicalRecord.create({
    data: {
      clinicId: clinicOne.id,
      patientId: patientOne.id,
      professionalId: professionalOne.id,
      type: "receta",
      cie10Codes: [],
      prescription: {
        diagnosis: "Dermatitis de contacto",
        warnings: "Suspender ante irritación intensa",
        items: [{
          ingredients: [{ name: "Hidrocortisona", concentration: "1%" }],
          vehicle: "crema",
          quantity: "20 g",
          dosage: "capa fina",
          frequency: "cada 12 horas",
          duration: "5 días",
          instructions: "Aplicar únicamente en el área indicada.",
        }],
      },
    },
  });

  const tokenFor = (user: (typeof users)[number] | typeof adminTwo) => signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
    authVersion: user.authVersion,
  });
  const tokens = Object.fromEntries(users.map((user) => [user.role, tokenFor(user)])) as Record<(typeof roles)[number], string>;

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (path: string, options: RequestInit = {}, token?: string) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  try {
    await t.test("health responde y no expone X-Powered-By", async () => {
      const response = await request("/health");
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-powered-by"), null);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    });

    await t.test("superadmin exige segundo factor antes de emitir token", async () => {
      const login = await request("/platform/login", {
        method: "POST",
        body: JSON.stringify({ email: "gerencia@undercodeec.com", password: "integration-platform-password" }),
      });
      assert.equal(login.status, 200);
      const body = await login.json() as { token?: string; emailVerificationRequired: boolean; challengeToken: string };
      assert.equal(body.token, undefined);
      assert.equal(body.emailVerificationRequired, true);
      assert.ok(body.challengeToken);
      const invalidCode = await request("/platform/verify-email", {
        method: "POST",
        body: JSON.stringify({ challengeToken: body.challengeToken, emailCode: "000000" }),
      });
      assert.equal(invalidCode.status, 401);
    });

    await t.test("ficha clinica respeta roles y aislamiento entre clinicas", async () => {
      for (const role of ["admin", "profesional"] as const) {
        const response = await request(`/patients/${patientOne.id}/clinical-file`, {}, tokens[role]);
        assert.equal(response.status, 200, `${role} debe poder generar la ficha`);
        const body = await response.json() as { patient: { id: string }; signer: { id: string } | null };
        assert.equal(body.patient.id, patientOne.id);
        if (role === "profesional") assert.equal(body.signer?.id, professionalOne.id);
      }
      for (const role of ["recepcion", "esteticista", "contador"] as const) {
        const response = await request(`/patients/${patientOne.id}/clinical-file`, {}, tokens[role]);
        assert.equal(response.status, 403, `${role} no debe generar la ficha`);
      }
      const crossTenant = await request(`/patients/${patientTwo.id}/clinical-file`, {}, tokens.admin);
      assert.equal(crossTenant.status, 404);
    });

    await t.test("receta imprimible contiene solo datos clínicos necesarios y respeta roles", async () => {
      for (const role of ["admin", "profesional"] as const) {
        const response = await request(
          `/patients/${patientOne.id}/recetas/${prescription.id}/document`,
          {},
          tokens[role],
        );
        assert.equal(response.status, 200);
        const body = await response.json() as {
          patient: { idNumber: string; allergies: string[] };
          professional: { id: string; registrationNo: string };
          diagnosis: string;
          warnings: string;
          items: Array<{ dosage: string; frequency: string; duration: string }>;
        };
        assert.equal(body.patient.idNumber, patientOne.idNumber);
        assert.equal(body.professional.id, professionalOne.id);
        assert.equal(body.professional.registrationNo, professionalOne.registrationNo);
        assert.equal(body.diagnosis, "Dermatitis de contacto");
        assert.equal(body.warnings, "Suspender ante irritación intensa");
        assert.deepEqual(
          [body.items[0]?.dosage, body.items[0]?.frequency, body.items[0]?.duration],
          ["capa fina", "cada 12 horas", "5 días"],
        );
      }
      assert.equal(
        (await request(
          `/patients/${patientOne.id}/recetas/${prescription.id}/document`,
          {},
          tokens.recepcion,
        )).status,
        403,
      );
      assert.equal(
        (await request(
          `/patients/${patientTwo.id}/recetas/${prescription.id}/document`,
          {},
          tokens.admin,
        )).status,
        404,
      );
    });

    await t.test("administrador crea y vincula un perfil profesional visible en Pacientes", async () => {
      const created = await request("/admin/professionals", {
        method: "POST",
        body: JSON.stringify({
          name: "Dra. Perfil Vinculado",
          specialty: "Dermatología",
          registrationNo: `REG-LINK-${suffix}`,
          color: "#336699",
          userId: unlinkedProfessionalUser.id,
        }),
      }, tokens.admin);
      assert.equal(created.status, 201);
      const body = await created.json() as { id: string; users: Array<{ id: string }> };
      assert.deepEqual(body.users.map((user) => user.id), [unlinkedProfessionalUser.id]);
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { id: unlinkedProfessionalUser.id } })).professionalId,
        body.id,
      );

      const catalog = await request("/professionals", {}, tokens.admin);
      assert.equal(catalog.status, 200);
      const professionals = await catalog.json() as Array<{ id: string }>;
      assert.equal(professionals.some((professional) => professional.id === body.id), true);
    });

    await t.test("borrador de consentimiento se revisa, aprueba y genera para el paciente", async () => {
      const draft = await request("/consents/templates/drafts", {
        method: "POST",
        body: JSON.stringify({
          kind: "clinico",
          title: "Consentimiento guiado",
          procedureType: "Procedimiento de prueba",
          body: "Declaro que recibí información suficiente sobre riesgos, beneficios, alternativas y revocación.",
        }),
      }, tokens.admin);
      assert.equal(draft.status, 201);
      const draftBody = await draft.json() as { id: string; status: string };
      assert.equal(draftBody.status, "borrador");

      const beforeApproval = await request("/consent-templates", {}, tokens.admin);
      const unavailable = await beforeApproval.json() as Array<{ id: string }>;
      assert.equal(unavailable.some((template) => template.id === draftBody.id), false);

      const approval = await request(`/admin/consent-templates/${draftBody.id}/approve`, {
        method: "POST",
      }, tokens.admin);
      assert.equal(approval.status, 200);

      const generated = await request(`/patients/${patientOne.id}/consents`, {
        method: "POST",
        body: JSON.stringify({ templateId: draftBody.id }),
      }, tokens.admin);
      assert.equal(generated.status, 201);
      assert.equal((await generated.json() as { status: string }).status, "pendiente");
    });

    await t.test("lecturas de pacientes y usuarios nunca cruzan clinicas", async () => {
      for (const path of [
        `/patients/${patientTwo.id}`,
        `/patients/${patientTwo.id}/counts`,
        `/patients/${patientTwo.id}/evolucion`,
        `/patients/${patientTwo.id}/recetas`,
        `/patients/${patientTwo.id}/photos`,
        `/patients/${patientTwo.id}/consents`,
        `/patients/${patientTwo.id}/procedures`,
        `/patients/${patientTwo.id}/balances`,
      ]) {
        assert.equal((await request(path, {}, tokens.admin)).status, 404, path);
      }

      const clinicOneUsersResponse = await request("/admin/users", {}, tokens.admin);
      assert.equal(clinicOneUsersResponse.status, 200);
      const clinicOneUsers = await clinicOneUsersResponse.json() as Array<{ id: string }>;
      assert.deepEqual(
        new Set(clinicOneUsers.map((user) => user.id)),
        new Set([...users.map((user) => user.id), unlinkedProfessionalUser.id]),
      );

      const clinicTwoUsersResponse = await request("/admin/users", {}, tokenFor(adminTwo));
      assert.equal(clinicTwoUsersResponse.status, 200);
      const clinicTwoUsers = await clinicTwoUsersResponse.json() as Array<{ id: string }>;
      assert.deepEqual(clinicTwoUsers.map((user) => user.id), [adminTwo.id]);
    });

    await t.test("barrera SQL rechaza relaciones indirectas entre clinicas", async () => {
      await assert.rejects(prisma.clinicalRecord.create({
        data: {
          clinicId: clinicOne.id,
          patientId: patientOne.id,
          professionalId: professionalTwo.id,
          type: "evolucion",
          cie10Codes: [],
        },
      }));
      await assert.rejects(prisma.photo.create({
        data: {
          clinicId: clinicOne.id,
          patientId: patientTwo.id,
          bodyArea: "rostro",
          lesionTag: "cruce",
          caption: "Debe fallar",
          storagePath: "local:cross-tenant.png",
        },
      }));
      await assert.rejects(prisma.consent.create({
        data: {
          clinicId: clinicOne.id,
          patientId: patientOne.id,
          templateId: consentTemplateTwo.id,
        },
      }));
      await assert.rejects(prisma.procedure.create({
        data: {
          clinicId: clinicOne.id,
          patientId: patientOne.id,
          serviceId: serviceOne.id,
          professionalId: professionalTwo.id,
          injectionAreas: [],
        },
      }));
      await assert.rejects(prisma.consentEvent.create({
        data: {
          clinicId: clinicOne.id,
          consentId: consent.id,
          kind: "adenda",
          body: "Intento con autor de otra clinica",
          createdById: adminTwo.id,
          createdByName: adminTwo.fullName,
          chainSequence: 99,
          hash: "integration-cross-tenant",
        },
      }));
      const photoTwo = await prisma.photo.create({
        data: {
          clinicId: clinicTwo.id,
          patientId: patientTwo.id,
          bodyArea: "rostro",
          lesionTag: "otra-clinica",
          caption: "Foto sintetica",
          storagePath: "local:integration-other-clinic.png",
          createdById: adminTwo.id,
        },
      });
      await assert.rejects(prisma.procedure.create({
        data: {
          clinicId: clinicOne.id,
          patientId: patientOne.id,
          serviceId: serviceOne.id,
          professionalId: professionalOne.id,
          injectionAreas: [],
          photoIds: [photoTwo.id],
        },
      }));
    });

    await t.test("agenda rechaza una de dos citas solapadas concurrentes", async () => {
      const startAt = new Date(Date.now() + 7_200_000);
      const payload = JSON.stringify({
        patientId: patientOne.id,
        serviceId: serviceOne.id,
        professionalId: professionalOne.id,
        startAt: startAt.toISOString(),
        endAt: new Date(startAt.getTime() + 1_800_000).toISOString(),
        kind: "consulta_nueva",
      });
      const responses = await Promise.all([
        request("/appointments", { method: "POST", body: payload }, tokens.admin),
        request("/appointments", { method: "POST", body: payload }, tokens.admin),
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
      assert.equal(await prisma.appointment.count({ where: { professionalId: professionalOne.id, startAt } }), 1);
    });

    await t.test("abonos concurrentes no superan el precio del paquete", async () => {
      const payload = JSON.stringify({ amount: 60, method: "efectivo" });
      const responses = await Promise.all([
        request(`/balances/${balance.id}/abonos`, { method: "POST", body: payload }, tokens.admin),
        request(`/balances/${balance.id}/abonos`, { method: "POST", body: payload }, tokens.admin),
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
      const total = await prisma.packagePayment.aggregate({ where: { balanceId: balance.id }, _sum: { amount: true } });
      assert.equal(Number(total._sum.amount), 60);
    });

    await t.test("webhook Payphone concurrente acredita una sola vez", async () => {
      const payload = JSON.stringify({
        Amount: 2500,
        ClientTransactionId: transactionId,
        StoreId: storeId,
        StatusCode: 3,
        TransactionStatus: "Approved",
        TransactionId: `provider-${suffix}`,
      });
      const responses = await Promise.all([
        request("/payments/payphone/NotificacionPago", { method: "POST", body: payload }),
        request("/payments/payphone/NotificacionPago", { method: "POST", body: payload }),
      ]);
      assert.deepEqual(responses.map((response) => response.status), [200, 200]);
      for (const response of responses) {
        assert.deepEqual(await response.json(), { Response: true, ErrorCode: "000" });
      }
      const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      assert.equal(stored.status, "pagado");
      assert.equal(stored.payphoneTransactionId, `provider-${suffix}`);
      assert.equal(await prisma.auditLog.count({
        where: { clinicId: clinicOne.id, action: "Conciliacion automatica Payphone" },
      }), 1);
    });

    await t.test("firma, PDF y revocacion conservan integridad legal", async () => {
      const signature = `data:image/png;base64,${createTestPng().toString("base64")}`;
      const signed = await request(`/consents/${consent.id}/sign`, {
        method: "POST",
        body: JSON.stringify({ accepted: true, signaturePath: signature }),
      }, tokens.admin);
      assert.equal(signed.status, 200);
      const signedBody = await signed.json() as { status: string; contentHash: string; signatureHash: string; pdfHash: string };
      assert.equal(signedBody.status, "firmado");
      assert.equal(signedBody.contentHash.length, 64);
      assert.equal(signedBody.signatureHash.length, 64);
      assert.equal(signedBody.pdfHash.length, 64);

      const pdf = await request(`/consents/${consent.id}/pdf`, {}, tokens.admin);
      assert.equal(pdf.status, 200);
      assert.equal(pdf.headers.get("content-type"), "application/pdf");
      assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString("ascii"), "%PDF");
      assert.equal((await request(`/consents/${consent.id}/pdf`, {}, tokenFor(adminTwo))).status, 404);
      await assert.rejects(
        prisma.consent.update({ where: { id: consent.id }, data: { templateBody: "Alteracion no permitida" } }),
      );

      const revoked = await request(`/consents/${consent.id}/events`, {
        method: "POST",
        body: JSON.stringify({ kind: "revocacion", body: "Solicitud expresa del paciente" }),
      }, tokens.admin);
      assert.equal(revoked.status, 201);
      assert.equal((await prisma.consent.findUniqueOrThrow({ where: { id: consent.id } })).status, "revocado");
      assert.equal((await request(`/consents/${consent.id}/pdf`, {}, tokens.admin)).status, 200);
    });

    await t.test("fotos se sirven con JWT y permanecen aisladas por clinica", async () => {
      const image = createTestPng(120, 80);
      const form = new FormData();
      form.append("patient_id", patientOne.id);
      form.append("body_area", "rostro");
      form.append("lesion_tag", "integracion");
      form.append("caption", "Fotografia de prueba aislada");
      form.append("kind", "basal");
      form.append("file", new Blob([image], { type: "image/png" }), "integration.png");
      const uploaded = await request("/photos", { method: "POST", body: form }, tokens.admin);
      assert.equal(uploaded.status, 201);
      const photo = await uploaded.json() as { id: string; storagePath?: string };
      assert.equal(photo.storagePath, undefined);

      const ownList = await request(`/patients/${patientOne.id}/photos`, {}, tokens.admin);
      assert.equal(ownList.status, 200);
      const ownPhotos = await ownList.json() as Array<{ id: string; storagePath?: string }>;
      assert.equal(ownPhotos.some((item) => item.id === photo.id), true);
      assert.equal(ownPhotos.find((item) => item.id === photo.id)?.storagePath, undefined);
      assert.equal((await request(`/patients/${patientTwo.id}/photos`, {}, tokens.admin)).status, 404);

      const ownFile = await request(`/photos/${photo.id}/file`, {}, tokens.admin);
      assert.equal(ownFile.status, 200);
      assert.equal(ownFile.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(Buffer.from(await ownFile.arrayBuffer()), image);
      assert.equal((await request(`/photos/${photo.id}/file`)).status, 401);
      assert.equal((await request(`/photos/${photo.id}/file`, {}, tokenFor(adminTwo))).status, 404);

      const replacementImage = createTestPng(64, 64);
      const replacementForm = new FormData();
      replacementForm.append("file", new Blob([replacementImage], { type: "image/png" }), "replacement.png");
      const replacement = await request(`/photos/${photo.id}/file`, {
        method: "PUT",
        body: replacementForm,
      }, tokens.admin);
      assert.equal(replacement.status, 200);
      const replacementBody = await replacement.json() as { storagePath?: string };
      assert.equal(replacementBody.storagePath, undefined);
      const replacedFile = await request(`/photos/${photo.id}/file`, {}, tokens.admin);
      assert.deepEqual(Buffer.from(await replacedFile.arrayBuffer()), replacementImage);

      const foreignReplacement = new FormData();
      foreignReplacement.append("file", new Blob([image], { type: "image/png" }), "foreign.png");
      assert.equal((await request(`/photos/${photo.id}/file`, {
        method: "PUT",
        body: foreignReplacement,
      }, tokenFor(adminTwo))).status, 404);
      assert.equal((await request(`/photos/${photo.id}`, { method: "DELETE" }, tokenFor(adminTwo))).status, 404);

      const clinicalFile = await request(
        `/patients/${patientOne.id}/clinical-file?includeEvolutions=0&includePrescriptions=0&includeProcedures=0&includeConsents=0&includePhotos=1`,
        {},
        tokens.admin,
      );
      assert.equal(clinicalFile.status, 200);
      const clinicalFileBody = await clinicalFile.json() as { photos: Array<{ id: string; fileUrl: string; storagePath?: string }> };
      assert.equal(clinicalFileBody.photos[0]?.id, photo.id);
      assert.equal(clinicalFileBody.photos[0]?.fileUrl, `/photos/${photo.id}/file`);
      assert.equal(clinicalFileBody.photos[0]?.storagePath, undefined);

      assert.equal((await request(`/photos/${photo.id}`, { method: "DELETE" }, tokens.admin)).status, 200);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    await rm(uploadDir, { recursive: true, force: true });
  }
});
