# 📋 ESTADO DEL PROYECTO — DERMA-OS
> Ultima actualizacion: 2026-07-23 (perfiles profesionales, recetas y visibilidad real de auditoria)

---

## Documento rector y alcance oficial del primer MVP

Esta seccion es la **fuente principal para reanudar el desarrollo**. La investigacion historica aporta necesidades y recomendaciones, pero no decide por si sola el alcance. Las decisiones expresas del propietario registradas aqui prevalecen cuando exista una diferencia.

### Decisiones de alcance confirmadas

- La integracion real de **facturacion electronica SRI** no forma parte de este primer MVP completo. El flujo interno/simulado no tiene validez tributaria y debe permanecer identificado como tal o deshabilitado. La integracion con partner, firma, XML, RIDE y autorizacion SRI queda para una implementacion futura y **no bloquea el cierre de este MVP**.
- El **sitio web publico/comercial** tampoco forma parte de este MVP. No se desarrollaran landing pages, SEO, blog, galeria publica ni formularios publicos de captacion. `.claude/docs_historicos/PROYECTO_SITIO_DERMATOLOGIA.md` se conserva solo como antecedente historico.
- El **CRM interno** no es esencial para el MVP actual y queda diferido como implementacion futura. No debe crearse en esta etapa ningun modulo de prospectos, pipeline, campañas o conversion comercial.
- La integracion de **WhatsApp Business** tampoco forma parte del MVP actual. No se implementaran Meta Cloud API, BSP, Embedded Signup, plantillas, webhooks ni mensajes automaticos. La agenda y los cobros funcionaran sin depender de WhatsApp.
- Los demas faltantes clinicos y operativos incluidos en la tabla siguiente forman parte del **MVP actual completo**, aunque se implementen y validen en entregas consecutivas.
- Integraciones de laboratorio/farmacia, HL7/FHIR, IA diagnostica, aplicacion movil nativa y white-label avanzado continúan como evoluciones posteriores; la investigacion original ya las clasifica como `nice-to-have` o fase enterprise.

### Backlog futuro que no bloquea el MVP actual

| Implementacion futura | Decision vigente |
|---|---|
| Facturacion electronica SRI | Conservar el flujo interno claramente rotulado como no tributario; integrar partner/firma/XML/RIDE/autorizacion solo cuando el propietario reactive este bloque |
| Sitio publico | No crear aplicacion, landing, SEO, blog, galeria ni formularios publicos dentro del MVP actual |
| CRM interno | No crear modelos, endpoints, permisos, pipeline ni reportes de prospectos en el MVP actual |
| WhatsApp Business | No crear Meta App, BSP, Embedded Signup, credenciales por clinica, outbox, plantillas ni webhooks en el MVP actual |

Estos elementos solo regresan al plan activo mediante una nueva decision explicita del propietario. El codigo actual no debe depender de ellos, y su ausencia no puede marcar el MVP como incompleto.

### Alcance funcional comprometido

| Flujo | Definicion de terminado para este MVP | Estado |
|---|---|---|
| Seguridad y operacion | RBAC, aislamiento entre clinicas, auditoria, MFA donde corresponda, backups cifrados y restauracion demostrada | Parcial: controles de aplicacion/BD y auditoria encadenada probados; faltan visor de auditoria en dashboard global y backup/restauracion |
| Pacientes, profesionales y agenda | Paciente y responsable clinico correctamente vinculados; agenda sin cruces; confirmacion, cancelacion y reprogramacion manuales trazables | Parcial: operacion base lista; alta/edicion/vinculacion de perfiles profesionales corregidas |
| HCU dermatologica | Antecedentes dermatologicos, examen por region, Fitzpatrick, CIE-10, evolucion, mapa 2D de lesiones, ordenes/resultados de laboratorio-imagen-patologia, interconsultas, plan y proxima revision | Parcial: HCU/SOAP base lista; faltan estructuras dermatologicas avanzadas |
| Fotografias clinicas | Archivos privados, comparacion basal/control, metadatos estandarizados, hash, auditoria y relacion directa con lesion, sesion, procedimiento y consentimiento de imagen | Parcial |
| Consentimientos | Plantilla versionada, aprobacion administrativa, firma, PDF, hash, revocacion/adenda y separacion entre consentimiento clinico y uso de imagen | Nucleo listo; falta enlace granular foto/alcance de imagen |
| Recetas | Documento independiente para el paciente, profesional/registro, diagnostico, formula, dosis, frecuencia, duracion, instrucciones, advertencias y alergias visibles | Nucleo listo; faltan alertas farmacologicas criticas |
| Planes y protocolos | Objetivo, protocolo/checklist, sesiones, intervalo, productos/insumos, evolucion y cierre del tratamiento | Pendiente como entidad/flujo estructurado |
| Paquetes, sesiones y abonos | Ledger de sesiones y dinero, vencimiento, consumo, congelacion, transferencia, devolucion y rentabilidad basica | Parcial: saldo, abonos y consumo listos |
| Inventario | Kardex inmutable, lote/caducidad/costo, stock minimo, entradas/ajustes, consumo automatico por servicio/protocolo y responsable | Parcial: CRUD/stock base listo |
| WhatsApp Business | Integracion oficial, recordatorios y respuestas automaticas | Fuera del MVP actual; conservar solo como futura integracion |
| Payphone | Link por cita/paquete, deposito o abono, webhook idempotente, conciliacion, anulacion y prueba con transaccion real; el link puede copiarse y enviarse manualmente por cualquier canal | Parcial: integracion tecnica lista; validacion real pendiente |
| CRM interno | Prospectos, pipeline, seguimiento y conversion comercial | Fuera del MVP actual; conservar solo como futura implementacion |
| Comisiones | Reglas por profesional/esteticista, servicio, producto y venta; calculo y estado de liquidacion auditables | Pendiente |
| Membresias y recompra | Creditos/beneficios, vigencia, consumo y recordatorios de recompra o paciente sin proxima cita | Pendiente |
| Teledermatologia y portal seguro | Flujo asincronico controlado con formulario, fotos privadas, pago, respuesta profesional, receta y enlaces seguros para paciente | Pendiente; desarrollar despues del nucleo presencial |
| Multi-sede y recursos | Sucursal, cabina/equipo, stock y agenda por sede sin romper el aislamiento por clinica | Pendiente; desarrollar despues de estabilizar una sede |
| Reportes | Indicadores clinicos/operativos, agenda, no-show, inventario, paquetes, cobros y comisiones segun permisos | Parcial |

### Referencia futura: para que serviria WhatsApp Business

> **Fuera del alcance actual.** Esta seccion conserva la arquitectura analizada para evitar repetir la investigacion si la integracion se retoma en el futuro. Ninguno de sus componentes es requisito, tarea activa ni criterio de cierre del MVP actual.

La integracion no tiene como objetivo reemplazar la historia clinica ni guardar conversaciones medicas completas en WhatsApp. Sirve para **cerrar el flujo operativo entre paciente y clinica** usando un canal que el paciente ya atiende:

1. **Reducir inasistencias:** enviar recordatorios configurables, por ejemplo 48 h, 24 h y 2 h antes de la cita.
2. **Confirmar la agenda:** ofrecer acciones de confirmar, solicitar reprogramacion o cancelar. La respuesta debe actualizar la cita o crear una tarea para recepcion.
3. **Evitar trabajo manual:** recepcion no debe copiar telefonos, redactar el mismo texto ni marcar como enviado algo que el proveedor nunca entrego.
4. **Cobrar reservas y tratamientos:** incluir un link Payphone de deposito, cita, paquete o saldo pendiente y relacionar el mensaje con el cobro correcto.
5. **Dar seguimiento:** enviar instrucciones administrativas post-tratamiento, encuesta, recordatorio de siguiente sesion o recuperacion de pacientes sin proxima cita. No se enviaran diagnosticos, fotografias ni datos sensibles innecesarios.
6. **Tener evidencia operativa:** registrar plantilla/version, fecha, destino, cita/cobro relacionado, proveedor, estado `queued/sent/delivered/read/failed`, respuesta y usuario o automatizacion responsable.
7. **Respetar privacidad:** guardar aceptacion/retiro de comunicaciones, permitir `opt-out`, aplicar permisos y `clinicId`, limitar contenido sensible y auditar accesos/eventos.

El boton actual de cobros **no constituye una integracion real**: hoy registra `sentVia = whatsapp` y muestra una confirmacion visual, pero no llama a WhatsApp, no conoce entrega/lectura y no procesa respuestas. No debe mostrarse como “enviado” hasta que exista confirmacion del proveedor; mientras tanto debe abrir un enlace manual claramente rotulado o indicarse como “marcado para envio manual”.

#### Flujo tecnico/funcional esperado de WhatsApp

1. El administrador configura por clinica el numero/remitente y credenciales del BSP o WhatsApp Business Platform; los secretos se cifran y nunca se devuelven al dashboard.
2. Se normaliza el telefono en formato E.164 y se comprueba el consentimiento de comunicaciones del paciente.
3. El administrador aprueba/configura plantillas y variables permitidas; el sistema conserva nombre, idioma, version y estado de aprobacion del proveedor.
4. Una cita, cobro o seguimiento crea un mensaje en una **outbox persistente e idempotente**. Un worker lo envia sin bloquear la API ni duplicarlo.
5. El proveedor llama a un webhook autenticado para `sent/delivered/read/failed` y para respuestas/botones del paciente.
6. `confirmar` cambia la cita a confirmada; `cancelar` aplica la politica definida; `reprogramar` crea una solicitud/tarea y no mueve silenciosamente la cita.
7. Fallos transitorios se reintentan con limite; fallos definitivos quedan visibles para recepcion. Cada transicion se audita y mantiene aislamiento por clinica.
8. Los mensajes de pago incluyen el link Payphone ya asociado al paciente/cita/paquete. El estado pagado solo se confirma por conciliacion segura/webhook de Payphone, nunca por una respuesta de WhatsApp.

#### Criterios de aceptacion de WhatsApp

- Prueba real con numero de sandbox o clinica: envio, entrega, lectura, fallo y respuesta.
- Dos clinicas no pueden consultar plantillas, credenciales, mensajes ni webhooks procesados de la otra.
- Un evento repetido del proveedor no duplica mensajes ni cambia dos veces una cita.
- Se respetan zona horaria, horario permitido, consentimiento y baja de comunicaciones.
- Recepcion puede ver pendientes/fallidos y reenviar de forma controlada.
- Las pruebas cubren recordatorio de cita, reprogramacion/cancelacion, mensaje post-tratamiento y link Payphone.
- La UI y los reportes distinguen `programado`, `enviado`, `entregado`, `leido` y `fallido`; nunca confunden “solicitud creada” con “mensaje entregado”.

### Orden oficial de implementacion y validacion

Cada bloque se desarrolla en una rama/commit revisable, se prueba localmente, se publica y se valida en VPS antes de iniciar el siguiente bloque de alto riesgo.

1. **Cerrar la continuacion actual:** desplegar el commit `21c3f88`, aplicar las migraciones nuevas, probar alta/edicion de profesionales, receta A4 y consentimiento manual/importado.
2. **Seguridad operativa del piloto:** backup cifrado automatico, retencion, monitoreo y restauracion completa en un entorno aislado. Este es el primer bloqueante antes de cargar datos clinicos reales.
3. **HCU dermatologica y lesiones:** definir el modelo versionado, formularios por region, mapa 2D, adjuntos/resultados, interconsulta y alertas de receta; migrar sin perder registros SOAP existentes.
4. **Fotografia, consentimiento y tratamiento:** metadatos estandarizados, hash, enlace foto-lesion-procedimiento-consentimiento, revocacion visible, planes/protocolos y comparador reproducible.
5. **Inventario y paquetes completos:** kardex, costo, consumo por protocolo, concurrencia, congelacion/transferencia/devolucion de paquetes y rentabilidad.
6. **Payphone real:** validar links para cita/paquete, depositos, anulacion, webhook y conciliacion con credenciales/transacciones reales; el envio del link sera manual y no dependera de WhatsApp.
7. **Operacion avanzada del MVP:** comisiones, membresias/recompra, reportes, teledermatologia/portal seguro y multi-sede/recursos, en ese orden salvo que una clinica piloto cambie la prioridad.
8. **Cierre del MVP:** regresion completa, aislamiento con dos clinicas, pruebas de concurrencia, revision de permisos, restauracion, pruebas externas, recorrido manual por rol y despliegue reproducible.

