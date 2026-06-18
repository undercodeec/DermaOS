# Necesidades de centros dermatológicos y clínicas de medicina estética en Ecuador: funcionalidades nuevas para DERMA-OS

## 1. Resumen ejecutivo

DERMA-OS ya cubre una base sólida de sitio comercial, agenda, pacientes, servicios, facturación básica, profesionales y KPIs, pero todavía se comporta como un software general de clínica con buena presencia web, no como un sistema especializado en dermatología y estética. Para competir en este nicho en Ecuador, las prioridades nuevas deberían ser: historia clínica dermatológica con anexos visuales, fotografía clínica antes/después con consentimiento y control de privacidad, paquetes de sesiones/abonos, recordatorios por WhatsApp, inventario con caducidad, consentimiento informado digital, facturación electrónica SRI vía partner o API, y controles robustos de protección de datos personales de salud.

El principal hallazgo es que la diferenciación no está solo en “tener agenda”: los competidores verticales de dermatología y estética destacan fotografía en la ficha, comparación lado a lado, plantillas clínicas, e-prescribing, teleconsulta, membresías, inventario, pagos integrados y gestión de leads, mientras que proveedores de estética como Aesthetic Record, Pabau, PatientNow, Mangomint y Fresha posicionan antes/después, consentimientos, formularios, paquetes, membresías, inventario, pagos y CRM como piezas centrales del producto ([Nextech](https://www.nextech.com/dermatology/ehr-system), [ModMed](https://www.modmed.com/specialties/dermatology/ehr/), [Aesthetic Record](https://www.aestheticrecord.com/before-after-photo-video-managment/), [Pabau](https://pabau.com/industry/medical-spa-software/), [PatientNow](https://www.patientnow.com/photography/), [Mangomint](https://www.mangomint.com/solutions/medical-spa-software/), [Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)).

En Ecuador, el módulo de cumplimiento debe diseñarse desde el inicio porque la historia clínica contiene datos de salud, la Ley Orgánica de Protección de Datos Personales define los datos relativos a la salud como datos personales vinculados a salud física o mental y clasifica salud dentro de datos sensibles, y su reglamento exige informar tipos de tratamiento, finalidades, tiempo de conservación, medidas de protección y consecuencias cuando se requiere consentimiento explícito ([Ley Orgánica de Protección de Datos Personales](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf), [Reglamento General LOPDP](https://www.cosede.gob.ec/wp-content/uploads/2023/12/REGLAMENTO-GENERAL-A-LA-LEY-ORG%C3%81NICA-DE-PROTECCION-DE-DATOS-PERSONALES_compressed-1.pdf)).

El MVP comercialmente más defendible debería priorizar 8 entregables: HCU dermatológica, fotografías clínicas seguras, consentimientos, paquetes/abonos, WhatsApp, inventario, facturación electrónica SRI mediante integración externa, y CRM de leads conectado al sitio web. Estos módulos resuelven dolores reales de dermatología estética: documentación visual, riesgo legal de fotos, seguimiento de tratamientos por sesiones, reducción de inasistencias, control de insumos costosos, cumplimiento tributario, conversión de leads y recompra.

## 2. Qué ya cubre DERMA-OS y qué falta

| Área | Ya cubierto en DERMA-OS | Brecha crítica para dermatología/estética | Prioridad |
|---|---|---|---|
| Sitio web comercial | Hero, CTA de cita, servicios, equipo, galería con consentimiento, blog, contacto, testimonios | SEO local por ciudad/barrio, landing por servicio, captura de leads, WhatsApp tracking, reseñas, campañas y CRM | Alta |
| Agenda | Calendario y drag-and-drop | Confirmación automatizada por WhatsApp, lista de espera, depósito o abono previo, reglas por equipo/cabina/equipo láser | Alta |
| Pacientes | CRUD e historial | Historia clínica dermatológica, HCU ambulatoria, fototipo Fitzpatrick, fotos, lesiones, dermatoscopia, evolución, consentimientos y recetas | Muy alta |
| Servicios | Nombre, precio, duración | Paquetes de N sesiones, bonos, membresías, insumos consumidos por servicio, protocolos y contraindicaciones | Muy alta |
| Facturación | Recibos, comprobantes, reportes | Facturación electrónica SRI, notas de crédito, RIDE/XML, links de pago Payphone, pagos parciales y abonos | Muy alta |
| Profesionales | Equipo, horarios, especialidades | Comisiones, permisos por rol, agenda por profesional, cabinas, multi-sucursal | Media-alta |
| KPIs | Citas, pacientes, ingresos, gráficos | LTV, tasa de recompra, no-show, conversión lead-cita, consumo de paquetes, inventario crítico, ventas por profesional | Media |
| Roles | Dueño/Admin | Recepción, dermatólogo, esteticista, marketing, contador, auditoría de accesos | Alta |

## 3. Necesidades clínicas específicas de dermatología y estética

### 3.1 Historia clínica dermatológica y estética

La historia clínica en Ecuador debe partir de la Historia Clínica Única, porque la Agenda Digital de Salud 2023-2027 cita el derecho a una historia clínica única “redactada en términos precisos, comprensibles y completos” y señala que el Acuerdo Ministerial Nro. 00115 de 2021 regula el contenido y requisitos de aplicación de la HCU en establecimientos del Sistema Nacional de Salud ([Agenda Digital de Salud 2023-2027](https://www.salud.gob.ec/wp-content/uploads/2023/06/Manual_Agenda_Digital_2023_Seg.pdf)).

Para consulta ambulatoria, DERMA-OS debería mapear como mínimo la estructura de consulta externa/anamnesis-examen físico, evolución y prescripciones, interconsulta, laboratorio, imagenología, anatomía patológica y consentimiento informado, porque el listado de formularios HCU del MSP/ACESS incluye SNS-MSP/HCU-form.002 para consulta externa, form.005 para evolución y prescripciones, form.007 para interconsulta, form.010 para laboratorio, form.012 para imagenología, form.013 para anatomía patológica y form.024 para consentimiento informado ([ACESS / AM-00115-2021](http://www.acess.gob.ec/wp-content/uploads/2023/01/AM-00115-2021-Reglamento-e-instructivo-de-manejo-de-la-historia-clinica-unica.pdf)).

La capa dermatológica debe añadir campos que no aparecen en un CRUD genérico de pacientes: motivo de consulta dermatológico, duración y evolución de lesiones, síntomas asociados como prurito/dolor/sangrado, antecedentes personales y familiares de cáncer de piel, alergias, medicación, embarazo/lactancia, exposición solar, uso de láser o isotretinoína, tratamientos previos, fototipo de piel, examen físico por región anatómica, mapa de lesiones, diagnóstico CIE-10, plan de tratamiento, evolución por sesión, receta y próxima revisión.

El fototipo Fitzpatrick es relevante para láser, peelings y riesgo de hiperpigmentación porque StatPearls/NCBI explica que la escala clasifica fototipos según color de piel y tendencia a quemarse o broncearse, y que se utiliza en contextos terapéuticos como dosis de UVB, PUVA y tratamientos láser ([NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK557626/)).

La interfaz de fototipo debe permitir registrar I a VI y mostrar una descripción operativa, porque la tabla de NCBI describe desde tipo I “piel blanca, siempre se quema, nunca se broncea” hasta tipo VI “piel negra, fuertemente pigmentada, nunca se quema y se broncea muy fácilmente” ([NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK481857/table/chapter6.t1/)).

En dermatología médica, el diagnóstico debe permitir búsqueda por CIE-10 y plantillas frecuentes, porque categorías de piel y tejido subcutáneo se usan para diagnósticos como acné, dermatitis, queratosis, melanoma, tiñas y otras patologías dermatológicas en listados de codificación clínica ([Dermatology Advisor](https://www.dermatologyadvisor.com/clinician-pov/dermatology-icd-10-codes/), [Nextech](https://www.nextech.com/blog/getting-specific-icd-10-for-dermatology)).

**Funcionalidad recomendada:** construir un “Expediente dermatológico” dentro del paciente con pestañas de anamnesis, examen físico, fototipo, mapa corporal, lesiones, imágenes, diagnósticos, procedimientos, recetas, consentimientos y evolución. La implementación puede ser incremental: primero formularios JSON configurables, luego plantillas por procedimiento y finalmente diagramas anatómicos interactivos.

### 3.2 Mapeo de lesiones, dermatoscopia y documentación visual

La dermatología es una especialidad visual y los competidores verticales lo convierten en funcionalidad central: ModMed afirma que su EHR permite capturar fotos dentro de la app, dibujar sobre imágenes y diagramas corporales 3D, y acceder a esos visuales desde el registro del paciente ([ModMed](https://www.modmed.com/specialties/dermatology/ehr/)).

Nextech destaca la captura/importación directa de fotos al chart y la comparación lado a lado u overlay de la transformación del paciente, además de modelos anatómicos 3D y smart stamping para exámenes, evaluaciones, planes y códigos ([Nextech](https://www.nextech.com/dermatology/ehr-system)).

Para DERMA-OS, el mapeo de lesiones debe incluir ubicación anatómica, tipo de lesión, tamaño, color, bordes, cambios, foto clínica, foto dermatoscópica si existe, diagnóstico presuntivo, conducta, biopsia y resultado histopatológico. Esto resuelve un dolor crítico: sin un mapa visual longitudinal, el dermatólogo pierde trazabilidad de lesiones observadas, tratadas o biopsiadas.

**Implementación MVP factible:** usar SVG anatómico 2D con puntos por lesión, adjuntar fotos y metadatos, y permitir comparación por fecha. **Implementación avanzada:** modelos 3D, superposición, medición asistida y captura móvil guiada.

### 3.3 Fotografía clínica estandarizada y antes/después

La fotografía antes/después es una funcionalidad nuclear en estética porque Pabau define el software de before/after como una solución especializada para documentar, comparar y almacenar de forma segura resultados de tratamiento, y ofrece compartir fotos con clientes mediante portal seguro ([Pabau](https://pabau.com/features/before-and-after-photo-software/)).

Aesthetic Record posiciona su plataforma de foto/video antes/después como una ventaja competitiva e incluye consentimiento de medios firmado antes de la cita, fotos desde ángulos frontal, 45 y 90 grados y almacenamiento en el chart ([Aesthetic Record](https://www.aestheticrecord.com/before-after-photo-video-managment/)).

PatientNow enfatiza que las imágenes deben formar parte del registro del cliente y no permanecer en los dispositivos que toman las fotos, e incluye cifrado en transferencia y almacenamiento, auditoría y aprobaciones de consentimiento para reutilización ([PatientNow](https://www.patientnow.com/photography/)).

El riesgo legal y reputacional es alto porque JAMA Dermatology advierte que una foto facial de biopsia puede contener información identificable y no debe compartirse sin permiso del paciente, y que el consentimiento clínico habitual puede ser insuficiente para publicación en revistas, conferencias o redes sociales ([JAMA Dermatology](https://jamanetwork.com/journals/jamadermatology/fullarticle/2804879)).

La literatura dermatológica también subraya privacidad y derechos del paciente: JMIR Dermatology señala que la publicación de imágenes contribuye a investigación y educación, pero exige proteger privacidad, derechos y consentimiento del paciente ([JMIR Dermatology](https://derma.jmir.org/2022/3/e37398)).

**Funcionalidad recomendada:** galería clínica privada con estándares de captura, etiquetas de zona corporal/procedimiento/sesión, comparador lado a lado, control de consentimiento por uso, marca de agua opcional, expiración de autorización para marketing y bloqueo de descarga por roles.

**Campos mínimos para cada imagen:** paciente, procedimiento, fecha, profesional, zona corporal, ángulo, iluminación, dispositivo, sesión, consentimiento asociado, uso permitido, visibilidad, hash de archivo, auditoría de accesos y notas clínicas.

### 3.4 Planes, protocolos y seguimiento de tratamientos por sesiones

Las clínicas estéticas trabajan por recorridos, no por visitas aisladas: depilación láser, peelings, acné, melasma, toxina botulínica, bioestimuladores, aparatología, faciales y remodelación corporal suelen requerir sesiones múltiples, intervalos, fotos y controles. Fresha lista “Treatment Plans & Memberships”, paquetes para inyectables, láser y cuidado recurrente, before/after, inventario y comisiones como características clave de software medspa ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)).

Pabau destaca que el historial completo debe reunir tratamientos, fotos, productos y consentimientos en un único perfil para que el profesional actúe con seguridad incluso cuando el cliente haya sido atendido por varios miembros del equipo durante meses ([Pabau](https://pabau.com/industry/medical-spa-software/)).

**Funcionalidad recomendada:** crear “planes de tratamiento” con objetivo, protocolo, número de sesiones, frecuencia, contraindicaciones, consentimiento requerido, productos/insumos, fotos obligatorias, checklist pre y post, evolución, alertas de siguiente sesión y resultado final.

**Ejemplo de plan:** “Depilación láser axilas 8 sesiones” con intervalo de 4-6 semanas, evaluación Fitzpatrick, consentimiento láser, fotos inicial/final, registro de parámetros de equipo, lote de insumo si aplica, pago por paquete y saldo de sesiones.

### 3.5 Consentimientos informados digitales

El consentimiento informado es doblemente importante en estética: cubre el acto clínico y, separadamente, el uso de fotografías para documentación interna, redes, web, anuncios o educación. Aesthetic Record permite crear consentimientos y obtener firma en oficina o desde portal del paciente antes de un tratamiento ([Aesthetic Record Learning Lab](https://learn.aestheticrecord.com/en/articles/9269627-manage-consent-forms)).

En Ecuador, la Ley Orgánica de Protección de Datos Personales define consentimiento como manifestación libre, específica, informada e inequívoca, y su artículo 8 exige que el consentimiento sea libre, específico, informado e inequívoco y pueda revocarse en cualquier momento mediante un procedimiento sencillo ([Ley Orgánica de Protección de Datos Personales](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf)).

El reglamento de la LOPDP exige que, cuando se requiera consentimiento explícito, el responsable informe previamente tipos de tratamiento, finalidades, tiempo de conservación, medidas de protección y consecuencias de la entrega de datos ([Reglamento General LOPDP](https://www.cosede.gob.ec/wp-content/uploads/2023/12/REGLAMENTO-GENERAL-A-LA-LEY-ORG%C3%81NICA-DE-PROTECCION-DE-DATOS-PERSONALES_compressed-1.pdf)).

**Funcionalidad recomendada:** consentimiento digital versionado con plantillas por procedimiento, firma dibujada o firma electrónica opcional, identificación del firmante, fecha/hora/IP, relación con cita/procedimiento, revocatoria, exportación PDF y auditoría.

**Prioridad legal-práctica:** separar consentimiento clínico de consentimiento de uso de imagen. Un paciente puede aceptar el tratamiento y rechazar la publicación de fotos, y el sistema debe permitir esa granularidad.

### 3.6 Recetas y prescripciones digitales

Nextech integra e-prescribing bidireccional, envío de recetas desde el EHR, tracking de interacciones medicamento-alergia y flujo de laboratorio desde el chart ([Nextech](https://www.nextech.com/dermatology/ehr-system)).

En Ecuador, DERMA-OS puede empezar con receta digital no integrada a farmacias: membrete de clínica, datos del paciente, diagnóstico, medicamento, concentración, forma, dosis, frecuencia, duración, indicaciones, advertencias, médico, registro profesional y PDF. El valor inmediato para dermatología es alto porque se prescriben tratamientos tópicos, antibióticos, retinoides, antihistamínicos, antimicóticos, analgésicos y cuidados postprocedimiento.

**Funcionalidad recomendada:** módulo de recetas con catálogo reutilizable, fórmulas magistrales, indicaciones post-tratamiento, alergias visibles y bloqueo de prescripción si hay alertas críticas. La integración con farmacias o firma electrónica avanzada puede quedar para fase posterior.

### 3.7 Telemedicina y teledermatología

La Agenda Digital de Salud 2023-2027 indica que Ecuador busca mayor disponibilidad de servicios de telesalud con seguridad de la información y fortalecimiento de sistemas informáticos, infraestructura tecnológica, gestión y seguridad de información ([Agenda Digital de Salud 2023-2027](https://www.salud.gob.ec/wp-content/uploads/2023/06/Manual_Agenda_Digital_2023_Seg.pdf)).

La American Academy of Dermatology recomienda que plataformas de teledermatología ofrezcan acceso dirigido por dermatólogos certificados, y para modalidad store-and-forward recomienda cámara digital con resolución mínima de 800 x 600 píxeles, cifrado de 128 bits y autenticación por contraseña ([AAD Teledermatology Standards](https://www.aad.org/member/practice/telederm/standards)).

La AAD también recomienda que teledermatología de video tenga cámara de alta resolución mínima de 800 x 600 píxeles e internet mínimo de 384 kbps en la ubicación del paciente y del médico ([AAD Teledermatology Standards](https://www.aad.org/member/practice/telederm/standards)).

**Funcionalidad recomendada:** iniciar con teledermatología asincrónica controlada: formulario preconsulta, subida guiada de fotos, consentimiento de teleconsulta, pago previo, revisión del médico, receta/indicaciones y chat seguro. La videollamada en vivo puede añadirse después con proveedor externo.

## 4. Necesidades operativas y de negocio

### 4.1 Paquetes, bonos, sesiones y abonos

Los paquetes son esenciales en estética porque tratamientos de láser, faciales, peelings, aparatología y control dermatológico se venden por ciclos. Fresha identifica paquetes para inyectables, láser y cuidado recurrente como parte de las funciones relevantes de software medspa ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)).

**Funcionalidad recomendada:** cada paquete debe registrar sesiones compradas, sesiones usadas, vencimiento, saldo pendiente, pagos parciales, responsable de venta, profesional ejecutor, transferibilidad, congelamiento, devolución y rentabilidad por insumos.

**Dolor que resuelve:** evita hojas de cálculo, disputas con clientes, pérdida de ingresos por sesiones no registradas, y falta de visibilidad sobre ingresos cobrados vs servicios pendientes.

### 4.2 Inventario de insumos, productos y fármacos

Nextech incluye gestión de inventario con funciones personalizables dentro de práctica dermatológica, y Fresha lista inventario y retail con herramientas de código de barras para inyectables, skincare y consumibles como función clave en medspa ([Nextech](https://www.nextech.com/dermatology/ehr-pm-software), [Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)).

**Funcionalidad recomendada:** inventario con productos de venta, insumos clínicos, fármacos, lotes, caducidad, costo promedio, stock mínimo, consumo automático por servicio, ajustes, transferencias entre sucursales y alertas.

**Dolor que resuelve:** controla productos caros y sensibles a vencimiento como toxina botulínica, rellenos, peelings, anestésicos, cosmecéuticos, agujas, guantes, cánulas, láser consumible y material de curación.

### 4.3 Comisiones por profesional y esteticista

Fresha lista roles de personal y comisión flexible para médicos, enfermeras y esteticistas como características relevantes de software medspa ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)).

**Funcionalidad recomendada:** motor de comisiones con reglas por servicio, producto, paquete, profesional que vendió, profesional que ejecutó, porcentaje fijo/variable, metas, descuentos y liquidación mensual.

**Dolor que resuelve:** reduce conflictos internos, permite contratar esteticistas por producción y muestra rentabilidad real por profesional.

### 4.4 Membresías, fidelización y recompra

Nextech posiciona membresías y suscripciones como mecanismos para retener negocio en dermatología, y Prospyr señala que membresías en medspa ayudan a estabilizar ingresos y fomentar lealtad mediante beneficios recurrentes, reservas prioritarias, descuentos y acceso temprano a tratamientos ([Nextech](https://www.nextech.com/dermatology/ehr-pm-software), [Prospyr](https://www.prospyrmed.com/blog/post/how-memberships-boost-revenue-for-med-spas)).

**Funcionalidad recomendada:** membresías mensuales con beneficios, descuentos, acumulación de créditos, puntos, cumpleaños, recordatorios de recompra, campañas a pacientes inactivos y segmentación por servicio.

**Dolor que resuelve:** aumenta LTV y reduce dependencia de campañas pagadas para cada venta.

### 4.5 Recordatorios y confirmación por WhatsApp

La evidencia sanitaria apoya recordatorios digitales: una revisión rápida en JAMIA incluyó estudios en dermatología y encontró evidencia alta de que recordatorios por texto basados en modelos predictivos redujeron no-shows, y evidencia moderada de que llamadas telefónicas y navegadores de pacientes también redujeron inasistencias ([Journal of the American Medical Informatics Association](https://academic.oup.com/jamia/article/30/3/559/6889491)).

En Ecuador, WhatsApp es el canal operativo más natural para clínicas privadas, y Payphone permite enviar links de cobro por WhatsApp o redes sociales para recibir pagos online ([Payphone](https://payphone.app/para-negocios)).

**Funcionalidad recomendada:** confirmación automática por WhatsApp con mensajes 48h/24h/2h, botones de confirmar/reprogramar/cancelar, depósito opcional, recordatorio post-tratamiento, encuesta NPS y recuperación de pacientes sin próxima cita.

**Implementación recomendada:** usar WhatsApp Business Platform mediante BSP o proveedor local; guardar consentimiento de comunicaciones, plantilla aprobada, estado de entrega, respuesta y trazabilidad en el paciente.

### 4.6 Cobros, Payphone y pagos parciales

Payphone ofrece botón de pago para web, QR y link de cobro para WhatsApp, y permite recibir pagos con tarjetas Mastercard, Visa, Diners y Discover ([Payphone](https://payphone.app/para-negocios)).

La documentación de API Link de Payphone permite crear links únicos mediante una solicitud POST, definir monto, descripción e ID de transacción, compartir el link por correo, mensaje, redes o integrarlo como botón/QR, y monitorear la transacción desde Payphone Business ([Payphone API Link](https://docs.payphone.app/api-link)).

**Funcionalidad recomendada:** pagos parciales, abonos, depósitos para reservar, link de pago por cita/paquete/factura, conciliación de estado, registro de comisión, reverso/anulación y saldo pendiente del paciente.

**Dolor que resuelve:** reduce no-shows con depósitos, facilita compra de paquetes de alto valor y elimina manejo manual de comprobantes enviados por WhatsApp.

### 4.7 Multi-sucursal, multi-profesional y recursos

Pabau se posiciona para clínicas estéticas y multi-location, y en estética el software debe coordinar profesionales, cabinas, equipos y tratamientos con restricciones de disponibilidad ([Pabau](https://pabau.com/blog/clinic-management-software/), [Pabau](https://pabau.com/industry/medical-spa-software/)).

**Funcionalidad recomendada:** sucursales, cabinas, equipos, inventario por ubicación, agenda por profesional y recurso, permisos por sede, reportes por sede y consolidado de ingresos.

**Dolor que resuelve:** prepara DERMA-OS para clínicas que crecen de consultorio individual a centro con varias cabinas o sucursales.

## 5. Necesidades regulatorias en Ecuador

### 5.1 Facturación electrónica SRI

El SRI define la facturación electrónica como emisión de comprobantes de venta, retención y documentos complementarios con requisitos legales y reglamentarios, e indica que garantiza autenticidad e integridad porque cada comprobante incluye firma electrónica del emisor ([SRI](https://www.sri.gob.ec/en/facturacion-electronica)).

El SRI indica que un comprobante electrónico tiene validez legal siempre que contenga firma electrónica y lista como requisitos firma electrónica, software para generar comprobantes, conexión a internet y clave de acceso a SRI en Línea ([SRI](https://www.sri.gob.ec/en/facturacion-electronica)).

La página del SRI sobre obligados muestra que desde 2022 se incorporaron personas naturales y sociedades, con excepciones específicas, a la obligación de emitir facturas electrónicas según la resolución NAC-DGERCGC18-00000191 reformada por NAC-DGERCGC18-00000431 ([SRI](https://www.sri.gob.ec/contribuyentes-obligados-a-emitir-comprobantes-electronicos)).

**Recomendación para DERMA-OS:** no construir desde cero todo el firmador XML/SRI en la primera versión comercial; integrar un partner de facturación electrónica ecuatoriano o construir una interfaz modular que permita cambiar proveedor. El desarrollo directo con XML, firma, autorización, contingencia, RIDE, anulaciones, notas de crédito y soporte tributario es viable técnicamente, pero consume demasiado tiempo para un desarrollador solo.

### 5.2 Historia clínica, confidencialidad y conservación

El Reglamento de Información Confidencial del Sistema Nacional de Salud del MSP reconoce el derecho a una historia clínica única redactada en términos precisos, comprensibles y completos, y a la confidencialidad de la información contenida en ella ([MSP / Acuerdo Ministerial 5216](https://www.salud.gob.ec/wp-content/uploads/2016/09/AM-5216-A-Confidencialidad.pdf)).

El mismo reglamento indica que el deber de confidencialidad sobre documentos con información de salud perdura incluso después de finalizada la actividad del establecimiento, la vinculación profesional o el fallecimiento del titular de la información ([MSP / Acuerdo Ministerial 5216](https://www.salud.gob.ec/wp-content/uploads/2016/09/AM-5216-A-Confidencialidad.pdf)).

El MSP define el archivo de historias clínicas como área restringida con acceso limitado a personal de salud autorizado, y distingue archivo activo para registros de hasta cinco años y pasivo para historias con más de cinco años sin registros desde la última atención ([MSP / Acuerdo Ministerial 5216](https://www.salud.gob.ec/wp-content/uploads/2016/09/AM-5216-A-Confidencialidad.pdf)).

El Manual de Manejo de Archivo de Historias Clínicas del MSP señala una vida útil de 10 o 15 años, con archivo activo de 5 años, según el resultado indexado del documento oficial del MSP ([MSP / Manual de Manejo de Archivo de Historias Clínicas](https://aplicaciones.msp.gob.ec/salud/archivosdigitales/documentosDirecciones/dnn/archivos/MANUAL%20DE%20MANEJO%20DE%20ARCHIVO%20DE%20LA%20HISTORIA.pdf)).

**Recomendación para DERMA-OS:** implementar desde MVP auditoría de accesos, roles mínimos, exportación completa de historia, backups, retención configurable, bloqueo de eliminación definitiva y registro de modificación de notas clínicas.

### 5.3 LOPDP: datos de salud, fotos clínicas y seguridad

La LOPDP define datos relativos a la salud como datos personales relativos a salud física o mental, incluida prestación de servicios de atención sanitaria, y define datos sensibles como datos relativos a salud, biométricos, genéticos y otros cuyo tratamiento indebido pueda generar discriminación o afectar derechos fundamentales ([Ley Orgánica de Protección de Datos Personales](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf)).

El Reglamento General de la LOPDP amplía que los datos de salud incluyen información pasada, presente o futura, información recogida con ocasión de atención sanitaria, identificadores sanitarios, pruebas, muestras biológicas, enfermedad, discapacidad, riesgo, historial médico, tratamiento clínico y estado fisiológico o biomédico ([Reglamento General LOPDP](https://www.cosede.gob.ec/wp-content/uploads/2023/12/REGLAMENTO-GENERAL-A-LA-LEY-ORG%C3%81NICA-DE-PROTECCION-DE-DATOS-PERSONALES_compressed-1.pdf)).

La LOPDP exige evaluación de impacto cuando el tratamiento por naturaleza, contexto o fines implique alto riesgo para derechos y libertades del titular, y el tratamiento de datos de salud/fotos clínicas de clínicas estéticas se acerca a ese estándar por sensibilidad, volumen y posible exposición reputacional ([Ley Orgánica de Protección de Datos Personales](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf)).

**Controles mínimos recomendados:** cifrado en reposo y tránsito, backups cifrados, RBAC, MFA para administradores, logs de acceso, permisos por módulo, consentimiento granular, política de retención, exportación de datos, eliminación/anonimización cuando proceda, DPA con la clínica, y separación entre imagen clínica privada e imagen autorizada para marketing.

### 5.4 Telemedicina y salud digital

La Agenda Digital de Salud 2023-2027 señala que Ecuador impulsa transformación digital con interoperabilidad, privacidad, seguridad, confidencialidad y estándares como HL7 para intercambio electrónico de información sanitaria ([Agenda Digital de Salud 2023-2027](https://www.salud.gob.ec/wp-content/uploads/2023/06/Manual_Agenda_Digital_2023_Seg.pdf)).

**Recomendación para DERMA-OS:** no prometer interoperabilidad nacional completa en el MVP, pero diseñar IDs, catálogos, exportación y estructura de historia pensando en HL7/FHIR a futuro.

## 6. Necesidades de marketing y sitio web comercial

### 6.1 SEO local y conversión

Las clínicas estéticas necesitan visibilidad local, porque Prospyr recomienda optimizar Google Business Profile con datos precisos, fotos profesionales de clínica/equipo/resultados con consentimiento, reseñas y funcionalidades de reserva directa ([Prospyr](https://www.prospyrmed.com/blog/post/5-local-seo-tips-for-aesthetic-clinics)).

**Funcionalidad recomendada para el sitio comercial:** páginas por ciudad y servicio, por ejemplo “dermatólogo en Quito”, “depilación láser en Cumbayá”, “tratamiento de acné en Guayaquil” o “botox en Cuenca”, con estructura SEO, FAQs, fotos autorizadas, testimonios, precios desde, CTA de WhatsApp y reserva online.

### 6.2 Captura de leads y CRM básico

Nextech menciona que un problema de software no especializado es perder leads y no identificar campañas de marketing de mayor rendimiento, y su práctica management promete convertir más leads y optimizar rendimiento financiero ([Nextech](https://www.nextech.com/dermatology/ehr-pm-software)).

**Funcionalidad recomendada:** CRM básico con lead source, campaña, servicio de interés, estado, responsable, próxima acción, cotización, seguimiento por WhatsApp, conversión a paciente, valor vendido y atribución a campaña.

### 6.3 Galería pública antes/después con consentimiento

La galería pública debe alimentarse solo de fotos con autorización específica de marketing, porque JAMA Dermatology advierte que el consentimiento clínico habitual puede ser insuficiente para publicar imágenes identificables en redes, conferencias o medios externos ([JAMA Dermatology](https://jamanetwork.com/journals/jamadermatology/fullarticle/2804879)).

**Funcionalidad recomendada:** desde la galería clínica privada, permitir “publicar en web” solo si existe consentimiento vigente para ese uso, con recorte/anonimización, watermark, fecha de autorización y opción de despublicar si el paciente revoca consentimiento.

### 6.4 Automatizaciones de recompra

Las membresías y beneficios recurrentes ayudan a impulsar visitas repetidas y lealtad, y Prospyr describe beneficios como reserva prioritaria, descuentos exclusivos, acceso temprano a tratamientos y servicios complementarios como incentivos de membresía ([Prospyr](https://www.prospyrmed.com/blog/post/how-memberships-boost-revenue-for-med-spas)).

**Funcionalidad recomendada:** campañas por fecha de última visita, tratamiento realizado, paquete por terminar, cumpleaños, control de toxina a 4-6 meses, mantenimiento facial mensual, control de acné, cross-sell de productos y pacientes inactivos.

## 7. Roadmap priorizado de funcionalidades nuevas

### 7.1 Imprescindibles para MVP/cumplimiento

| Funcionalidad | Dolor que resuelve | Por qué importa en Ecuador | Complejidad técnica | ¿Factible para desarrollador solo? | Recomendación concreta |
|---|---|---|---|---|---|
| Historia clínica dermatológica sobre HCU | El CRUD de pacientes no documenta consulta dermatológica ni evolución clínica | La HCU y confidencialidad son obligaciones sanitarias, y el MSP reconoce derecho a HCU completa y confidencial ([MSP](https://www.salud.gob.ec/wp-content/uploads/2016/09/AM-5216-A-Confidencialidad.pdf)) | Media | Sí | Formularios JSON versionados + plantillas de consulta, evolución y prescripción |
| Fotografía clínica privada antes/después | Las fotos quedan en celulares, WhatsApp o carpetas sin control | Las fotos clínicas son datos de salud/identificables y requieren privacidad y consentimiento ([JAMA Dermatology](https://jamanetwork.com/journals/jamadermatology/fullarticle/2804879), [LOPDP](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf)) | Media-alta | Sí, si inicia simple | S3-compatible/MinIO o VPS con cifrado, thumbnails, permisos y auditoría |
| Consentimientos digitales por procedimiento e imagen | Riesgo legal por procedimientos estéticos y uso de fotos | La LOPDP exige consentimiento libre, específico, informado e inequívoco, y revocable ([LOPDP](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf)) | Media | Sí | Plantillas, firma, PDF, versión, revocatoria y consentimiento separado para marketing |
| Paquetes, bonos, sesiones y abonos | Clínicas venden ciclos y pierden control de sesiones usadas/saldo | Estética depende de tratamientos recurrentes y paquetes para láser/cuidado continuo ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)) | Media | Sí | Ledger de sesiones + pagos + vencimiento + saldo |
| WhatsApp de confirmación y recordatorios | Inasistencias, reprogramaciones manuales y pérdida de agenda | Recordatorios por texto y llamadas reducen no-shows en evidencia sanitaria ([JAMIA](https://academic.oup.com/jamia/article/30/3/559/6889491)) | Media | Sí con proveedor | Integrar BSP/WhatsApp API, plantillas, estados y respuestas |
| Facturación electrónica SRI vía partner | Recibos internos no sustituyen obligación tributaria | El SRI exige comprobantes electrónicos con firma y requisitos técnicos ([SRI](https://www.sri.gob.ec/en/facturacion-electronica)) | Alta directa / Media con partner | Sí con partner | Integrar proveedor ecuatoriano; no construir motor SRI completo al inicio |
| Roles y auditoría | Todos como admin expone datos sensibles | Datos de salud requieren confidencialidad, seguridad y trazabilidad ([MSP](https://www.salud.gob.ec/wp-content/uploads/2016/09/AM-5216-A-Confidencialidad.pdf), [Reglamento LOPDP](https://www.cosede.gob.ec/wp-content/uploads/2023/12/REGLAMENTO-GENERAL-A-LA-LEY-ORG%C3%81NICA-DE-PROTECCION-DE-DATOS-PERSONALES_compressed-1.pdf)) | Media | Sí | Roles: dueño, recepción, profesional, esteticista, contador, marketing |
| Inventario básico con caducidad | Pérdida por vencimiento y falta de control de insumos caros | Medspa software lista inventario para inyectables, skincare y consumibles ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)) | Media | Sí | Productos, lotes, vencimiento, stock mínimo, consumo por servicio |

### 7.2 Diferenciadores de alto valor

| Funcionalidad | Dolor que resuelve | Por qué importa | Complejidad | ¿Factible solo? | Recomendación |
|---|---|---|---|---|---|
| Mapa corporal de lesiones | Seguimiento visual pobre de lesiones y biopsias | Competidores dermatológicos usan diagramas 3D/fotos para continuidad clínica ([ModMed](https://www.modmed.com/specialties/dermatology/ehr/), [Nextech](https://www.nextech.com/dermatology/ehr-system)) | Media-alta | Sí con 2D | SVG anatómico 2D + puntos + fotos + evolución |
| Comparador avanzado antes/después | Demostrar resultados y vender tratamientos | Aesthetic Record y Pabau lo posicionan como funcionalidad central de estética ([Aesthetic Record](https://www.aestheticrecord.com/before-after-photo-video-managment/), [Pabau](https://pabau.com/features/before-and-after-photo-software/)) | Media | Sí | Lado a lado, overlay simple, mismas posiciones/ángulos |
| CRM de leads del sitio web | Se pierden prospectos de WhatsApp, formularios y redes | Nextech menciona pérdida de leads e imposibilidad de medir campañas como dolores de práctica ([Nextech](https://www.nextech.com/dermatology/ehr-pm-software)) | Media | Sí | Pipeline Kanban + fuente + seguimiento + conversión a cita |
| Links de pago Payphone por cita/paquete | Cobros manuales y reservas sin depósito | Payphone permite links por WhatsApp, redes y API Link con POST y monto ([Payphone](https://payphone.app/para-negocios), [Payphone API Link](https://docs.payphone.app/api-link)) | Media | Sí | Crear link desde cita/factura/paquete y conciliar estado |
| Membresías/fidelización | Baja recompra y dependencia de pauta | Membresías estabilizan ingresos y promueven visitas recurrentes en medspa ([Prospyr](https://www.prospyrmed.com/blog/post/how-memberships-boost-revenue-for-med-spas)) | Media | Sí | Membresías, créditos, descuentos y automatizaciones |
| Comisiones | Cálculo manual causa conflicto | Software medspa destaca comisiones flexibles por rol ([Fresha](https://www.fresha.com/for-business/medspa/best-medical-spa-software)) | Media | Sí | Reglas por servicio/producto/profesional/venta |
| Teledermatología asincrónica | Consultas de seguimiento no siempre requieren visita presencial | AAD define requisitos de foto, cifrado y autenticación para store-and-forward ([AAD](https://www.aad.org/member/practice/telederm/standards)) | Media-alta | Sí, con alcance controlado | Formulario + fotos + pago + respuesta médica + receta |
| Portal del paciente | Reduce carga administrativa y mejora confianza | Pabau permite compartir fotos de forma segura con clientes en portal ([Pabau](https://pabau.com/features/before-and-after-photo-software/)) | Alta | Sí, por fases | Iniciar con links seguros para formularios, consentimientos y fotos seleccionadas |

### 7.3 Nice-to-have futuro

| Funcionalidad | Justificación | Complejidad | Momento recomendado |
|---|---|---|---|
| Firma electrónica avanzada integrada | Útil para documentos formales, pero puede esperar si hay firma simple + evidencia + PDF | Alta | Cuando haya clínicas medianas y requerimiento legal explícito |
| Integración directa SRI completa | Control total, pero alto mantenimiento fiscal y técnico | Alta | Después de validar mercado o si se vende como add-on premium |
| HL7/FHIR interoperable | Alineado con salud digital e interoperabilidad futura en Ecuador ([Agenda Digital de Salud](https://www.salud.gob.ec/wp-content/uploads/2023/06/Manual_Agenda_Digital_2023_Seg.pdf)) | Alta | Fase enterprise |
| IA para análisis de piel | Puede ser diferenciador, pero implica validación clínica y riesgo regulatorio | Alta | Solo como apoyo no diagnóstico |
| App móvil nativa | Mejora captura de fotos, pero web responsive/PWA puede bastar | Alta | Cuando haya uso recurrente del equipo clínico |
| Integraciones con laboratorios/farmacias | Útil para dermatología médica, pero depende de partners | Alta | Fase 3 |
| Multi-tenant white label avanzado | Importante para SaaS a escala | Media-alta | Cuando existan 5-10 clínicas piloto |

## 8. Diseño técnico sugerido para el stack actual

### 8.1 Modelo de datos mínimo nuevo

- `clinical_records`: paciente, profesional, cita, motivo, anamnesis, examen, diagnóstico, plan, estado, versión.
- `derma_lesions`: paciente, zona, coordenadas, tipo, tamaño, descripción, diagnóstico, conducta, fecha, estado.
- `clinical_media`: paciente, cita, lesión, procedimiento, archivo, thumbnail, zona, ángulo, consentimiento, visibilidad, hash, metadata.
- `consent_templates`: procedimiento, versión, texto, variables, estado.
- `signed_consents`: paciente, plantilla, versión, cita, firma, PDF, fecha, IP, revocado.
- `treatment_plans`: paciente, servicio, objetivo, sesiones_totales, intervalo, estado, protocolo.
- `package_balances`: paciente, paquete, sesiones_compradas, sesiones_usadas, saldo, vencimiento.
- `payments`: paciente, cita, factura, paquete, monto, método, estado, link_pago, transacción.
- `inventory_items`: producto, tipo, lote, caducidad, costo, stock, stock_min, sucursal.
- `inventory_movements`: entrada, salida, ajuste, consumo_por_servicio, responsable.
- `commissions`: profesional, regla, venta, servicio, producto, monto, estado_liquidación.
- `leads`: fuente, campaña, servicio_interés, estado, responsable, próxima_acción, conversión.
- `audit_logs`: usuario, acción, entidad, fecha, IP, before/after resumido.

### 8.2 Arquitectura de privacidad mínima

La privacidad debe diseñarse como funcionalidad, no como texto legal, porque datos de salud y fotos clínicas son datos sensibles bajo la LOPDP y el reglamento amplía el alcance de datos de salud a historial médico, tratamiento clínico, pruebas e información sanitaria ([LOPDP](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf), [Reglamento LOPDP](https://www.cosede.gob.ec/wp-content/uploads/2023/12/REGLAMENTO-GENERAL-A-LA-LEY-ORG%C3%81NICA-DE-PROTECCION-DE-DATOS-PERSONALES_compressed-1.pdf)).

Requisitos recomendados: HTTPS, cifrado de archivos, contraseñas con hash fuerte, MFA para dueños/admins, RBAC, expiración de sesiones, logs, backups cifrados, separación de entornos, URLs firmadas para imágenes, consentimiento granular, exportación de expediente y retención configurable.

### 8.3 Estrategia de implementación por fases

**Fase 1 — Producto vendible y cumplidor (6-10 semanas):** roles, auditoría, HCU dermatológica básica, consentimientos, fotos privadas, paquetes, Payphone links, WhatsApp reminders, inventario básico y facturación electrónica vía partner.

**Fase 2 — Diferenciación vertical (8-12 semanas):** mapa corporal 2D, comparador antes/después, CRM de leads, comisiones, campañas de recompra, portal de formularios/consentimientos y landing SEO por servicio.

**Fase 3 — Escala clínica (12+ semanas):** teledermatología asincrónica, multi-sucursal, reportes avanzados, membresías, conciliación contable, integración directa SRI opcional e interoperabilidad futura.

## 9. Recomendación final de construcción

La próxima versión de DERMA-OS no debería expandirse primero con “más dashboards”; debería enfocarse en los 5 flujos que más diferencian el nicho: documentar piel, demostrar resultados, vender paquetes, cobrar/confirmar y cumplir. Esa combinación convierte al producto en una plataforma vertical para dermatología estética en Ecuador, no en un calendario con sitio web.

La secuencia más eficiente para Christopher como desarrollador solo es: 1) roles/auditoría, 2) historia clínica dermatológica, 3) fotos/consentimientos, 4) paquetes/abonos, 5) WhatsApp + Payphone, 6) inventario, 7) CRM de leads, 8) facturación electrónica con partner. Este orden maximiza valor percibido, reduce riesgo legal y evita construir desde cero integraciones complejas antes de validar ventas.

El posicionamiento comercial recomendado es: “DERMA-OS: sitio web + agenda + historia clínica dermatológica + fotos antes/después con consentimiento + paquetes + WhatsApp + facturación electrónica para clínicas dermatológicas y estéticas en Ecuador”. Esa promesa conecta directamente con los dolores reales identificados y con el contexto local de SRI, MSP/ACESS y LOPDP.
