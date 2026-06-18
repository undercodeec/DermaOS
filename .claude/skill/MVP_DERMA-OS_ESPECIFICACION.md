# DERMA-OS — Especificación del MVP

> Documento de alcance para el Producto Mínimo Viable (MVP) de DERMA-OS: SaaS vertical para clínicas dermatológicas y de medicina estética en Ecuador, con sitio web comercial + dashboard administrativo + historia clínica especializada.
>
> Autor del proyecto: Christopher Gallardo · Stack: React/Vite · Node.js · PostgreSQL · VPS (Debian/Ubuntu) · Payphone/PayPal · SMTP/DNS
> Versión del documento: 1.0 · Fecha: 16/06/2026

---

## 1. Objetivo del MVP

Convertir DERMA-OS de un "calendario con sitio web" en una **plataforma vertical** que resuelva los 5 flujos que diferencian al nicho dermatológico/estético:

1. **Documentar la piel** — historia clínica dermatológica real (no un CRUD genérico).
2. **Demostrar resultados** — fotografía clínica antes/después con consentimiento.
3. **Vender ciclos** — paquetes/bonos de sesiones con saldo y abonos.
4. **Cobrar y confirmar** — Payphone + recordatorios WhatsApp.
5. **Cumplir** — facturación electrónica SRI, roles/auditoría y protección de datos (LOPDP/MSP).

**Promesa de producto (posicionamiento):**
"DERMA-OS: sitio web + agenda + historia clínica dermatológica + fotos antes/después con consentimiento + paquetes + WhatsApp + facturación electrónica para clínicas dermatológicas y estéticas en Ecuador."

**Criterio de éxito del MVP:** una clínica piloto puede operar un día completo (captar lead → agendar → atender con historia clínica y fotos → cobrar con factura electrónica → confirmar próxima sesión por WhatsApp) sin salir del sistema.

---

## 2. Estado actual vs. faltante (mapa de brechas)

Leyenda: ✅ Ya existe en DERMA-OS · 🔶 Existe pero hay que ampliar · 🆕 Funcionalidad nueva para el MVP

| Área | Estado | Qué falta para el MVP |
|---|---|---|
| Sitio web comercial | ✅ Hero, servicios, equipo, galería, blog, contacto, testimonios | 🆕 Captura de leads → CRM, CTA WhatsApp con tracking, landing por servicio, galería pública ligada a consentimiento |
| Agenda | ✅ Calendario + drag-and-drop | 🔶 Confirmación WhatsApp, estados (confirmada/no-show), depósito previo, agenda por profesional/cabina |
| Pacientes | ✅ CRUD + historial | 🆕 **Historia clínica dermatológica** (fototipo, lesiones, CIE-10, evolución por sesión) |
| Servicios | ✅ Nombre, precio, duración | 🆕 **Paquetes/bonos de N sesiones**, insumos consumidos por servicio |
| Facturación | ✅ Recibos, comprobantes, reportes | 🆕 **Facturación electrónica SRI (vía partner)**, pagos parciales/abonos, links Payphone |
| Profesionales | ✅ Equipo, horarios, especialidades | 🔶 Permisos por rol, agenda individual (comisiones → Fase 2) |
| KPIs | ✅ Citas, pacientes, ingresos, gráficos | 🔶 No-show, saldo de paquetes, inventario crítico, conversión lead→cita |
| Roles | 🔶 Solo Dueño/Admin | 🆕 **Recepción, profesional, esteticista, contador** + auditoría de accesos |
| Consentimientos | ❌ No existe | 🆕 **Consentimiento digital** (clínico + uso de imagen, separados) |
| Fotos clínicas | ❌ No existe | 🆕 **Galería clínica privada** antes/después con privacidad |
| Inventario | ❌ No existe | 🆕 **Inventario básico** con lotes y caducidad |

---

## 3. Alcance del MVP (lo que SÍ entra)