#### Puerta de calidad obligatoria por bloque

- Prisma/schema: validacion, migracion desde base vacia, migracion sobre datos sinteticos compatibles y ausencia de deriva.
- API/dashboard: typecheck, lint, unitarias, integracion HTTP/BD y builds de produccion.
- Seguridad: pruebas positivas/negativas por rol, IDOR y aislamiento con al menos dos clinicas.
- Datos: concurrencia e idempotencia donde existan pagos, stock, sesiones, webhooks o jobs.
- UI: recorrido manual de administrador, recepcion y profesional; estados vacios, errores y reintentos.
- VPS: `scripts/verify-vps.sh`, health, headers, CORS, servicio, commit activo y migraciones.
- Documentacion: actualizar esta seccion con estado, decisiones, archivos, migraciones, pruebas, commit, despliegue y siguiente punto exacto.

### Mapa de documentos para proximas sesiones

Leerlos en este orden y no asumir que un documento historico describe el runtime actual:

1. `ProyectosMD/ESTADO_PROYECTO.md`: fuente vigente de alcance, estado real, decisiones, pruebas, despliegue y proximo bloque.
2. `.claude/docs_historicos/investigacion-necesidades-dermatologia-ecuador.md`: razones clinicas/comerciales, campos sugeridos y roadmap original. Consultar especialmente secciones 3, 4, 5.2-5.4, 7 y 8; SRI, sitio publico, CRM y WhatsApp Business quedaron sobreescritos por la decision de alcance actual.
3. `ProyectosMD/CONSENTIMIENTOS.md`: reglas del flujo de plantillas, aprobacion, firma, PDF, revocacion/adenda y modelo persistente. Toda modificacion de consentimientos debe conservar esas invariantes.
4. `ProyectosMD/AUDITORIA_CODIGO_SEGURIDAD_2026-07-18.md`: hallazgos originales, criterios de piloto y plan de pruebas. Es una fotografia historica; comprobar en este documento cuales hallazgos ya fueron corregidos.
5. `ProyectosMD/AUDITORIA_MULTITENANT.md`: checklist y brechas originales de aislamiento. Contrastarlo con migraciones y suite HTTP/BD actuales antes de reabrir un hallazgo.
6. `ProyectosMD/logs.md`: evidencia/diagnostico local de sesiones anteriores, no fuente normativa ni estado definitivo. Al 2026-07-23 no esta versionado; no depender de el sin confirmar que existe y que el hallazgo reproduce.
7. `.claude/docs_historicos/PROYECTO_SITIO_DERMATOLOGIA.md`: antecedente de diseño excluido del MVP actual; no iniciar trabajo del sitio basandose en ese archivo.

Al comenzar una sesion: leer primero esta cabecera y el ultimo bloque cronologico, ejecutar `git status --short`, confirmar `HEAD`/`origin/main`, revisar migraciones y pruebas disponibles, y solo despues seleccionar el primer bloque pendiente. Al terminar: documentar que cambio, que se probo, que no se probo, SHA publicado/desplegado y el siguiente paso ejecutable.

---

## Continuacion de desarrollo (2026-07-23) - profesionales, recetas y visibilidad de auditoria

### Flujo unificado de usuario y perfil profesional

- Crear un usuario con rol `profesional` o `esteticista` desde **Sistema -> Usuarios** ahora puede crear y vincular el perfil clinico en la misma transaccion. Ya no es necesario completar primero dos flujos independientes para que el profesional aparezca en Agenda, Evoluciones, Recetas o Procedimientos.
- El identificador profesional dejo de ser obligatorio para crear el usuario o el perfil. La ausencia del dato no bloquea agenda, evolucion ni operacion interna.
- El identificador ahora tiene tipo explicito: `Registro ACESS/MSP`, `Cedula`, `Certificacion` u `Otro`.
- Emitir o cambiar el profesional de una receta exige especificamente un identificador de tipo `Registro ACESS/MSP` con numero no vacio. Cedula, certificacion u otro identificador no sustituyen este requisito de prescripcion.
- **Editar usuario** permite modificar nombre, correo, contrasena, rol, estado, MFA, vinculacion profesional y, para roles clinicos, nombre documental, especialidad/funcion, tipo y numero de identificador y color de agenda.
- La edicion del perfil se ejecuta junto con la del usuario y se registra como accion administrativa auditada.

### Claridad de los formularios de receta

- Los selectores de profesionales en Recetas, Evoluciones y Procedimientos distinguen carga, error de API y catalogo vacio; permiten reintentar y explican cuando solo existe un usuario sin perfil clinico.
- **Nueva receta** bloquea el guardado cuando el profesional seleccionado no tiene Registro ACESS/MSP.
- Los campos de receta incorporan ayudas `!` con descripcion contextual.
- Se reemplazaron etiquetas ambiguas por textos operativos: profesional que emite, diagnostico o motivo de atencion, advertencias para el paciente, medicamento o principio activo, concentracion, forma farmaceutica o base, cantidad a entregar, dosis por toma/aplicacion, frecuencia, tiempo de tratamiento e instrucciones de uso.

### Auditoria: persistencia real y visibilidad actual

- Las acciones auditadas se guardan en `audit_logs` con `clinicId`, usuario cuando corresponde, accion, categoria, etiqueta, fecha/hora, IP, secuencia y hashes encadenados.
- Se registran eventos relevantes confirmados por el servidor; no se registra cada tecla ni cada cambio antes de guardar. Tampoco toda lectura generica genera un evento, aunque las consultas/impresiones clinicas sensibles implementadas si pueden auditarse por separado.
- El endpoint tenant-scoped `GET /admin/audit-logs` existe y restringe la consulta a la clinica autenticada.
- **Brecha vigente:** `AdminView` ya no renderiza el visor de auditoria, aunque el cliente API todavia contiene `listAuditLogs`.
- **Brecha vigente:** el dashboard global `/platform` no tiene pantalla ni endpoint agregado para consultar las acciones de todas las clinicas. Las acciones del superadmin se escriben en la auditoria de la clinica afectada con `userId = null`, pero no se pueden recorrer actualmente desde la UI global.
- Por tanto, no debe afirmarse que el administrador global puede ver cada accion desde su dashboard. Los registros existen en base de datos para los flujos auditados, pero falta construir el visor con permisos, filtros, paginacion y aislamiento adecuados.

### Commits, migraciones y validacion

- `8a476d4`: estados visibles y reintento al cargar profesionales en formularios clinicos.
- `54986fd`: creacion transaccional del perfil al registrar un usuario profesional.
- `9292517`: etiqueta flexible de identificador profesional.
- `7f2ee16`: identificador opcional al crear perfiles y requisito al emitir recetas.
- `21c3f88`: tipos de identificador, edicion completa del perfil y ayudas de receta.
- Migraciones nuevas:
  - `20260724000000_optional_professional_identifier`
  - `20260724010000_professional_identifier_type`
- Typecheck API/dashboard: OK.
- Lint dashboard: OK.
- Pruebas unitarias API: 20/20 OK.
- Builds de produccion API/dashboard: OK; dashboard con 970 modulos, 469.08 kB minificado / 131.73 kB gzip.
- Prisma Client se regenero para validar tipos. Las migraciones deben aplicarse en VPS con `prisma migrate deploy`.
- Publicacion Git confirmada hasta `21c3f88`; despliegue y recorrido manual de este ultimo commit en VPS aun deben confirmarse.

### Punto exacto de reanudacion actualizado

1. En VPS, obtener `21c3f88`, ejecutar `prisma generate`, `prisma migrate deploy`, build de API/dashboard y reiniciar `derma-api`.
2. Ejecutar `scripts/verify-vps.sh` y confirmar health, CORS, headers, servicio, commit y migraciones.
3. Crear un profesional sin identificador y comprobar que aparece en Agenda/Evoluciones/Procedimientos.
4. Confirmar que una receta queda bloqueada hasta configurar `Registro ACESS/MSP`, y luego crear, editar, imprimir y guardar PDF.
5. Probar que **Editar usuario** conserva y actualiza todos los datos del perfil clinico.
6. Decidir e implementar el visor de auditoria tenant y/o global; hoy los eventos no son visibles en `/platform`.
7. Continuar con backup cifrado y restauracion completa antes de cargar datos clinicos reales.

---

## Continuacion de desarrollo (2026-07-23)

### Receta independiente para entregar al paciente

- La pestaña **Pacientes → Recetas** incorpora una vista independiente **Imprimir / Guardar PDF**; ya no es necesario entregar la ficha clinica completa.
- La receta muestra solo membrete de la clinica, fecha, paciente, identificacion, edad, alergias registradas, diagnostico, formulas/medicamentos, concentracion, forma o vehiculo, cantidad, dosis, frecuencia, duracion, indicaciones, advertencias y profesional con especialidad y registro.
- Crear y editar recetas permite registrar los nuevos campos. Las recetas historicas siguen siendo compatibles y muestran los datos disponibles.
- La consulta e impresion se auditan por separado y se restringen a `admin` y `profesional`, conservando `clinicId` y la autoria del profesional.

### Perfiles profesionales visibles en Pacientes

- Se confirmo que `users` y `professionals` eran entidades separadas: crear un usuario con rol `profesional` no creaba una ficha en el catalogo clinico y la UI no ofrecía una forma de crearla.
- **Sistema → Profesionales clinicos** ahora permite crear el perfil con nombre documental, especialidad, registro profesional y color de agenda, y vincularlo a un usuario profesional o esteticista existente.
- Una vez creado, el perfil aparece en los selectores de evolucion, recetas, procedimientos, agenda y ficha clinica.
- La vinculacion se ejecuta en una transaccion, incrementa la version de autenticacion del usuario vinculado y mantiene el aislamiento por clinica.

### Consentimientos desde el paciente

- Crear o importar una plantilla desde **Pacientes → Consentimientos** ya no cierra silenciosamente el flujo dejando un borrador invisible.
- El administrador ve el texto extraido o redactado, debe revisarlo y puede elegir **Aprobar y usar con este paciente**; la plantilla aprobada queda seleccionada para generar el consentimiento pendiente.
- El profesional puede proponer el borrador y recibe una explicacion clara de que un administrador debe aprobarlo.
- Se conserva la politica de inmutabilidad: importar o redactar no crea directamente un consentimiento legal; primero existe una plantilla borrador, luego una version aprobada y finalmente el documento del paciente.

### Validacion de esta continuacion

- Typecheck API y dashboard: OK.
- Lint dashboard: OK.
- Pruebas unitarias: 20/20 OK.
- Suite HTTP/BD: 14/14 escenarios OK, incluyendo receta imprimible, vinculacion de profesional, consentimiento borrador→aprobacion→generacion y aislamiento entre clinicas.
- API y dashboard de produccion: build OK; dashboard con 970 modulos, 460.05 kB minificado / 129.74 kB gzip.
- PostgreSQL 16 temporal: 15 migraciones aplicadas y contenedor eliminado al finalizar.
- No se requiere una migracion Prisma: los campos adicionales de receta viven en el JSON estructurado existente.

### Evaluacion frente al MVP investigado

La comparacion con `.claude/docs_historicos/investigacion-necesidades-dermatologia-ecuador.md` da un resultado **apto para un piloto clinico controlado de una sede, pero todavia no equivalente al MVP comercial completo descrito en la investigacion**.

| Necesidad | Estado actual | Evaluacion |
|---|---|---|
| Historia clinica dermatologica | Paciente, antecedentes, alergias, medicamentos, Fitzpatrick, evolucion SOAP, CIE-10, recetas, procedimientos y ficha consolidada | Parcial: faltan mapa corporal/lesiones estructurado, ordenes y resultados de laboratorio, imagen y patologia, interconsultas y alertas farmacologicas criticas |
| Fotografias clinicas privadas | Binarios protegidos con JWT, aislamiento por clinica, auditoria, reemplazo/eliminacion y comparacion basal/control | Parcial: faltan metadatos normalizados de angulo, iluminacion, dispositivo y sesion, hash del archivo y enlace directo con alcance/revocacion del consentimiento de imagen |
| Consentimientos digitales | Plantillas versionadas, aprobacion administrativa, firma, PDF, hash, eventos, revocacion/adenda e inmutabilidad | Cumple el nucleo; el contenido juridico final de cada plantilla debe validarlo la clinica y falta enlazar el permiso de imagen con cada fotografia/publicacion |
| Receta para el paciente | Documento independiente imprimible con datos clinicos y profesionales necesarios | Cumple el alcance basico; no sustituye una integracion de prescripcion electronica ni valida interacciones medicamentosas |
| Paquetes, sesiones y abonos | Saldos, pagos parciales, vigencia, consumo por cita, vendedor y ejecutor | Cumple el nucleo; faltan congelacion, transferencia, devolucion y rentabilidad por tratamiento |
| Inventario | Productos/insumos/medicamentos, lote, caducidad, minimo y ajustes auditados | Parcial: falta kardex de movimientos, costo promedio, consumo automatico por servicio y transferencias entre sedes |
| WhatsApp | Enlaces/acciones manuales y registro de canal en ciertos cobros | Fuera del alcance actual por decision del propietario; la integracion oficial queda como futura implementacion |
| Facturacion electronica SRI | Flujo y estados simulados | Fuera del alcance por decision del propietario; la integracion real queda como futura implementacion y no bloquea este MVP |
| Payphone | Creacion de links y webhook idempotente implementados | Implementado, pendiente validacion final con credenciales y transacciones reales antes del piloto |
| Roles, aislamiento y auditoria | RBAC, permisos por modulo, auditoria encadenada, MFA de plataforma y barreras multi-tenant probadas | Cumple el nucleo tecnico |
| CRM interno de prospectos | No existe un modulo integrado de leads/CRM | Fuera del alcance actual por decision del propietario; queda como futura implementacion |
| Sitio publico | Existe documentacion historica, no una aplicacion publica integrada en el monorepo actual | Fuera del alcance por decision del propietario; no bloquea este MVP |
| Respaldo y recuperacion | Procedimiento definitivo y restauracion real aun diferidos | Bloqueante operativo antes de usar datos clinicos reales |
| Multi-sede, teledermatologia, membresias y comisiones | No implementados | Incluidos en el MVP completo como bloques avanzados; no bloquean las primeras pruebas controladas de una sede |

**Veredicto:** Derma-OS ya cubre la operacion clinica esencial de pacientes, agenda, historia basica, fotos privadas, consentimientos, recetas, procedimientos, paquetes, pagos e inventario basico. Para afirmar que cumple el alcance oficial de este primer MVP deben completarse los bloques pendientes definidos en la cabecera, empezando por respaldos/restauracion, profundidad dermatologica de la HCU, trazabilidad foto-consentimiento, inventario y validacion Payphone. SRI real, sitio publico, CRM y WhatsApp Business no forman parte del criterio de cierre.

### Punto exacto de reanudacion

1. Obtener en la VPS el commit publicado de esta continuacion, reconstruir API/dashboard, reiniciar `derma-api` y ejecutar `scripts/verify-vps.sh`.
2. En **Sistema → Profesionales clinicos**, crear y vincular los perfiles de los usuarios ya existentes usando su especialidad y registro real.
3. Probar visualmente en VPS la receta A4, la creacion/vinculacion del profesional y el flujo de consentimiento importado/manual.
4. Definir y probar el respaldo cifrado y una restauracion completa antes de cargar datos clinicos reales.
5. Validar Payphone con credenciales/transacciones reales si formara parte del piloto; copiar y enviar el link manualmente por el canal elegido por la clinica.
6. Priorizar despues el kardex/consumo automatico de inventario, la HCU dermatologica estructurada y el enlace foto-consentimiento.

---

## Continuacion de desarrollo (2026-07-22)

### Correccion postdespliegue: aislamiento entre clinicas y gestion de fotos

- La revision manual en VPS detecto que, al cerrar sesion e ingresar con otra clinica en el mismo navegador, React Query conservaba usuarios/roles y fotografias de la sesion anterior. El backend de usuarios ya filtraba por `clinicId`; la representacion cruzada provenia de la cache del dashboard.
- El dashboard ahora limpia toda la cache al iniciar sesion, registrar/verificar una cuenta, cerrar sesion, fallar `/auth/me` o recibir cualquier HTTP 401. De este modo ningun dato renderizado sobrevive a un cambio o expiracion de sesion.
- Todas las lecturas y modificaciones de subrecursos del paciente agregaron filtros explicitos por `clinicId`, ademas de la barrera comun `router.param("id")` que ya rechazaba pacientes ajenos.
- Fotos y consentimientos buscan directamente por `id + clinicId` y responden 404 ante identificadores de otra clinica, sin confirmar que el recurso existe.
- Los administradores ahora tienen acciones visibles `Reemplazar` y `Eliminar` en cada fotografia. El reemplazo valida JPEG/PNG/WebP, guarda primero el archivo nuevo, actualiza la referencia y retira el anterior; ambas operaciones conservan permisos y auditoria.
- Las respuestas de carga/listado/reemplazo de fotos ya no exponen `storagePath` al navegador.
- La suite HTTP/BD crea dos clinicas y comprueba pacientes, conteos, historia, recetas, fotos, consentimientos, procedimientos, paquetes y usuarios. Tambien valida reemplazo/eliminacion y rechazo cruzado de binarios.
- Estado de esta correccion: publicada mediante `a0779fc`, desplegada y aprobada manualmente en VPS. No requiere una migracion Prisma adicional.

### Validacion operativa y automatizacion posterior

- El propietario confirmo en VPS el despliegue, las 15 migraciones, la separacion entre clinicas, usuarios/roles, fotografias, reemplazo y eliminacion.
- SMTP real, registro de clinicas y recuperacion de cuentas fueron verificados correctamente.
- Payphone real y la politica/prueba de respaldos se difieren explicitamente hasta la etapa final previa al piloto.
- Se agrego `.github/workflows/ci.yml`: PostgreSQL 16 efimero, migraciones, typecheck, lint, 20 pruebas unitarias, suite HTTP/BD multi-clinica y build de produccion.
- Se agrego `scripts/verify-vps.sh` para comprobar repositorio limpio, commit activo, migraciones, servicio systemd, `/health`, headers de seguridad, CORS y URLs publicas opcionales.
- La automatizacion fue publicada mediante `c187d7c ci: automatizar validacion integral y verificacion VPS`.

### Ficha clinica consolidada e imprimible

- Se implemento `GET /patients/:id/clinical-file` con respuesta JSON consolidada de paciente, antecedentes, evoluciones SOAP, recetas, procedimientos, consentimientos y metadatos/ficheros protegidos de fotos.
- Solo los roles `admin` y `profesional` pueden generar la ficha. El endpoint conserva el aislamiento por `clinicId`, comprueba los modulos de la suscripcion segun las secciones solicitadas y restringe el profesional firmante.
- Se agregaron filtros `from`/`to`, inclusiones por seccion, fotos excluidas por defecto y proposito `preview`/`print`.
- Generar la vista previa e imprimir/exportar registran eventos de auditoria distintos.
- El dashboard incorpora el boton `Ficha clinica`, filtros, selector de firmante para administradores, vista previa HTML, carga autenticada de fotos y CSS A4 para `window.print()`/Guardar como PDF.
- No se persiste una copia historica del PDF en esta fase; se genera temporalmente desde la vista imprimible.

### Smoke tests HTTP/BD permanentes

- La configuracion Express se separo en `src/app.ts`; `server.ts` solo abre el puerto. Esto permite probar la API real sobre un puerto efimero sin iniciar el proceso productivo.
- Se agrego `apps/api/src/integration/http-db.integration.ts` y los scripts `test:integration` en API y raiz.
- La suite crea dos clinicas y los cinco roles sobre una base que debe llamarse `test`, `smoke` o `integration`; nunca limpia ni acepta silenciosamente una base productiva.
- Casos cubiertos: headers HTTP, MFA de superadmin, ficha clinica por rol, IDOR entre clinicas, barreras SQL indirectas, citas solapadas concurrentes, abonos concurrentes, webhook Payphone idempotente, firma/PDF/revocacion/inmutabilidad de consentimientos y fotos privadas con JWT.

### Hallazgo de runtime corregido: advisory locks

- La primera ejecucion HTTP/BD descubrio que Prisma 5.22 no puede deserializar el tipo PostgreSQL `void` retornado directamente por `pg_advisory_xact_lock`.
- El defecto producia HTTP 500 en auditoria, agenda, abonos y webhooks aunque los tests unitarios pasaran.
- Se centralizo el bloqueo en `lib/db-locks.ts`, que adquiere el advisory lock y devuelve un entero compatible con Prisma.
- Se reemplazaron los ocho usos en auditoria, agenda, paquetes, consentimientos y suscripciones. La concurrencia real paso despues de la correccion.

### Barrera multi-tenant indirecta

- Nueva migracion `20260722000000_indirect_tenant_integrity`.
- Agrega `clinic_id` obligatorio a `clinical_records`, `photos`, `consents`, `consent_events` y `procedures`, con backfill desde pacientes/consentimientos.
- La migracion se aborta si encuentra cruces historicos de paciente, profesional, servicio, plantilla, autor, consentimiento o foto.
- Se agregaron claves foraneas compuestas y triggers para responsables de fotos/eventos/consentimientos y adjuntos de procedimientos.
- La barrera fue probada intentando cruces directos en cada tabla; PostgreSQL rechazo todos.

### MFA del superadmin

- `/platform/login` valida email y password, envia un codigo de 6 digitos y devuelve un challenge JWT de corta duracion, pero no un token de plataforma.
- `/platform/verify-email` emite la sesion solo tras validar el codigo; el challenge queda consumido y no puede reutilizarse.
- El dashboard `/platform` incorpora el segundo paso de codigo por email.
- En desarrollo/test el codigo se registra en consola; en produccion usa el SMTP obligatorio de la API.

### Validacion ejecutada acumulada

- Prisma: schema valido; 15/15 migraciones aplicadas desde una base PostgreSQL 16 vacia; `migrate diff` sin deriva.
- API: typecheck y build OK; 20/20 pruebas unitarias OK.
- HTTP/BD: 10 escenarios integrados OK (11 tests reportados incluyendo el contenedor de suite).
- Dashboard: typecheck, lint y build OK; 969 modulos transformados.
- Bundle principal actual: 449.69 kB minificado / 127.17 kB gzip; el pendiente historico que indicaba ~933 kB ya no reproduce.
- `git diff --check`: OK; solo avisos esperados de conversion LF/CRLF.
- PostgreSQL se ejecuto en un contenedor Docker temporal con datos exclusivamente sinteticos; el contenedor fue eliminado y no se toco ninguna base real.

### Punto exacto de reanudacion

1. Confirmar que el workflow del commit `c187d7c` termina correctamente en GitHub Actions y corregir cualquier diferencia exclusiva del runner si aparece.
2. Obtener `c187d7c` en la VPS y ejecutar `scripts/verify-vps.sh` con las URLs publicas para guardar una verificacion operativa reproducible.
3. Validar MFA de `/platform` con el SMTP ya operativo y revisar el dashboard interno antes del piloto.
4. Definir el diseño PDF definitivo/historico y el flujo opcional usuario/profesional.
5. Mantener Payphone real y respaldos/restauracion como tareas finales expresamente diferidas.

El desarrollo base fue publicado mediante `8280dc1 feat: consolidar ficha clinica y seguridad multi-tenant`; la correccion posterior de aislamiento y fotos corresponde a `a0779fc fix: aislar sesiones y gestionar fotos clinicas`; y la automatizacion operativa a `c187d7c ci: automatizar validacion integral y verificacion VPS`. `AGENTS.md` sigue sin seguimiento y no forma parte del desarrollo funcional.

---

## Flujo de desarrollo acumulado y punto de reanudacion (2026-07-21)

### Recorrido realizado

1. **MVP clinico (2026-06-18 al 2026-06-20)**
   - Se implementaron pacientes, historia SOAP, recetas, fotografias, consentimientos iniciales, procedimientos, paquetes, agenda, inventario, facturacion y dashboard.
   - Se incorporaron roles, permisos, auditoria y el primer modelo multi-tenant por clinica.
2. **Operacion SaaS y pagos (2026-07-17)**
   - Registro de clinicas, demo de 7 dias, suscripciones, panel de plataforma y Payphone por clinica.
   - Base y seed quedaron sin usuarios ni datos demo precargados.
3. **Primer hardening (2026-07-18)**
   - Se reforzaron webhooks, redenciones, aislamiento de IDs, validacion de archivos, secretos y flujo de recuperacion de contrasena.
4. **Consentimientos legales versionados (2026-07-20)**
   - Plantillas con borrador/aprobacion/versionado, texto legal congelado, PDF definitivo, hashes, eventos y revocacion inmutable.