Estos son los **8 módulos imprescindibles** del MVP. Lo demás queda para fases posteriores (sección 9).

### M1 — Roles, permisos y auditoría 🆕
**Dolor:** hoy todos son admin y la app maneja datos de salud sensibles.
**Alcance MVP:**
- Roles: `dueño/admin`, `recepción`, `profesional` (dermatólogo/médico), `esteticista`, `contador`.
- Permisos por módulo (ej. recepción no ve notas clínicas completas; contador solo facturación/reportes).
- Auditoría: log de quién accedió/modificó historia, fotos y facturación (usuario, acción, entidad, fecha, IP).
- MFA obligatorio para `dueño/admin`.
**Criterio de aceptación:** un usuario `recepción` no puede abrir el detalle clínico de una historia ni descargar fotos; toda apertura de historia queda registrada.

### M2 — Historia clínica dermatológica 🆕
**Dolor:** el CRUD de pacientes no documenta la consulta dermatológica ni la evolución.
**Alcance MVP (estructura sobre HCU):**
- Anamnesis: motivo de consulta, antecedentes personales/familiares (incl. cáncer de piel), alergias, medicación, embarazo/lactancia, exposición solar, isotretinoína/láser previos.
- **Fototipo de Fitzpatrick** (I–VI) con descripción operativa.
- Examen físico por región anatómica.
- **Mapa de lesiones** (versión MVP: lista estructurada + foto; el SVG corporal interactivo va en Fase 2).
- Diagnóstico con **búsqueda CIE-10** (catálogo de piel) + plantillas frecuentes (acné, dermatitis, melasma, etc.).
- Plan de tratamiento, evolución por sesión, próxima revisión.
- Versionado de notas (no se borran, se versiona) + exportación a PDF.
**Criterio de aceptación:** el profesional crea una consulta completa, registra fototipo y diagnóstico CIE-10, y la historia queda versionada y exportable.

### M3 — Fotografía clínica privada (antes/después) 🆕
**Dolor:** las fotos quedan en celulares/WhatsApp sin control; riesgo legal alto.
**Alcance MVP:**
- Subida de fotos asociadas a paciente/cita/procedimiento/sesión.
- Metadatos: zona corporal, ángulo, sesión, profesional, fecha, consentimiento asociado, uso permitido (clínico/marketing), hash del archivo.
- **Comparador lado a lado** (versión simple) por fecha.
- Almacenamiento cifrado, URLs firmadas con expiración, descarga restringida por rol.
- Marca de "publicable en web" solo si hay consentimiento de marketing vigente.
**Criterio de aceptación:** una foto sin consentimiento de marketing NO puede publicarse en la web; toda descarga queda auditada.

### M4 — Consentimientos informados digitales 🆕
**Dolor:** riesgo legal por procedimientos estéticos y por uso de imágenes.
**Alcance MVP:**
- Plantillas por procedimiento (versionadas).
- **Dos consentimientos separados:** (a) clínico del procedimiento, (b) uso de imagen (interno / redes / web).
- Firma (dibujada en pantalla) + identificación del firmante + fecha/hora/IP.
- Exportación PDF, asociación a cita/procedimiento, **revocatoria** en cualquier momento.
**Criterio de aceptación:** un paciente puede aceptar el tratamiento y rechazar la publicación de fotos; el sistema respeta esa granularidad y permite revocar después.

### M5 — Paquetes, bonos, sesiones y abonos 🆕
**Dolor:** las clínicas venden ciclos (ej. "láser 8 sesiones") y pierden control de saldo.
**Alcance MVP:**
- Definir paquetes: servicio, nº de sesiones, precio, vigencia/vencimiento, intervalo sugerido.
- Por paciente: sesiones compradas, usadas, saldo, pagos parciales/abonos, profesional ejecutor.
- Descuento de sesión automático al ejecutar la cita.
**Criterio de aceptación:** al atender una cita de un paquete, el saldo de sesiones baja automáticamente y el saldo económico refleja los abonos.

### M6 — Cobros: Payphone + pagos parciales 🆕
**Dolor:** cobros manuales, comprobantes sueltos en WhatsApp, no-shows sin depósito.
**Alcance MVP:**
- Integración **Payphone (API Link)**: generar link de pago por cita/paquete/factura (POST con monto, descripción, ID transacción).
- Envío del link por WhatsApp/email; conciliación de estado (pagado/pendiente).
- Pagos parciales, abonos y depósito para reservar cita.
- Registro de método de pago y saldo del paciente.
**Criterio de aceptación:** recepción genera un link Payphone para un paquete, el paciente paga, y el estado se concilia automáticamente en el sistema.

### M7 — Facturación electrónica SRI (vía partner) 🆕
**Dolor:** los recibos internos no sustituyen la obligación tributaria.
**Alcance MVP:**
- Integración con un **proveedor/partner autorizado por el SRI** (no construir el motor XML/firma desde cero).
- Emisión de factura electrónica desde la cita/venta: generación XML, firma, autorización, RIDE, envío al cliente.
- Notas de crédito básicas.
- Interfaz modular (adaptador) para poder cambiar de proveedor sin reescribir el módulo.
**Criterio de aceptación:** al cerrar una venta, se emite una factura electrónica autorizada por el SRI y se entrega el RIDE al paciente.

### M8 — Inventario básico con caducidad 🆕
**Dolor:** pérdida por vencimiento y falta de control de insumos caros.
**Alcance MVP:**
- Productos/insumos/fármacos con lote, caducidad, costo, stock, stock mínimo.
- Consumo automático por servicio (ej. al ejecutar "botox" se descuenta del stock).
- Alertas de stock bajo y de caducidad próxima.
**Criterio de aceptación:** al ejecutar un servicio con insumo asociado, el stock baja y se genera alerta cuando cruza el mínimo o se acerca el vencimiento.

### M9 — Sitio web comercial + captura de leads 🔶🆕
**Dolor:** la web atrae visitas pero los prospectos se pierden.
**Alcance MVP (ampliación de lo existente):**
- Formulario de contacto/agendamiento → crea **lead** en el dashboard.
- Botón WhatsApp con tracking de origen.
- Reserva online conectada a la agenda real (huecos disponibles).
- Galería pública alimentada solo de fotos con consentimiento de marketing.
- (CRM de pipeline completo → Fase 2.)
**Criterio de aceptación:** un visitante envía el formulario y aparece como lead en el dashboard con su fuente de origen.

---

## 4. Fuera de alcance del MVP (para evitar sobre-construir)

- Mapa corporal 3D / SVG anatómico interactivo (MVP usa lista de lesiones + foto).
- CRM de leads tipo Kanban completo (MVP solo captura el lead).
- Membresías/fidelización y motor de comisiones.
- Teledermatología en video en vivo.
- Portal del paciente completo.
- Integración directa SRI propia (se usa partner).
- Multi-sucursal avanzado / white-label / HL7-FHIR / IA de análisis de piel.

---

## 5. Modelo de datos nuevo (PostgreSQL)

Tablas a añadir sobre el esquema actual (pacientes, citas, servicios, profesionales, facturas ya existen):