5. **Auditoria integral y correcciones (2026-07-21)**
   - Se revisaron API, dashboard, Prisma, migraciones, dependencias y alineacion con `CONSENTIMIENTOS.md` e investigacion historica.
   - Se corrigieron permisos por modulo, autoria clinica, agenda, paquetes, abonos, Payphone, inventario, suscripciones, firmas, sesiones, auditoria, despliegue y dependencias.
   - Se agregaron las migraciones `20260721000000_harden_auth_sessions` y `20260721010000_tenant_integrity_barrier`.

### Estado tecnico comprobado

- Rama actual: `main`.
- Ultimo commit funcional: `a0779fc fix: aislar sesiones y gestionar fotos clinicas` (`main`; publicacion en `origin/main` realizada en esta sesion).
- Ultimo commit de automatizacion: `c187d7c ci: automatizar validacion integral y verificacion VPS`.
- La aplicacion y las 15 migraciones fueron confirmadas en la VPS; publicar el workflow y el verificador no requiere una migracion ni reiniciar la API.
- Prisma validate/generate: OK.
- Migraciones sobre PostgreSQL 16 vacio: 15/15 aplicadas y sin deriva respecto de `schema.prisma`.
- Barrera multi-tenant: relaciones directas e indirectas cruzadas fueron rechazadas por PostgreSQL.
- API: typecheck, build, 20/20 pruebas unitarias y suite HTTP/BD integrada OK.
- Dashboard: lint, typecheck y build OK; 969 modulos transformados.
- Dependencias de produccion: `pnpm audit --prod` sin vulnerabilidades conocidas.
- El contenedor PostgreSQL y el runtime Node portatil usados para validar fueron retirados; no se modifico ninguna base real.

### Punto exacto para continuar en la proxima sesion

1. Verificar visualmente la ficha clinica, la impresion A4 y el MFA de plataforma con datos representativos.
2. Hacer backup de cualquier base que vaya a recibir las migraciones.
3. Aplicar `prisma migrate deploy`; la barrera multi-tenant se detendra deliberadamente si detecta relaciones historicas entre clinicas distintas.
4. Repetir la suite HTTP/BD ya automatizada contra una copia aislada del entorno destino y ejecutar smoke tests posteriores al despliegue.
5. Corregir cualquier hallazgo del entorno destino y repetir build, lint y pruebas antes de promover una nueva version.
6. Continuar el despliegue VPS desde el paso 4 descrito al final de este documento.

No usar en una base con datos reales `prisma db push`, `db:reset`, `db:clean` ni `db:seed`.

---

## 🏗️ Arquitectura de Producción

```
┌──────────────────────────────── VPS ────────────────────────────────┐
│ Nginx + HTTPS                                                      │
│   ├── app.<dominio>  → Dashboard React/Vite estatico              │
│   └── api.<dominio>  → API Express/Prisma (systemd)               │
│                              │                                     │
│                              └── PostgreSQL local no publico       │
└────────────────────────────────────────────────────────────────────┘
                               │
                               └── Supabase Storage privado (fase posterior)
```

| Componente | Destino vigente | Estado |
|-----------|-----------------|--------|
| **Dashboard** | Nginx en VPS, `app.<dominio>` | Desplegado y probado |
| **API** | Node/systemd en VPS, `api.<dominio>` | Desplegada y probada |
| **Base de datos** | PostgreSQL en la misma VPS, puerto no publico | 15 migraciones aplicadas y operativas |
| **Fotos** | Directorio persistente local; Supabase Storage privado despues | Local probado; Supabase opcional posterior |

Render, Netlify y PostgreSQL de Supabase corresponden al despliegue anterior y no son la arquitectura objetivo vigente.

---

## 📂 Estructura del Monorepo

```
derma-os/
├── apps/
│   ├── api/                          # Backend Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Esquema y relaciones de BD
│   │   │   ├── seed.ts               # Limpieza total; no crea datos precargados
│   │   │   └── migrations/           # Migraciones de Prisma
│   │   ├── src/
│   │   │   ├── server.ts             # Entry point (CORS dinámico con logs)
│   │   │   ├── env.ts                # Validación de variables de entorno (Zod)
│   │   │   ├── routes/               # Rutas REST (auth, patients, photos, etc.)
│   │   │   ├── middleware/            # Auth middleware (JWT)
│   │   │   └── lib/                  # Utilidades (jwt, errors, permissions)
│   │   ├── .env                      # ⚡ Entorno ACTIVO (local o supabase)
│   │   ├── .env.local                # 🏠 Respaldo de credenciales locales
│   │   └── .env.supabase             # ☁️ Respaldo de credenciales Supabase
│   │
│   └── dashboard/                    # Frontend React + Vite
│       ├── src/
│       │   ├── App.tsx
│       │   ├── features/             # Módulos (patients, agenda, billing, etc.)
│       │   ├── components/           # UI compartida (Header, Sidebar, Modal)
│       │   ├── lib/                  # API client, auth, helpers
│       │   └── styles/               # CSS del tema
│       ├── .env.local                # VITE_API_URL (local: http://127.0.0.1:4000)
│       └── vite.config.ts
│
├── netlify.toml                      # Config historica de Netlify
├── render.yaml                       # Blueprint historico/alternativo de Render
├── package.json                      # Scripts raíz del monorepo
├── pnpm-workspace.yaml               # Workspace config
└── .gitignore                        # Protege .env, .env.supabase, .env.local
```

---

## 🔄 Flujo de Trabajo: Local vs Producción

### Desarrollo Local (día a día)
```powershell
# Tu .env ya apunta a PostgreSQL local por defecto
pnpm dev                              # Levanta API + Dashboard
```

### Conectar al PostgreSQL de Supabase heredado (solo si se requiere)
```powershell
copy apps\api\.env.supabase apps\api\.env
pnpm --filter @derma-os/api exec prisma migrate deploy
```

No ejecutar `db:seed`: el seed actual limpia datos y no debe formar parte de un despliegue.
La produccion objetivo vigente usa PostgreSQL local en la VPS; este cambio de `.env` no forma parte del flujo normal.

### Volver a local (después de migrar)
```powershell
copy apps\api\.env.local apps\api\.env
```

### Desplegar a producción (cuando estés listo)
1. Revisar, probar, crear commit y hacer push a GitHub.
2. En la VPS: obtener el commit aprobado, instalar con lockfile, regenerar Prisma, aplicar migraciones y construir.
3. Reiniciar `derma-api`, recargar Nginx y ejecutar las pruebas posteriores al despliegue.

Un push no debe considerarse despliegue completo: la VPS requiere actualización, migraciones y reinicio controlados.

---

## 🔐 Variables de Entorno

### API en local (`apps/api/.env`)
```env
DATABASE_URL="postgresql://postgres:PASSWORD@127.0.0.1:5432/derma_os?schema=public"
DIRECT_URL="postgresql://postgres:PASSWORD@127.0.0.1:5432/derma_os?schema=public"
JWT_SECRET="dev-only-secret-replace-me-with-openssl-rand"
JWT_EXPIRES_IN="12h"
UPLOAD_DIR="uploads"
CORS_ORIGIN="http://localhost:5173"
PORT=4000
```

### API en VPS (producción)
| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL local de la VPS; usuario exclusivo de la API |
| `DIRECT_URL` | Conexion directa al mismo PostgreSQL para migraciones |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | `12h` |
| `CORS_ORIGIN` | `https://app.<dominio>` |
| `PAYPHONE_CREDENTIAL_KEY` | Clave fuerte para cifrar tokens Payphone por clínica |
| `PAYPHONE_API_BASE` | `https://pay.payphonetodoesposible.com/api` |
| `PLATFORM_PAYPHONE_TOKEN` | Token Payphone Business de DERMA-OS para cobrar suscripciones |
| `PLATFORM_PAYPHONE_STORE_ID` | Store ID Payphone Business de DERMA-OS |
| `PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT` | Valor mensual por defecto para links de suscripción |