```sql
-- Roles y seguridad
users(id, clinic_id, nombre, email, password_hash, rol, mfa_enabled, activo)
audit_logs(id, user_id, accion, entidad, entidad_id, fecha, ip, before_resumen, after_resumen)

-- Historia clínica dermatológica
clinical_records(id, paciente_id, profesional_id, cita_id, motivo, anamnesis_json,
                 fototipo, examen_json, plan, proxima_revision, version, created_at)
derma_diagnoses(id, clinical_record_id, cie10_codigo, cie10_desc, tipo)  -- presuntivo/definitivo
derma_lesions(id, paciente_id, zona, tipo, tamano, color, bordes, descripcion,
              diagnostico, conducta, biopsia, resultado_histo, fecha, estado)

-- Fotos y consentimientos
clinical_media(id, paciente_id, cita_id, lesion_id, procedimiento, archivo_url, thumb_url,
               zona, angulo, sesion, profesional_id, consent_id, uso_permitido, visibilidad,
               file_hash, metadata_json, created_at)
consent_templates(id, clinic_id, procedimiento, tipo, version, texto, variables_json, activo)
signed_consents(id, paciente_id, template_id, version, cita_id, tipo, firma_url, pdf_url,
                firmante, fecha, ip, revocado, revocado_fecha)

-- Paquetes / abonos
treatment_packages(id, clinic_id, servicio_id, nombre, sesiones_totales, precio,
                   intervalo_dias, vigencia_dias, activo)
package_balances(id, paciente_id, package_id, sesiones_compradas, sesiones_usadas,
                 saldo_economico, vencimiento, profesional_vende_id, estado)
payments(id, paciente_id, cita_id, factura_id, package_id, monto, metodo, estado,
         payphone_link, payphone_tx_id, created_at)

-- Inventario
inventory_items(id, clinic_id, sucursal_id, nombre, tipo, lote, caducidad, costo,
                stock, stock_min)
inventory_movements(id, item_id, tipo, cantidad, motivo, cita_id, responsable_id, fecha)

-- Facturación electrónica (adaptador SRI)
einvoices(id, factura_id, proveedor, estado_sri, clave_acceso, xml_url, ride_url,
          autorizado_at, error_msg)

-- Leads del sitio web
leads(id, clinic_id, nombre, telefono, email, fuente, campana, servicio_interes,
      mensaje, estado, responsable_id, paciente_id, created_at)
```

> Multi-tenant: incluir `clinic_id` en todas las tablas raíz para servir varias clínicas desde el inicio (clave para el modelo SaaS).

---

## 6. Endpoints API sugeridos (Node.js)

```
# Auth y roles
POST   /auth/login            POST /auth/mfa/verify
GET    /users                 POST /users    PATCH /users/:id

# Historia clínica
GET    /patients/:id/records        POST /patients/:id/records
GET    /records/:id                 POST /records/:id/version
GET    /patients/:id/lesions        POST /patients/:id/lesions
GET    /cie10?q=acne                 (búsqueda en catálogo)

# Fotos y consentimientos
POST   /patients/:id/media          GET /patients/:id/media
POST   /media/:id/publish            (valida consentimiento marketing)
GET    /consent-templates           POST /consents/sign   POST /consents/:id/revoke

# Paquetes y pagos
GET    /packages                    POST /packages
POST   /patients/:id/packages        (asignar/vender paquete)
POST   /appointments/:id/consume     (descuenta sesión)
POST   /payments/payphone-link       POST /payments/webhook   (conciliación)

# Facturación electrónica (adaptador)
POST   /einvoices                   GET /einvoices/:id   POST /einvoices/:id/credit-note

# Inventario
GET    /inventory                   POST /inventory   POST /inventory/:id/movement

# Leads (desde el sitio web)
POST   /public/leads                GET /leads   PATCH /leads/:id
```

---

## 7. Roles y matriz de permisos (MVP)

| Módulo | Dueño/Admin | Recepción | Profesional | Esteticista | Contador |
|---|---|---|---|---|---|
| Agenda | Total | Crear/editar | Su agenda | Su agenda | Ver |
| Pacientes (datos) | Total | Crear/editar | Ver | Ver | Ver |
| Historia clínica | Total | ❌ | Crear/editar | Limitado* | ❌ |
| Fotos clínicas | Total | Ver thumbnails | Total | Subir/ver | ❌ |
| Consentimientos | Total | Gestionar firma | Gestionar | Gestionar | ❌ |
| Paquetes/abonos | Total | Vender/registrar | Ver | Ejecutar | Ver |
| Pagos/Payphone | Total | Cobrar | ❌ | ❌ | Ver/conciliar |
| Facturación SRI | Total | Emitir | ❌ | ❌ | Total |
| Inventario | Total | Ver | Consumir | Consumir | Ver |
| Reportes/KPIs | Total | Limitado | Suyos | Suyos | Financieros |

\* El esteticista accede solo a la parte estética/evolución, no al diagnóstico médico completo (configurable).

---

## 8. Cumplimiento regulatorio (requisitos obligatorios del MVP)

- **SRI:** factura electrónica con firma y autorización vía partner; entregar RIDE al paciente. (Ref: SRI — Facturación Electrónica.)
- **MSP / ACESS (HCU):** estructura basada en Historia Clínica Única; confidencialidad; retención de historias (archivo activo 5 años, vida útil 10–15 años); no permitir borrado definitivo de notas clínicas.
- **LOPDP (datos sensibles de salud):** los datos clínicos y las fotos son **datos sensibles**. Requisitos mínimos:
  - Cifrado en reposo y en tránsito (HTTPS).
  - RBAC + MFA para administradores + logs de acceso.
  - Consentimiento **granular** (clínico vs. imagen) y revocable.
  - Política de retención configurable y exportación del expediente.
  - Separación entre imagen clínica privada e imagen autorizada para marketing.
  - DPA (acuerdo de tratamiento de datos) con cada clínica cliente.

---

## 9. Roadmap por fases

**Fase 1 — MVP vendible y cumplidor (~6–10 semanas):** M1 a M9 de este documento.

**Fase 2 — Diferenciación vertical (~8–12 semanas):** mapa corporal 2D (SVG), comparador avanzado de fotos, CRM de leads (pipeline), comisiones, membresías/recompra, landing SEO por servicio/ciudad, portal de formularios y consentimientos.

**Fase 3 — Escala (~12+ semanas):** teledermatología asincrónica, multi-sucursal, reportes avanzados, integración SRI directa opcional, interoperabilidad HL7/FHIR, white-label multi-tenant avanzado.

---

## 10. Orden de construcción recomendado (para desarrollador solo)

1. **Roles + auditoría** (base de seguridad para todo lo demás).
2. **Historia clínica dermatológica** (núcleo del valor clínico).
3. **Fotos + consentimientos** (diferenciador + cumplimiento).
4. **Paquetes/abonos** (monetización del nicho).
5. **Payphone + WhatsApp** (cobro y reducción de no-shows).
6. **Inventario básico** (control de insumos caros).
7. **Leads del sitio web** (conexión web ↔ dashboard).
8. **Facturación electrónica con partner** (cierre del ciclo, último por su complejidad de integración externa).

Este orden maximiza el valor percibido, reduce el riesgo legal temprano y evita construir integraciones complejas antes de validar ventas con clínicas piloto.

---

## 11. Métricas para validar el MVP con clínicas piloto

- % de citas con historia clínica completada.
- Nº de fotos antes/después cargadas por semana.
- % de citas confirmadas por WhatsApp y reducción de no-shows.
- Nº de paquetes vendidos y % de sesiones consumidas.
- % de cobros con link Payphone vs. manual.
- % de ventas con factura electrónica emitida correctamente.
- Leads captados desde el sitio web y conversión lead → cita.

> Señal de validación: si 5 de cada 10 clínicas piloto siguen pagando el segundo mes sin descuento fuerte, el MVP merece seguir desarrollándose.

---

### Fuentes de referencia
La priorización y los requisitos regulatorios de este documento se basan en la investigación previa de necesidades del sector (ver `investigacion-necesidades-dermatologia-ecuador.md`), que cita SRI, MSP/ACESS (Acuerdo Ministerial 00115-2021 y 5216), Ley Orgánica de Protección de Datos Personales y su Reglamento, documentación de Payphone (API Link), y referencias de software vertical (ModMed, Nextech, Aesthetic Record, Pabau, PatientNow, Fresha).