### Dashboard servido por Nginx
| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.<dominio>` |

---

## 📊 Estado de Módulos (2026-06-20 — actualizado)

| Módulo | API | UI dashboard |
|---|---|---|
| Auth + permisos + auditoría | ✅ | ✅ Login + AdminView |
| Segundo factor por codigo de email | ✅ codigo separado de `mfaSecret`, expiracion y auditoria | ✅ credenciales → codigo de email |
| Pacientes (lista + ficha 7 tabs) | ✅ | ✅ lectura + escritura completa |
| Historia: evolución + recetas | ✅ CRUD completo | ✅ crear + editar + eliminar |
| Fotos | ✅ filesystem JWT | ✅ subida + slider + lightbox |
| Consentimientos | ✅ plantillas versionadas + PDF firmado + hashes + eventos | ✅ administración, firma, descarga, adenda y revocación |
| Paquetes/bonos | ✅ catálogo + venta + consumo auto | ✅ venta + abonos + historial |
| Agenda | ✅ + cobertura paquete | ✅ semanal + estados + nueva cita |
| Cobros / PayPhone | ✅ credenciales por clínica + API Link + webhook | ✅ generar + detalle + config admin |
| Facturas SRI | ✅ flujo borrador→autorizada | ✅ RIDE imprimible |
| Inventario | ✅ CRUD completo + ajuste stock | ✅ tabla + editar + eliminar + delta custom |
| Admin (usuarios/matriz/bitácora) | ✅ + reset MFA | ✅ AdminView |
| **Multi-tenant (aislamiento por clínica)** | ✅ modelo Clinic + clinicId en 12 tablas + JWT + filtros | ✅ transparente (sin cambios de UI) |
| **Demo / suscripción SaaS** | ✅ trial 7 días + bloqueo por módulo + cobro Payphone | ✅ dashboard interno `/platform` |

### Estado actual corregido (2026-07-17)

| Area | Estado actual |
|------|---------------|
| Login y registro | Registro de nueva clinica disponible desde el `login-pane`; por desarrollo local entra directo sin verificacion de email. El codigo para reactivar verificacion queda comentado en backend. |
| Email login / verificacion | Login normaliza emails a lowercase. El codigo por email sigue disponible para `mfaEnabled` cuando la verificacion productiva este activa. |
| Usuarios por clinica | `AdminView` lista, crea y edita solo usuarios de la clinica actual. Email es unico global. `professionalId` es opcional y debe pertenecer a la misma clinica. |
| Profesionales | Crear usuario no crea profesional automaticamente. Para agenda/evolucion debe existir un registro en `professionals` y el usuario puede vincularse a ese profesional. |
| Admin UI | Se removio la tabla de Bitacora de auditoria y la Matriz de permisos de la UI. Queda usuarios + Payphone por clinica. |
| Multi-tenant | Rutas criticas validan IDs cruzados por `clinicId`: evolucion, recetas, procedimientos, paquetes y agenda. |
| Auth runtime | `requireAuth` consulta usuario y clinica en BD en cada request. `authVersion` invalida JWT anteriores al cambiar password, MFA, rol, email, vinculacion profesional o estado. |
| Superadmin global | Existe dashboard separado `/platform`, con login real `gerencia@undercodeec.com` + `PLATFORM_ADMIN_PASSWORD` desde `.env`, para gestionar clinicas, demos, modulos, suspension y links de suscripcion. |

### Consentimientos digitales: integridad legal y permisos (2026-07-20)

#### Principio operativo

Un consentimiento firmado se considera un registro clínico inmutable. DERMA-OS no permite sobrescribir ni eliminar su texto, datos identificativos, firma o PDF. Una aclaración posterior se registra como `adenda` o `correccion`; el retiro de la autorización se registra como `revocacion`. Todos estos eventos conservan el documento original.

ACESS describe el consentimiento informado como un proceso entre profesional y paciente: la información debe ser proporcionada por el profesional de salud, la decisión debe ser libre y voluntaria y el paciente puede revocar posteriormente su consentimiento. Referencias de diseño: [Consentimiento informado — ACESS](https://www.acess.gob.ec/consentimiento-informado/), [LOPDP — Registro Oficial 459](https://www.registroficial.gob.ec/quinto-suplemento-al-registro-oficial-no-459/) y [Reglamento General LOPDP — Registro Oficial 435](https://www.registroficial.gob.ec/tercer-suplemento-al-registro-oficial-no-435/).

La implementación técnica ayuda a demostrar integridad y trazabilidad, pero los textos y procedimientos deben ser revisados por asesoría jurídica ecuatoriana especializada en salud y protección de datos antes del uso productivo.

#### Flujo implementado

1. El administrador crea una plantilla manual o importa PDF/DOCX.
2. El documento fuente se conserva intacto con huella SHA-256 y el texto extraído se convierte en borrador.
3. El administrador revisa y aprueba el borrador. Una versión aprobada queda bloqueada también mediante trigger PostgreSQL.
4. Un rol clínico autorizado genera el documento para el paciente usando únicamente una plantilla aprobada.
5. Al crear el documento se congelan nombre e identificación del paciente, clínica, título, tipo, versión y texto legal.
6. El paciente lee, acepta y dibuja su firma; el usuario de la clínica únicamente facilita la captura y nunca firma en nombre del paciente.
7. Al firmar se generan y almacenan:
   - fecha/hora, IP, agente de usuario y usuario que facilitó la captura;
   - hash SHA-256 del contenido normalizado;
   - hash SHA-256 de la firma;
   - PDF definitivo con logo y datos congelados;
   - hash SHA-256 del PDF.
8. El PDF firmado se almacena en PostgreSQL como evidencia final y no se regenera en descargas posteriores. Antes de descargarlo se verifica su hash.
9. Adendas, correcciones y revocaciones se guardan en `consent_events`, encadenadas criptográficamente y protegidas contra `UPDATE` y `DELETE`.
10. La auditoría nueva utiliza `previous_hash` y `entry_hash`, se serializa por clínica y también queda protegida contra modificaciones o eliminaciones.

#### Matriz de autorización

| Acción | Admin | Profesional | Esteticista | Recepción | Contador |
|---|---:|---:|---:|---:|---:|
| Crear/importar/editar borrador de plantilla | Sí | No | No | No | No |
| Aprobar o archivar plantilla | Sí | No | No | No | No |
| Generar consentimiento para paciente | Sí | Sí, si la plantilla lo autoriza | Solo en plantillas habilitadas expresamente | No | No |
| Explicar riesgos y alternativas clínicas | Solo si además es responsable clínico | Sí | Solo dentro de su ámbito | No | No |
| Facilitar captura de firma del paciente | Sí | Sí | Sí | Sí | No |
| Consultar y descargar | Sí | Sí | Sí | Sí | No |
| Registrar adenda, corrección o revocación | Sí | Sí | No | No | No |
| Modificar o eliminar después de firmado | No | No | No | No | No |

El personal de plataforma DERMA-OS no obtiene acceso ordinario a documentos clínicos mediante estas rutas. Cualquier futuro acceso excepcional de soporte deberá ser temporal, justificado, limitado al tenant y auditado como mecanismo `break-glass`.

#### Controles de base de datos

La migración `20260720010000_immutable_signed_consents` agrega:

- evidencia final y hashes a `consents`;
- `allowed_roles` por plantilla; por defecto solo `admin` y `profesional`, con habilitación explícita opcional para `esteticista`;
- tabla append-only `consent_events`;
- hashes encadenados en `audit_logs`;
- trigger que impide modificar/eliminar consentimientos firmados o revocados;
- trigger que impide cambiar contenido de plantillas aprobadas;
- triggers que impiden actualizar/eliminar eventos y auditorías.

La transición controlada `firmado → revocado` solo puede añadir estado, fecha, motivo y responsable de revocación; todos los campos del documento original deben permanecer idénticos. Un superusuario/propietario de PostgreSQL siempre tiene capacidad técnica para deshabilitar triggers, por lo que en producción la API debe usar una cuenta de base de datos sin privilegios de propietario y las migraciones deben ejecutarse con una cuenta separada.

#### Estado de despliegue

- Código, esquema y migración: implementados en el repositorio.
- Pruebas automatizadas: incluyen generación, hash y extracción de PDF; deben ejecutarse antes de desplegar.
- Base local de esta estación: migración pendiente porque las credenciales PostgreSQL actuales fueron rechazadas con `P1000`.
- VPS: aplicar las migraciones `20260720000000_consent_template_workflow` y `20260720010000_immutable_signed_consents`, regenerar Prisma, reconstruir API/dashboard y reiniciar `derma-api`.
- Antes del piloto: ejecutar prueba de alteración directa con el usuario de la API, descarga/verificación de PDF, revocación, aislamiento entre clínicas y restauración desde backup.

### Auditoria integral de logica, datos y alineacion documental (2026-07-21)

#### Veredicto

La aplicacion compila y las pruebas unitarias existentes pasan, pero no debe considerarse lista para un piloto con pacientes y cobros reales hasta cerrar los bloqueantes siguientes. La auditoria fue de codigo activo, esquema, migraciones, API, dashboard, dependencias y contraste con este documento, `CONSENTIMIENTOS.md` y la investigacion historica de necesidades dermatologicas.

#### Hallazgos prioritarios confirmados

1. **Autorizacion por modulo incompleta**
   - Varias subrutas de paciente comprueban `pacientes`, pero no `historia`, `fotos`, `procedimientos` o `paquetes` para cada lectura.
   - Busqueda global, profesionales y catalogo de consentimientos exigen autenticacion, pero no siempre el modulo correspondiente.
   - La matriz frontend incluye `Limitado` como escritura mientras backend lo rechaza.

2. **Integridad de agenda y sesiones**
   - Las transiciones de cita no tienen maquina de estados; una cita atendida puede pasar a cancelada y luego eliminarse, dejando una redencion sin cita.
   - El `PATCH` permite rangos horarios invalidos y no impide solapamientos del mismo profesional.

3. **Paquetes y abonos**
   - Cambiar el servicio de un paquete ya vendido altera retroactivamente el servicio que cubren sus saldos.
   - Los abonos manuales y Payphone no limitan el total al precio/saldo pendiente ni bloquean estados no cobrables.

4. **Inventario**
   - Los ajustes leen y luego sobrescriben stock; dos consumos concurrentes pueden perderse.
   - Un consumo superior al disponible queda truncado a cero, pero la auditoria registra el delta completo solicitado.

5. **Suscripciones de plataforma**
   - Pagos o extensiones concurrentes pueden calcular desde la misma fecha y perder meses pagados.
   - La suma de meses con `Date.setMonth()` produce desbordes en fechas de fin de mes.

6. **Consentimientos**
   - La firma solo valida el prefijo base64; un PNG invalido puede marcar el documento como firmado y generar PDF sin firma visible.
   - La descarga no exige estado firmado.
   - La cadena hash de auditoria no cubre login, registro, plataforma y webhooks porque esas rutas crean entradas directas sin hash.

7. **Autenticacion**
   - La implementacion activa usa codigo por email y borra `mfaSecret`; el MFA TOTP descrito historicamente ya no esta operativo.
   - La confirmacion de recuperacion de contrasena no reclama atomicamente el codigo y los JWT anteriores no se revocan al cambiar password.

8. **Defensa multi-tenant en base de datos**
   - La aplicacion valida muchos IDs por `clinicId`, pero faltan restricciones compuestas/RLS que impidan relaciones cruzadas si una ruta futura omite el filtro.

9. **Despliegue y configuracion**
   - `render.yaml` y los `.env.example` no incluyen todas las variables requeridas por esquema y validacion de produccion, especialmente `DIRECT_URL` y secretos de plataforma.
   - El dashboard conserva cliente de `/invoices`, pero el servidor no monta ese router aunque `INVOICES_ENABLED=true`.

10. **Dependencias y controles automaticos**
    - `pnpm audit --prod`: una vulnerabilidad moderada en `mammoth` y una baja en `body-parser`.
    - `pnpm lint` falla porque ESLint no esta instalado.
    - Las 11 pruebas existentes son unitarias; faltan pruebas HTTP/BD con dos clinicas, concurrencia, permisos, migraciones y webhooks.

#### Validaciones ejecutadas durante la auditoria

- Prisma schema validate: OK.
- Typecheck API y dashboard: OK.
- Build API y dashboard: OK; dashboard transformo 968 modulos.
- Suite API: 11/11 pruebas aprobadas con variables de entorno de prueba.
- `pnpm audit --prod`: 1 moderada y 1 baja.
- Lint: no ejecutable por dependencia ESLint ausente.
- Migraciones dinamicas: no verificadas en esta sesion; PostgreSQL local estaba activo pero no habia credenciales disponibles y Docker no inicio.

#### Orden de correccion autorizado

1. Cerrar autorizacion por modulo y unificar permisos frontend/backend.
2. Implementar invariantes y concurrencia segura para agenda, paquetes, inventario y suscripciones.
3. Validar firma binaria, estado del PDF y cadena completa de auditoria.
4. Corregir recuperacion de password y definir MFA real sin reutilizar `mfaSecret` para mecanismos incompatibles.
5. Agregar restricciones multi-tenant de segunda barrera mediante migracion validada sobre copia temporal.
6. Corregir configuracion de despliegue, dependencias, lint y contradicciones documentales.
7. Añadir pruebas de regresion HTTP/BD antes de desplegar o usar datos reales.

#### Correcciones aplicadas a partir de la auditoria (2026-07-21)

- **Permisos y autoria:** las lecturas clínicas de pacientes exigen su módulo real (`historia`, `procedimientos`, `paquetes`, `facturacion` y `fotos`); búsqueda y plantillas verifican módulo; `Limitado` ya no equivale a escritura en frontend; profesionales y esteticistas no pueden atribuir actividad clínica a otro profesional.
- **Agenda:** se implementó máquina de estados, bloqueo de registros terminales, validación de rangos, rechazo de solapamientos y bloqueo transaccional por profesional. Solo una cita aún `agendada` puede eliminarse.
- **Paquetes y cobros:** el servicio de un paquete vendido es inmutable; abonos manuales y Payphone se serializan por saldo y no pueden superar la deuda. La generación de links reserva importes pendientes antes de llamar al proveedor y deja el registro anulado si Payphone falla.
- **Inventario:** reposiciones y consumos usan incrementos/decrementos atómicos; ya no se trunca silenciosamente un consumo sin stock.
- **Suscripciones:** los pagos y extensiones se serializan por clínica y la suma de meses respeta correctamente el último día del mes.
- **Consentimientos:** la firma debe ser un PNG binario con cabecera y dimensiones válidas, PDFKit debe poder decodificarlo y un documento pendiente no puede descargarse como PDF legal. La descarga usa `private, no-store`.
- **Autenticación:** códigos de email separados de `mfaSecret`, recuperación de contraseña de un solo uso reclamada atómicamente y revocación de JWT mediante `authVersion`.
- **Auditoría:** login, registro, plataforma y webhooks usan la misma cadena hash serializada por clínica; no quedan escrituras directas a `audit_logs` fuera del helper encadenado.
- **Base de datos:** migraciones `20260721000000_harden_auth_sessions` y `20260721010000_tenant_integrity_barrier`; esta última detiene el despliegue si encuentra cruces históricos y crea claves foráneas compuestas para agenda, paquetes, saldos y pagos.
- **Despliegue:** `/invoices` se monta cuando `INVOICES_ENABLED=true`; ejemplos y `render.yaml` incluyen `DIRECT_URL`, secretos de plataforma, SMTP y almacenamiento de fotos. Producción rechaza SMTP incompleto.
- **Calidad y dependencias:** `mammoth` actualizado, `body-parser` forzado a versión corregida, ESLint 9 con configuración plana y lint funcional.

#### Validacion posterior a las correcciones

- Prisma validate y generación de cliente: OK.
- Migraciones desde base PostgreSQL 16 vacía: 14/14 aplicadas; `prisma migrate status`: al día.
- Diferencia BD → Prisma: migración vacía, sin deriva.
- Prueba negativa multi-tenant: PostgreSQL rechazó `appointments.patient_id` de otra clínica mediante `appointments_patient_same_clinic_fkey`.
- Suite API: 14/14 pruebas aprobadas.
- Typecheck y build API: OK.
- Typecheck, lint y build dashboard: OK; 973 módulos transformados.
- `pnpm audit --prod`: sin vulnerabilidades conocidas.

#### Pendientes que no deben ocultarse

1. Agregar pruebas HTTP/BD automatizadas con dos clínicas, concurrencia real de webhooks/abonos/agenda y autorización por rol; en esta sesión se validaron migraciones y una barrera multi-tenant directamente en PostgreSQL, pero la suite permanente sigue siendo principalmente unitaria.
2. Extender la segunda barrera multi-tenant a relaciones indirectas sin `clinic_id` (`clinical_records`, `procedures`, `photos`, `consents` y eventos) mediante columnas de clínica o triggers validados.
3. Decidir producto de MFA: el flujo activo y documentado es segundo factor por email. El TOTP histórico de junio no está conectado a las rutas/UI actuales y no debe anunciarse como disponible hasta reimplementarlo y probarlo.
4. Vigilar el tamaño del bundle del dashboard; el build final del 2026-07-22 produce un chunk principal de 447.98 kB minificado (126.67 kB gzip), por lo que el valor histórico de ~933 kB ya no reproduce.

### Siguientes pasos de desarrollo - Fichas clinicas imprimibles en PDF

Objetivo: crear una logica para generar fichas clinicas del paciente y permitir imprimirlas/exportarlas en PDF. El diseno final del PDF queda pendiente de definicion.

Flujo propuesto:

1. **Definir contenido de la ficha clinica**
   - Datos del paciente: nombres, identificacion, edad, sexo, contacto.
   - Antecedentes clinicos relevantes.
   - Evoluciones SOAP.
   - Recetas emitidas.
   - Procedimientos realizados.
   - Consentimientos vinculados.
   - Fotos clinicas seleccionadas si aplica.
   - Firma o datos del profesional responsable.

2. **Crear endpoint backend de ficha clinica — implementado 2026-07-22**
   - Ruta sugerida: `GET /patients/:id/clinical-file`.
   - Debe validar que el paciente pertenece a `req.user.clinicId`.
   - Debe consolidar informacion desde `patients`, `clinical_records`, `procedures`, `consents`, `photos` y `professionals`.
   - Debe devolver JSON estructurado primero, antes de generar PDF, para facilitar pruebas y UI.

3. **Crear vista previa en dashboard — implementado 2026-07-22**
   - Agregar accion en ficha del paciente: `Ficha clinica`.
   - Mostrar preview HTML con secciones ordenadas.
   - Permitir filtros: rango de fechas, incluir/excluir recetas, fotos, procedimientos o consentimientos.
   - Permitir seleccionar profesional firmante si aplica.

4. **Generacion de PDF — primera opcion implementada 2026-07-22**
   - Primera opcion pragmatica: renderizar HTML imprimible y usar `window.print()` o CSS `@media print`.
   - Segunda etapa: generar PDF desde backend para descarga consistente.
   - Evaluar motor: HTML -> PDF con Playwright/Puppeteer en backend, o generacion directa con libreria PDF.
   - Guardar o no guardar el PDF debe decidirse: descarga temporal vs archivo historico.

5. **Diseno pendiente**
   - Definir encabezado: logo, datos de clinica, RUC, direccion, telefono.
   - Definir estructura visual: una pagina resumen + anexos, o ficha cronologica completa.
   - Definir si lleva numeracion, sello/firma, disclaimer legal y fecha de impresion.
   - Definir tratamiento de fotos: miniaturas, anexos por pagina o exclusion por defecto.

6. **Seguridad y auditoria**
   - Solo roles `admin` y `profesional` pueden generar e imprimir fichas clinicas completas.
   - Roles `recepcion`, `esteticista` y `contador` no deben generar ni imprimir fichas clinicas completas.
   - Registrar auditoria al generar/imprimir ficha clinica.
   - Respetar aislamiento por clinica.
   - No exponer fotos o documentos sin JWT.
   - Considerar marca de agua o pie con fecha/usuario que imprime.

7. **Implementacion recomendada por fases**
   - Fase 1: endpoint JSON consolidado + preview HTML en paciente.
   - Fase 2: CSS print y boton imprimir/exportar.
   - Fase 3: PDF backend con plantilla definitiva.
   - Fase 4: historico de PDFs generados si se requiere trazabilidad legal.

### Pendientes
| Item | Prioridad |
|------|-----------|
| Validar MFA de `/platform` con SMTP real en VPS | Alta — SMTP, registro y recuperación ya funcionan; falta confirmar el challenge del superadmin |
| Validar dashboard interno `/platform` con `PLATFORM_REGISTER_KEY` antes de ventas piloto | Alta — controla demos y accesos |
| Confirmar el primer workflow CI en GitHub | Alta — workflow con PostgreSQL efimero publicado en `c187d7c`; falta observar y confirmar el runner |
| Definir si el segundo factor clinico seguira por email o si se reimplementara TOTP | Media — TOTP pertenece al flujo historico y no esta conectado a la UI/rutas actuales |
| Definir flujo usuario/profesional | Media - hoy son entidades separadas; opcionalmente agregar "crear profesional asociado" al crear usuario clinico |
| Vigilar y dividir el bundle principal del dashboard si vuelve a crecer | Baja — build actual: 449.69 kB minificado / 127.17 kB gzip |
| Sitio comercial `apps/site` | Baja — diseño antes que código |
| Firma `.p12` + webservice SRI real | Baja — fuera de alcance demo |
| Payphone real por clínica y para suscripciones | Final — activación externa, credenciales, webhooks y conciliación quedan diferidos por decisión del propietario |
| Respaldos automáticos y prueba de restauración | Final — PostgreSQL y `uploads` quedan diferidos por decisión del propietario |

---

## 🛠️ Historial de Cambios de Infraestructura

### 2026-06-18 — Deploy inicial y migración a Supabase

1. **Archivos de deploy creados:**
   - `netlify.toml` — Config de Netlify con SPA redirect y headers de seguridad
   - `render.yaml` — Blueprint de Render (API + PostgreSQL)

2. **Fix: orden de build en Render**
   - `npx prisma generate` ahora se ejecuta **antes** de `tsc` para que TypeScript
     encuentre los tipos generados de Prisma (`Role`, `PatientWhereInput`, etc.)

3. **Fix: ruta del servidor compilado**
   - TypeScript preserva la estructura de carpetas al compilar, por lo que el
     archivo queda en `dist/src/server.js` (no `dist/server.js`)
   - Corregido en `render.yaml` y `apps/api/package.json`

4. **Fix: sistema CORS mejorado**
   - Se reemplazó la config estática de CORS por un validador dinámico con logs
   - Al iniciar el servidor se muestra: `[cors] allowed origins: [...]`
   - Orígenes bloqueados se loguean: `[cors] BLOCKED origin: "..."`

5. **Migración de BD: Render PostgreSQL → Supabase**
   - Se agregó `directUrl` al `schema.prisma` para soportar pgBouncer de Supabase
   - Se crearon archivos `.env.local` y `.env.supabase` para cambio rápido de entorno
   - Se protegieron ambos archivos en `.gitignore`

### 2026-06-18/20 — Funcionalidades MVP

1. **MFA TOTP nativo** (`apps/api/src/lib/totp.ts`)
   - RFC 6238 + RFC 4226, HMAC-SHA1, base32, ventana ±1 — sin dependencias nuevas
   - `POST /auth/login` devuelve `{mfaSetup}` o `{mfaRequired}` según estado
   - `POST /auth/mfa/verify-setup` confirma primer token y finaliza login
   - `POST /admin/users/:id/mfa/reset` limpia `mfa_secret` (admin)
   - Migración `20260618120000_add_mfa_secret`: columna `mfa_secret TEXT` en `users`
   - Dashboard: 3 pasos (credenciales → QR setup con `api.qrserver.com` → código TOTP)

2. **Edit/delete historia clínica**
   - `PATCH /patients/:id/evolucion/:rid` + `DELETE` (con auditoría)
   - `PATCH /patients/:id/recetas/:rid` + `DELETE` (con auditoría)
   - `NewEvolucionModal` y `NewRecetaModal` aceptan `edit?` prop
   - `TabEvolucion` y `TabRecetas` con botones pen/trash por registro

3. **Inventario: mutaciones completas**
   - `PATCH /inventory/:id` — editar campos (nombre, tipo, unidad, mínimo, lote, venc.)
   - `DELETE /inventory/:id` — eliminar ítem con auditoría
   - `NewItemModal` acepta `edit?` prop (oculta stock inicial al editar)
   - `InventoryView`: botones pen/trash por fila; columna Ajustar con input delta + −/+

4. **Seed reducido** *(superado el 2026-07-17)*
   - En ese momento se redujo a usuarios mínimos para pruebas
   - Estado actual: `seed.ts` no crea usuarios, clínicas ni registros demo

### 2026-06-20 — Multi-tenant por clínica

1. **Modelo de tenant `Clinic`** (`schema.prisma`)
   - Nueva tabla `clinics` (id, name, ruc, public_key, active)
   - `clinicId` agregado a 12 tablas: users, patients, professionals, services, packages, package_balances, inventory, invoices, audit_logs, consent_templates, appointments, payments
   - Índice `clinic_id_idx` en cada tabla; único compuesto `[clinicId, idType, idNumber]` en patients

2. **Migración** (`20260620000000_add_clinic_tenant/migration.sql`)
   - Inserta clínica demo UUID fijo `00000000-0000-4000-9000-000000000001`
   - Agrega columnas con DEFAULT para backfill de datos existentes
   - Elimina DEFAULT al final (nuevas filas requieren `clinicId` explícito)

3. **JWT y middleware** (`lib/jwt.ts`, `middleware/auth.ts`)
   - `TokenPayload` incluye `clinicId`
   - `req.user` expone `clinicId` en todo el ciclo de request

4. **Capa de aplicación — filtrado automático** (todas las rutas)
   - Reads: `where: { clinicId: req.user!.clinicId, ... }`
   - Writes: `data: { clinicId: req.user!.clinicId, ... }`
   - Sub-recursos protegidos vía `router.param('id', ...)` en `patients.ts`
   - Acceso por ID verificado con `findFirst({ where: { id, clinicId } })`

5. **Auditoría** (`lib/audit.ts`)
   - `auditLog.create` incluye `clinicId` → bitácora aislada por clínica

6. **Registro de nueva clínica** (`routes/clinics.ts`, `POST /clinics/register`)
   - Crea clínica + usuario admin en una transacción
   - Devuelve JWT ya autenticado con el clinicId de la nueva clínica

7. **Seed actualizado** (`prisma/seed.ts`)
   - Crea la clínica antes que profesionales/usuarios
   - Todos los registros llevan `clinicId: ID.clinic`

### 2026-07-17 — Payphone real por clínica (modelo pragmático)

1. **Credenciales Payphone aisladas por clínica**
   - Nueva tabla `clinic_payment_providers`
   - Relación 1:1 con `Clinic` mediante `clinicId`
   - Modo inicial `manual`: cada clínica ingresa su `storeId` y token Payphone Business/API
   - Token cifrado en backend con AES-256-GCM (`PAYPHONE_CREDENTIAL_KEY` o `JWT_SECRET`)
   - No existe token Payphone global ni compartido entre clínicas

2. **Panel Admin**
   - `GET /admin/payphone` devuelve estado seguro de configuración sin exponer token
   - `PUT /admin/payphone` guarda RUC, Store ID, token y estado activo/desactivado
   - UI agregada en Sistema → Payphone por clínica

3. **Cobros con API Link**
   - `POST /payments` ya no genera links simulados
   - Antes de cobrar, el backend carga credenciales por `req.user.clinicId`
   - Llama a `POST https://pay.payphonetodoesposible.com/api/Links`
   - Guarda `clientTransactionId`, `payphoneStoreId`, `providerStatus` y `providerPayload`
   - Si la clínica no configuró Payphone, la API rechaza el cobro con error claro

4. **Webhook de conciliación**
   - Nuevo endpoint público: `POST /payments/payphone/NotificacionPago`
   - Valida `StoreId`, `ClientTransactionId`, estado aprobado y monto en centavos
   - Marca el cobro como `pagado`
   - Si el cobro corresponde a paquete, registra el abono automáticamente
   - Idempotente: si el cobro ya está pagado, responde exitosamente sin duplicar abonos

5. **Ruta futura**
   - Mantener `mode = manual` para salir rápido a producción
   - Migrar luego a Token de terceros / comercio aliado Payphone para onboarding SaaS sin copiar credenciales manualmente

### 2026-07-17 — Demo 7 días y suscripciones DERMA-OS

1. **Estado comercial por clínica**
   - Nueva tabla `clinic_subscriptions`
   - Estados: `pending_verification`, `trialing`, `active`, `expired`, `suspended`
   - Fechas: `trial_started_at`, `trial_ends_at`, `subscription_ends_at`
   - `allowed_modules` define qué módulos puede usar cada clínica

2. **Bloqueo automático por demo/suscripción**
   - `requireModule()` ahora valida permisos por rol y acceso comercial por clínica
   - Si la demo o suscripción vence, los módulos quedan bloqueados
   - El bloqueo se calcula en tiempo real; no requiere cron inicial

3. **Dashboard interno de plataforma**
   - Nueva ruta frontend `/platform`
   - Acceso mediante `PLATFORM_REGISTER_KEY`
   - Lista clínicas, estado comercial, días restantes, admin principal y módulos habilitados
   - Permite activar demo 7 días, extender 1 mes manualmente, suspender y guardar módulos

4. **Cobro de suscripción con Payphone Business de DERMA-OS**
   - Nuevas variables: `PLATFORM_PAYPHONE_TOKEN`, `PLATFORM_PAYPHONE_STORE_ID`, `PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT`
   - `POST /platform/clinics/:id/payment-link` genera link mensual con API Link
   - Nueva tabla `platform_subscription_payments`
   - Webhook público: `POST /platform/payphone/NotificacionPago`
   - Al confirmar pago, extiende `subscription_ends_at` según los meses pagados

5. **Ruta futura escalable**
   - Automatizar recordatorios antes de vencimiento
   - Agregar planes formales y límites por plan
   - Migrar a Suscripciones recurrentes Payphone cuando Payphone habilite el producto en la cuenta Business

### 2026-07-17 — Testing y hardening de seguridad Payphone / demo

1. **Llave interna de plataforma**
   - `requirePlatformKey()` ahora compara `PLATFORM_REGISTER_KEY` con `crypto.timingSafeEqual`
   - Rechaza headers múltiples en `x-platform-key`
   - El dashboard `/platform` guarda la llave en `sessionStorage`, no en `localStorage`

2. **Webhooks Payphone idempotentes**
   - `/payments/payphone/NotificacionPago` solo concilia pagos en estado `pendiente`
   - `/platform/payphone/NotificacionPago` solo extiende suscripciones en estado `pendiente`
   - Se usa actualización atómica por estado para evitar doble conciliación o doble extensión por notificaciones concurrentes/repetidas

3. **IDs y límites defensivos**
   - `clientTransactionId` ahora usa `crypto.randomBytes`, no `Math.random`
   - Demo limitado a máximo 30 días por request interno
   - Extensión y links de suscripción limitados a máximo 24 meses
   - Monto de link de suscripción limitado a máximo 10000

4. **Validación ejecutada**
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - `git diff --check`: OK
   - Escaneo puntual: no se devuelve token Payphone al frontend; solo `storeId` y `hasToken`
   - No se pudo ejecutar audit de dependencias porque el runtime local solo expuso `node.exe`

### 2026-07-17 — Migracion local Prisma completada

1. **Migraciones aplicadas en PostgreSQL local**
   - `20260717000000_add_payphone_provider`
   - `20260717001000_add_clinic_subscriptions`
   - `20260717010000_add_login_email_code_fields`
   - Estado confirmado con `prisma migrate status`: `Database schema is up to date!`

2. **Prisma Client**
   - Se detuvieron temporalmente los servidores dev que bloqueaban `query_engine-windows.dll.node`
   - `prisma generate` finalizo correctamente
   - Typecheck API y dashboard quedaron OK despues de regenerar cliente

3. **Verificacion runtime local**
   - API activa en `http://127.0.0.1:4000/health` con respuesta 200
   - Dashboard activo en `http://localhost:5173/`
   - Tablas nuevas verificadas por Prisma:
     - `clinic_subscriptions=0`
     - `platform_subscription_payments=0`

4. **Pendiente de produccion**
   - Repetir `migrate deploy` contra Supabase/Render antes del piloto
   - Configurar `PLATFORM_PAYPHONE_TOKEN` y `PLATFORM_PAYPHONE_STORE_ID` en Render

### 2026-07-17 — Base limpia sin usuarios precargados

1. **Seed y clean sin datos demo**
   - `prisma/seed.ts` ya no crea clínica, profesionales ni usuarios demo
   - `prisma/clean.ts` elimina todos los registros y no recrea admin demo
   - No quedan credenciales demo históricas

2. **Migración de seguridad para base nueva**
   - Nueva migración `20260717020000_remove_empty_demo_clinic`
   - Elimina la clínica demo histórica solo si está vacía
   - Bases antiguas con datos reales no pierden información por esta migración

3. **Estado local verificado**
   - PostgreSQL local quedó con `clinics=0`, `users=0`, `professionals=0`, `patients=0`
   - También quedaron en cero `services`, `clinic_subscriptions`, `platform_subscription_payments` y `audit_logs`
   - `prisma migrate status`: `Database schema is up to date!`

### 2026-07-17 — Commit/push y prueba local manual

1. **Commit publicado**
   - Commit: `722f2cd Add SaaS trial subscriptions and clean seed data`
   - Push realizado a `origin/main`
   - Incluye demo/suscripcion SaaS, dashboard `/platform`, migraciones, hardening Payphone, seed limpio y documentacion

2. **Procesos locales**
   - Se cerraron procesos duplicados de `pnpm dev` que ocupaban `4000`, `5173` y `5174`
   - Para uso manual, levantar solo una instancia con `pnpm dev`
   - API esperada: `http://127.0.0.1:4000/health`
   - Dashboard esperado: `http://localhost:5173/`

3. **Prueba local de primer tenant**
   - Se valido que una base limpia no permite login hasta crear una clinica/admin
   - Se creo un tenant local de prueba por `POST /clinics/register` usando `PLATFORM_REGISTER_KEY`
   - Se valido login con el admin creado manualmente
   - Se activo demo de 7 dias desde `/platform/clinics/:id/trial`
   - Este usuario local no pertenece al seed ni queda precargado en el repositorio

---

### 2026-07-17 - Registro, usuarios por clinica y hardening multi-tenant

1. **Registro en UI de login**
   - `LoginScreen` incluye formulario de registro dentro de `.login-pane`
   - Texto de cambio desde login: usuario sin cuenta puede ir a registro sin pagina nueva
   - Registro temporal de desarrollo entra directo sin verificacion de email
   - El flujo de verificacion por email queda documentado/comentado para reactivarse despues de pruebas

2. **Variables SMTP**
   - `.env` local y ejemplos incluyen variables SMTP para envio de codigos por email
   - Variables relevantes: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `AUTH_EMAIL_SUBJECT`

3. **Usuarios de clinica**
   - `AdminView` permite crear y editar usuarios
   - Usuarios se guardan en tabla `users`
   - Cada usuario queda asociado por `clinicId`
   - `professionalId` es opcional y solo puede apuntar a un profesional de la misma clinica
   - Crear usuario no crea automaticamente un profesional para evitar ensuciar la logica de agenda/historia

4. **Profesionales**
   - Agenda y evolucion siguen leyendo desde tabla `professionals`
   - Si un usuario debe aparecer como profesional en agenda/evolucion, debe existir tambien en `professionals`
   - El usuario puede vincularse luego al profesional correcto desde AdminView

5. **Aislamiento multi-tenant reforzado**
   - Se normaliza email a lowercase en registro, verificacion y login
   - `requireAuth` valida usuario y clinica contra BD en cada request
   - Rutas de evolucion, recetas, procedimientos, paquetes y agenda validan `professionalId` por `clinicId`
   - Procedimientos validan `serviceId` por `clinicId`
   - Al marcar cita como `atendida`, consumo de paquete usa el profesional actualizado

6. **Admin UI simplificada**
   - Se elimino de UI la Bitacora de auditoria del menu usuarios/auditoria
   - Se elimino de UI la Matriz de permisos
   - Queda administracion de usuarios y Payphone por clinica

7. **Superadmin global**
   - Dashboard separado `/platform`
   - Login real con `gerencia@undercodeec.com` y password desde `PLATFORM_ADMIN_PASSWORD`
   - La validacion por email antes de ingresar queda comentada temporalmente para pruebas
   - Gestiona clinicas, demo, modulos, suspension, extension y links de suscripcion
   - No mezcla datos operativos de pacientes/evoluciones/agendas con admin de clinica

8. **Validacion ejecutada**
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - Build dashboard Vite: OK

### 2026-07-18 - Correcciones derivadas de auditoria de seguridad e integridad

Estas correcciones nacen de la auditoria documentada en
[`ProyectosMD/AUDITORIA_CODIGO_SEGURIDAD_2026-07-18.md`](./AUDITORIA_CODIGO_SEGURIDAD_2026-07-18.md).
Consultar ese documento en proximas sesiones para conservar el contexto, severidad,
evidencia y plan de pruebas original.

1. **Borrado destructivo protegido - hallazgo critico C-01 cerrado en codigo**
   - `prisma/seed.ts` ya no elimina datos; ahora es una operacion vacia y segura
   - `prisma/clean.ts` se bloquea siempre en `NODE_ENV=production`
   - En entornos no productivos exige `ALLOW_DATABASE_WIPE=I_UNDERSTAND_THIS_DELETES_ALL_DATA`
   - Prueba ejecutada: `seed` no modifico la base y `clean` rechazo la ejecucion sin confirmacion

2. **Pagos y abonos atomicos - H-01 y H-03 corregidos**
   - La conciliacion manual reclama el pago pendiente con `updateMany` dentro de una transaccion
   - Webhook y conciliacion manual ya no pueden acreditar normalmente el mismo cobro dos veces
   - Cada `PackagePayment` puede vincularse a un solo `Payment` mediante `paymentId @unique`
   - Un cobro de paquete exige que balance, paciente y clinica coincidan
   - Cobros de factura validan factura/paciente/clinica y conceptos libres rechazan referencias ajenas
   - Webhooks aprobados exigen `TransactionId` y se agrega unicidad por tienda/transaccion

3. **Consumo de sesiones y agenda - H-02 corregido**
   - `PackageRedemption.appointmentId` pasa a ser unico
   - Incremento de sesiones usa reclamacion optimista y transaccion con reintentos controlados
   - Una cita atendida no puede eliminarse por la ruta comun
   - `nextAppointment` se recalcula al crear, editar, cancelar o eliminar citas
   - El consumo filtra tambien `clinicId`

4. **Permisos efectivos y alcance profesional - H-04 corregido**
   - `requireAuth` carga `professionalId` desde BD en cada request
   - Profesional y esteticista solo consultan/modifican su agenda asociada
   - Un usuario profesional sin asociacion recibe rechazo explicito
   - `Limitado` ya no concede escritura completa de historia al esteticista
   - Conciliacion de pagos y consumo de inventario tienen capacidades separadas
   - Contador puede conciliar sin obtener permiso para crear/anular cobros
   - Profesional/esteticista pueden consumir inventario, pero solo admin puede reponerlo
   - No se permite desactivar o quitar el rol al ultimo admin activo de una clinica

5. **Facturacion residual contenida - H-05 mitigado/corregido en codigo**
   - Las rutas anidadas de facturacion rechazan acceso cuando `INVOICES_ENABLED=false`
   - Servicios, precios e IVA se reconstruyen desde BD y no se confia en valores del navegador
   - RUC se toma de la clinica y debe tener 13 digitos
   - Secuencia de factura se incrementa atomicamente por clinica
   - Unicidad de numero cambia de global a `[clinicId, number]`
   - SRI real con firma `.p12` continua fuera de alcance; mantener feature flag apagada

6. **Registro, secretos y proteccion contra abuso - H-07 mitigado**
   - Registro exige codigo por email automaticamente en produccion
   - Desarrollo conserva registro directo para pruebas locales
   - Rate limit por IP/identidad en login, registro, verificacion y login de plataforma
   - Superadmin usa `PLATFORM_JWT_SECRET` separado del JWT operativo
   - Produccion exige JWT de al menos 32 caracteres, password de plataforma de al menos 12 y clave Payphone dedicada
   - API elimina `X-Powered-By` y agrega headers de seguridad
   - Pendiente: MFA real para superadmin y rate limit distribuido si Render escala a varias instancias

7. **Fotos y servicios externos - hallazgos medios mitigados**
   - Fotos aceptan firma binaria real JPEG, PNG o WebP; SVG y MIME falso se rechazan
   - Nombres de archivo usan `crypto.randomBytes`
   - Si falla la creacion en BD, se elimina el archivo recien escrito
   - Upload limitado por usuario/clinica y por tamano
   - Payphone y SMTP tienen timeout de 15 segundos
   - Links de suscripcion fallidos quedan con estado `fallido` en vez de aparentar pendientes validos
   - Pendiente externo: mover fotos a almacenamiento privado persistente y definir limpieza de huerfanos

8. **Auditoria de plataforma**
   - Cambios de acceso, demo, extension y links de suscripcion generan `audit_logs`
   - Se registra clinica, accion, detalle e IP; usuario queda `null` porque el superadmin no es un `User` de tenant

9. **Migracion aplicada localmente; produccion pendiente**
   - `20260718000000_harden_payment_and_redemption_integrity`
   - Agrega `package_payments.payment_id` unico y FK a `payments`
   - Agrega unicidad de `package_redemptions.appointment_id`
   - Agrega secuencia de factura por clinica y unicidad compuesta
   - Agrega unicidad de transacciones Payphone confirmadas
   - `prisma migrate deploy` local: OK; las 8 migraciones quedaron aplicadas
   - Antes de `migrate deploy` en produccion, revisar si existen redenciones duplicadas por cita

10. **Pruebas y validacion ejecutadas**
   - Prisma schema validate: OK
   - Prisma Client generate: OK
   - Prisma migrate deploy local: OK
   - API iniciada despues de cambios: `GET http://127.0.0.1:4000/health` responde 200
   - Typecheck API: OK
   - Typecheck dashboard: OK
   - Build dashboard Vite: OK, 966 modulos
   - Suite nueva API: 8 pruebas, 8 aprobadas
   - Casos cubiertos: permisos, conciliacion, consumo, facturacion SRI y rate limiting
   - `git diff --check`: OK; solo advertencias esperadas LF/CRLF

11. **Pendientes de la auditoria que requieren otra fase o servicio externo**
   - Pruebas dinamicas IDOR completas usando dos clinicas y una BD temporal
   - Restricciones/Row Level Security adicionales en PostgreSQL como segunda barrera multi-tenant
   - Confirmacion server-to-server o firma oficial de webhooks Payphone
   - Almacenamiento persistente privado para fotos clinicas
   - Migrar JWT operativo fuera de `localStorage` o aplicar CSP estricta tambien en frontend
   - Instalar/configurar ESLint y ejecutar audit de dependencias en CI
   - Probar backup y restauracion antes de usar datos clinicos reales

12. **Compatibilidad de configuracion existente verificada**
   - La API acepta `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID` para cobros de suscripcion; no requiere duplicarlos como `PLATFORM_PAYPHONE_*`
   - La configuracion SMTP existente `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` y `EMAIL_BUSINESS` se reconoce sin duplicar variables `SMTP_*`
   - Typecheck y carga del entorno ejecutados correctamente sin exponer credenciales

13. **Pendiente: migrar fotos clinicas desde VPS a Supabase Storage**
   - Implementacion preparada el 2026-07-18: la API soporta `PHOTO_STORAGE_PROVIDER=local|supabase` y conserva compatibilidad con archivos locales
   - Para nuevas fotos remotas, usar `PHOTO_STORAGE_PROVIDER=supabase`; los objetos se guardan como `supabase:clinicId/patientId/filename`
   - Lectura y eliminacion siguen pasando por la API autenticada; el dashboard no recibe URL publica ni la clave de Supabase
   - Validacion ejecutada: typecheck API y 9/9 pruebas aprobadas, incluida escritura, lectura y limpieza local del adaptador de fotos
   - Crear bucket privado `clinical-photos`; nunca publicar URLs permanentes de fotos clinicas
   - Usar una ruta determinista por tenant y paciente: `clinicId/patientId/photoId.extension`
   - Guardar en la base de datos el `objectKey` remoto, no una URL publica ni una ruta absoluta de la VPS
   - La API debe autorizar clinica/usuario antes de transmitir el binario privado; una URL firmada de corta duracion queda como optimizacion futura, no como requisito para el primer despliegue
   - La clave con privilegios de Storage se mantiene solo en `apps/api/.env`; nunca en dashboard ni en variables `VITE_*`
   - Pendiente de intervencion del propietario: crear el bucket privado, configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, y cambiar el proveedor a `supabase` al desplegar
   - No hay fotos actuales, por lo que no se requiere migracion. Si se agregan archivos locales antes de activar Supabase, respaldar `uploads/`, copiar, verificar conteo/tamano o hash y conservar copia local por 30 dias antes de borrar
   - Ejecutar primero sobre una copia de prueba y registrar archivos fallidos; la operacion debe poder reintentarse sin duplicar objetos
   - Referencia: Supabase Storage con bucket privado, RLS y URLs firmadas

14. **Contexto operativo: fotos en Supabase Storage (2026-07-18)**
   - Se implemento `src/lib/photo-storage.ts`; no requiere dependencia adicional y usa la API REST de Supabase desde el backend
   - `src/routes/photos.ts` conserva las validaciones existentes de clinica, usuario, tipo binario, limite de tamano, rate limit y auditoria
   - Nuevas fotos remotas usan `storagePath` con prefijo `supabase:`; fotos antiguas o locales usan `local:` o el nombre historico, por compatibilidad
   - El dashboard continua solicitando `GET /photos/:id/file` con JWT propio; la API verifica el tenant y transmite el binario. No hay bucket publico, URL publica ni clave de Storage en el navegador
   - Estado actual del entorno: `PHOTO_STORAGE_PROVIDER=local` y `SUPABASE_PHOTO_BUCKET=clinical-photos`; no hay fotos ni migracion requerida
   - Intervencion pendiente del propietario: crear el bucket privado `clinical-photos` en Supabase y agregar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` al `.env` de `apps/api`
   - Activacion posterior: cambiar `PHOTO_STORAGE_PROVIDER=supabase` y reiniciar la API. La validacion de entorno impedira activar Supabase sin URL y clave de servicio
   - Nunca agregar `SUPABASE_SERVICE_ROLE_KEY` al dashboard o a una variable `VITE_*`

## 👥 Credenciales de Prueba (Seed)

No existen usuarios precargados.

`prisma/seed.ts` y `prisma/clean.ts` dejan la base sin clínicas, usuarios ni registros demo.

El primer acceso debe crearse por flujo controlado:
- `POST /clinics/register` con `PLATFORM_REGISTER_KEY`
- Dashboard interno `/platform` para verificar, activar demo y controlar módulos

---

## 🧹 SQL para Limpiar Datos (borrado total)

Ejecutar en el **SQL Editor de Supabase** o cualquier cliente PostgreSQL:

```sql
TRUNCATE TABLE
  "audit_logs",
  "clinic_payment_providers",
  "platform_subscription_payments",
  "clinic_subscriptions",
  "payments",
  "package_redemptions",
  "package_payments",
  "package_balances",
  "packages",
  "invoices",
  "inventory",
  "procedures",
  "consents",
  "consent_templates",
  "photos",
  "clinical_records",
  "appointments",
  "services",
  "patients",
  "professionals",
  "users",
  "clinics"
RESTART IDENTITY CASCADE;
```

---

## ⚠️ Limitaciones del despliegue gratuito anterior (historico)

| Plataforma | Limitación |
|-----------|-----------|
| **Render** | El servicio se suspende tras 15 min sin tráfico (cold start ~30-60s) |
| **Render** | BD PostgreSQL gratuita expira en 90 días |
| **Netlify** | 100 GB bandwidth / 300 min build por mes |
| **Supabase** | 500 MB de almacenamiento / 50k filas por tabla |

> 💡 **Tip**: Usa [UptimeRobot](https://uptimerobot.com) (gratis) para hacer ping a
> `https://derma-os-api.onrender.com/health` cada 14 min y evitar el cold start.

Esta seccion se conserva como referencia del despliegue Render/Netlify anterior; no describe la VPS objetivo vigente.

---

## 🖥️ Despliegue en VPS — Estado y pasos pendientes

### Contexto decidido

- La aplicación se desplegará en una VPS propia.
- PostgreSQL se ejecutará inicialmente en la misma VPS.
- Supabase se utilizará inicialmente solo para Storage de fotografías clínicas.
- El dominio previsto tendrá dos subdominios:
  - `app.<dominio>` para el dashboard.
  - `api.<dominio>` para la API.
- La base de datos no necesita migración actualmente porque no existen datos productivos.
- Las fotografías comenzarán en almacenamiento local persistente de la VPS y luego podrán pasar a Supabase Storage.

### Progreso actual

- ✅ Paso 1: dominio/DNS y acceso inicial a la VPS.
- ✅ Paso 2: actualización del servidor, usuario de despliegue, firewall y herramientas base.
- ✅ Paso 3: instalación/configuración inicial de Node, pnpm y PostgreSQL.
- ✅ Código auditado: Prisma, 15 migraciones, API, dashboard, lint y dependencias validados.
- ✅ Pasos 4 a 9: API, base, dashboard, systemd, Nginx y HTTPS desplegados en VPS.
- ✅ SMTP real, registro, recuperación de cuenta y aislamiento entre clínicas comprobados manualmente.
- ⏳ Pendientes finales por decisión del propietario: Payphone real y respaldos/restauración.

### Configuración aplicada y referencia operativa

#### 4. Configurar la API

Mantener `/opt/derma-os/DermaOS/apps/api/.env` con producción, PostgreSQL local de la VPS, secretos fuertes, `CORS_ORIGIN` del dashboard, `UPLOAD_DIR` persistente y `INVOICES_ENABLED=false` mientras facturación no esté lista.

Crear el directorio persistente de fotos:

```bash
mkdir -p /opt/derma-os/DermaOS/apps/api/uploads
chmod 700 /opt/derma-os/DermaOS/apps/api/uploads
```

#### 5. Aplicar esquema y construir

Desde la raíz del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm --filter @derma-os/api db:generate
pnpm --filter @derma-os/api exec prisma migrate deploy
pnpm build
```

No ejecutar en producción `db:reset`, `db:clean`, `db:seed` ni `prisma db push`.

#### 6. Configurar el dashboard

Crear `apps/dashboard/.env.production`:

```env
VITE_API_URL=https://api.<dominio>
```

Reconstruir el dashboard:

```bash
pnpm --filter @derma-os/dashboard build
```

El valor de `VITE_API_URL` queda incorporado durante el build; si se omite, el dashboard intentará usar `127.0.0.1:4000`.

#### 7. Ejecutar la API como servicio

Crear `/etc/systemd/system/derma-api.service` con:

```ini
[Unit]
Description=DERMA-OS API
After=network.target postgresql.service

[Service]
Type=simple
User=derma
WorkingDirectory=/opt/derma-os/DermaOS/apps/api
EnvironmentFile=/opt/derma-os/DermaOS/apps/api/.env
ExecStart=/usr/bin/node /opt/derma-os/DermaOS/apps/api/dist/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activar y probar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now derma-api
sudo systemctl status derma-api
curl http://127.0.0.1:4000/health
```

#### 8. Configurar Nginx

- Dashboard: servir `/opt/derma-os/DermaOS/apps/dashboard/dist` en `app.<dominio>`.
- API: hacer proxy de `api.<dominio>` hacia `http://127.0.0.1:4000`.
- Verificar con `nginx -t` y recargar Nginx.

#### 9. Activar HTTPS

Usar Certbot para emitir certificados para ambos subdominios:

```bash
sudo certbot --nginx -d app.<dominio> -d api.<dominio>
sudo certbot renew --dry-run
```

Despues de cada despliegue ejecutar como usuario `derma`:

```bash
cd /opt/derma-os/DermaOS
DERMA_PUBLIC_API_URL="https://api.<dominio>" \
DERMA_DASHBOARD_URL="https://app.<dominio>" \
DERMA_APP_ORIGIN="https://app.<dominio>" \
bash scripts/verify-vps.sh
```

El script no modifica datos ni servicios; falla si detecta cambios rastreados, migraciones pendientes, API inactiva, `/health` incorrecto, headers ausentes o CORS mal configurado.

#### 10. Probar Supabase Storage

Inicialmente mantener:

```env
PHOTO_STORAGE_PROVIDER=local
```

Para activar Supabase posteriormente:

1. Crear bucket privado `clinical-photos`.
2. Configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_PHOTO_BUCKET` únicamente en la API.
3. Cambiar `PHOTO_STORAGE_PROVIDER=supabase`.
4. Reiniciar `derma-api`.
5. Probar subida, lectura, eliminación y recuperación de fotografías.

### Verificaciones antes del piloto

- Backup diario de PostgreSQL.
- Backup de `apps/api/uploads` mientras se use almacenamiento local.
- Puerto PostgreSQL `5432` no expuesto públicamente.
- HTTPS funcionando en dashboard y API.
- `CORS_ORIGIN` limitado al dominio real.
- Prueba de aislamiento entre dos clínicas.
- Prueba de lectura de fotos con JWT y validación de `clinicId`.
- Prueba de restauración de backup.
- No guardar secretos en Git ni en variables `VITE_*`.
