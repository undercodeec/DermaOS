# Auditoria de codigo, seguridad e integridad de datos - DERMA-OS

> Fecha: 2026-07-18
> Alcance: estado actual del directorio de trabajo, incluyendo cambios aun no confirmados en Git.
> Modalidad: auditoria estatica y verificaciones de compilacion, sin modificar codigo, base de datos ni configuracion.
> Resultado ejecutivo: **no se recomienda habilitar un piloto con datos clinicos o pagos reales antes de resolver los hallazgos criticos y altos**.

## 1. Resumen para lenguaje humano

La aplicacion tiene una base de seguridad razonable: usa JWT, vuelve a consultar el usuario y la clinica en cada peticion, filtra por `clinicId` en la mayoria de rutas, valida muchos cuerpos con Zod, cifra los tokens de Payphone y evita consultas SQL manuales.

Sin embargo, pasar el compilador no significa que la logica sea segura. Se encontraron problemas que pueden causar:

- borrado completo accidental de la base de produccion al ejecutar un comando llamado `seed`;
- doble consumo de sesiones de un paquete por peticiones simultaneas;
- doble abono o un pago marcado como pagado sin su abono correspondiente;
- asociacion de un cobro de un paciente al paquete de otro paciente de la misma clinica;
- acceso de profesionales y esteticistas a informacion o acciones mas amplias que las declaradas en la matriz de permisos;
- creacion de facturas aunque el modulo parece estar deshabilitado;
- cruces entre clinicas si una ruta futura omite una validacion, porque la base de datos no impone todas las relaciones multi-tenant;
- abuso de registro, login y codigos por ausencia de limites de intentos;
- conciliacion de pagos basada en datos de webhook sin una comprobacion criptografica o verificacion posterior contra el proveedor.

No se encontro una ruta HTTP para eliminar pacientes, lo cual actualmente reduce el riesgo de borrado masivo por IDOR. Las eliminaciones existentes de citas, fotos, inventario, evoluciones y recetas verifican primero la pertenencia a la clinica o pasan por un paciente ya validado. Aun asi, existen problemas de consistencia y concurrencia descritos mas adelante.

## 2. Veredicto y prioridades

| Severidad | Cantidad | Significado |
|---|---:|---|
| Critica | 1 | Puede destruir toda la informacion sin una barrera de produccion |
| Alta | 7 | Puede alterar pagos, sesiones, autorizacion, facturacion o aislamiento entre clinicas |
| Media | 9 | Puede producir datos inconsistentes, perdida operativa o ampliar el impacto de un ataque |
| Baja / mejora | 6 | Deuda tecnica, mantenibilidad y defensa adicional |

Orden recomendado antes del piloto:

1. Proteger `seed.ts` y `clean.ts` contra ejecucion en produccion.
2. Hacer atomicos e idempotentes el pago manual y el consumo de paquetes.
3. Corregir la relacion cobro-paciente-paquete.
4. Deshabilitar realmente facturacion o terminar sus reglas antes de exponerla.
5. Corregir permisos por rol y asociar la sesion con el profesional correspondiente.
6. Agregar controles multi-tenant en la base de datos y pruebas con dos clinicas.
7. Proteger registro, login, codigos y webhooks.

## 3. Pruebas y revisiones realizadas

### 3.1 Verificaciones ejecutadas

| Verificacion | Resultado |
|---|---|
| Typecheck de API con TypeScript | OK |
| Typecheck de dashboard con TypeScript | OK |
| Build de produccion del dashboard con Vite | OK, 966 modulos transformados |
| Validacion de `schema.prisma` | OK |
| `git diff --check` | OK; solo advertencias de conversion LF/CRLF |
| Busqueda de secretos obvios en archivos versionados | Sin coincidencias evidentes; hubo un nombre de archivo no procesable por caracteres especiales |
| Pruebas automatizadas propias del proyecto | No existen archivos de prueba propios detectados |
| Lint del dashboard | No ejecutable: el script existe, pero `eslint` no esta instalado en las dependencias disponibles |
| Auditoria de dependencias (`pnpm audit`/`npm audit`) | No ejecutada: no hay gestor de paquetes disponible en el entorno actual |
| Pruebas dinamicas IDOR con dos clinicas | No ejecutadas, porque requieren crear/modificar datos y esta auditoria fue solicitada sin cambios |

### 3.2 Superficie revisada

- 115 rutas detectadas en el grafo del proyecto.
- Middleware de autenticacion, roles, acceso comercial y superadministrador.
- Rutas de pacientes, historia clinica, procedimientos, consentimientos y fotos.
- Agenda y consumo de sesiones.
- Paquetes, abonos, pagos Payphone y webhooks.
- Administracion de usuarios por clinica.
- Plataforma SaaS, demos y suscripciones.
- Esquema Prisma, relaciones, `onDelete`, indices y restricciones unicas.
- Scripts destructivos de seed y limpieza.
- Persistencia de JWT en el dashboard.

## 4. Hallazgos criticos

### C-01. `db:seed` y `db:clean` pueden borrar toda la produccion

**Evidencia**

- `apps/api/prisma/seed.ts:5-27` ejecuta `deleteMany()` sobre todas las tablas.
- `apps/api/prisma/clean.ts:8-32` hace lo mismo.
- `package.json` expone ambos como comandos normales: `db:seed` y `db:clean`.
- No existe comprobacion de `NODE_ENV`, host de base de datos, confirmacion explicita ni bandera como `ALLOW_DATABASE_WIPE=true`.

**Explicacion humana**

En la mayoria de proyectos, “seed” significa cargar datos iniciales. Aqui significa borrar todo. Una persona, un pipeline o Render podria ejecutar el comando pensando que es inofensivo y eliminar clinicas, usuarios, pacientes, fotos registradas, historias, pagos y auditorias.

**Impacto**

Perdida total e irreversible de datos si no hay backup valido. Es el mayor riesgo actual relacionado con eliminacion.

**Recomendacion**

- Hacer que `seed.ts` sea no destructivo.
- Mover el borrado a un comando con nombre inequívoco, por ejemplo `db:wipe:local`.
- Bloquearlo si `NODE_ENV === "production"`.
- Exigir una variable explicita y dificil de activar accidentalmente.
- Verificar el host y nombre de la base antes de borrar.
- Ejecutar el borrado dentro de una transaccion cuando sea posible.
- Probar restauracion de backups antes del piloto.

## 5. Hallazgos altos

### H-01. El pago manual no es atomico ni idempotente

**Evidencia**

- `apps/api/src/routes/payments.ts:243-297` lee un cobro pendiente, lo actualiza a pagado y despues crea el abono del paquete fuera de una transaccion.
- La actualizacion usa `update({ where: { id } })`, no una reclamacion atomica condicionada por `status: "pendiente"`.

**Escenarios de error**

- Dos peticiones simultaneas pueden leer el mismo estado pendiente y crear dos abonos.
- Si el cobro cambia a pagado y luego falla `packagePayment.create`, queda pagado sin abono.
- Si se reintenta para corregirlo, la API rechaza porque ya no esta pendiente.

**Recomendacion**

Usar una sola transaccion y reclamar el registro mediante `updateMany({ where: { id, clinicId, status: "pendiente" } })`. Crear el abono solo si `count === 1`. Agregar una restriccion unica que vincule un pago Payphone con un solo abono.

### H-02. El consumo de sesiones de una cita tiene una condicion de carrera

**Evidencia**

- `apps/api/src/routes/appointments.ts:171-203` comprueba si ya existe un consumo antes de iniciar la transaccion.
- Calcula `sessionsUsed + 1` en memoria y luego escribe el valor.
- `PackageRedemption.appointmentId` tiene indice, pero no es unico en `schema.prisma`.
- `apps/api/src/routes/appointments.ts:206-243` permite que dos solicitudes cambien la misma cita a `atendida` a partir de una lectura anterior.

**Explicacion humana**

Si dos clics o reintentos llegan casi al mismo tiempo, ambos pueden creer que la sesion no fue descontada. El resultado puede ser doble redencion, conteo incorrecto o sobrescritura de un valor calculado con informacion vieja.

**Recomendacion**

- Hacer `appointmentId` unico para redenciones no nulas.
- Ejecutar validacion, incremento y redencion en una transaccion con aislamiento adecuado.
- Usar incremento atomico y condicion `sessionsUsed < sessionsTotal`.
- Reclamar atomically la transicion de estado de la cita.

### H-03. Un cobro puede vincular un paciente con el paquete de otro paciente

**Evidencia**

- `apps/api/src/routes/payments.ts:159-164` valida que paciente y balance pertenecen a la clinica, pero no valida `balance.patientId === patient.id`.
- El webhook y la conciliacion manual depositan el dinero en `conceptRefId`, independientemente del `patientId` guardado en el cobro.

**Ejemplo humano**

Un cobro aparece a nombre de Ana, pero su `conceptRefId` puede apuntar al paquete de Beatriz. Ambas son de la misma clinica, por lo que las validaciones actuales pasan. Al conciliar, el abono termina en el paquete de Beatriz.

**Recomendacion**

Al crear un cobro de paquete, exigir simultaneamente `balance.id`, `balance.clinicId` y `balance.patientId === b.patientId`. Rechazar `conceptRefId` cuando el concepto no lo utiliza y validar la entidad correcta para cada tipo de concepto.

### H-04. Los permisos declarados no coinciden con los permisos efectivos

**Evidencia**

- `apps/api/src/lib/permissions.ts:10-13` declara “Su agenda” para profesional y esteticista.
- `apps/api/src/routes/appointments.ts:56-77` devuelve todas las citas de la clinica si el cliente no envia un filtro; el servidor no fuerza el profesional asociado al usuario.
- `req.user` no contiene `professionalId` (`apps/api/src/middleware/auth.ts:13,31-45`).
- “Limitado” esta incluido en `WRITE_PERMS`, por lo que un esteticista puede entrar a las mutaciones completas de historia disponibles para ese modulo.
- “Ver/conciliar” y “Consumir” no estan incluidos en `WRITE_PERMS`, por lo que contador e inventario no se comportan como indica la matriz.

**Impacto**

Acceso horizontal dentro de una clinica: un profesional puede consultar o modificar citas de otros profesionales. La interfaz puede ocultar botones, pero la API sigue siendo la autoridad y actualmente no aplica el alcance “propio”.

**Recomendacion**

Modelar capacidades explicitas, no inferirlas desde textos como “Total” o “Limitado”. Incluir `professionalId` validado en el contexto de autenticacion y aplicar filtros obligatorios por rol en backend.

### H-05. Facturacion parece deshabilitada, pero sigue accesible

**Evidencia**

- `apps/api/src/server.ts:17,54` comenta el router principal de facturas.
- `apps/api/src/env.ts:15` define `INVOICES_ENABLED`, pero no se usa para proteger rutas.
- `apps/api/src/routes/patients.ts:503-562` mantiene activas las rutas `/patients/:id/invoices`.
- `ALL_MODULES` incluye `facturacion`, y el registro de una clinica habilita todos los modulos.
- La creacion confia en `serviceId`, descripcion, precio e IVA enviados por el navegador sin verificar el servicio de la clinica.
- `EMISOR_RUC` esta fijo en `apps/api/src/lib/sri.ts:51`.

**Problemas adicionales**

- `Invoice.number` es globalmente unico, pero la secuencia se calcula por clinica. Dos clinicas pueden intentar usar el mismo numero.
- Dos facturas simultaneas de una clinica pueden calcular la misma secuencia.
- El IVA acepta cualquier entero en `patients.ts:520`.

**Impacto**

Se pueden crear registros con apariencia de factura usando datos fiscales incompletos o incorrectos, incluso cuando el equipo cree que el modulo esta apagado.

**Recomendacion**

Bloquear todas las rutas de facturacion con una unica feature flag en backend hasta terminar el modulo. Luego usar secuencia transaccional por clinica/establecimiento, RUC por clinica, validacion server-side de servicios, precios e impuestos, y restriccion unica compuesta adecuada.

### H-06. La base no impide relaciones cruzadas entre clinicas

**Evidencia**

Varias tablas guardan `clinicId` y tambien IDs relacionados, pero las claves foraneas solo verifican que el ID exista, no que pertenezca a la misma clinica. Ejemplos:

- `Appointment`: `clinicId`, `patientId`, `serviceId`, `professionalId`.
- `PackageBalance`: `clinicId`, `patientId`, `packageId`, `sellerProfessionalId`.
- `Payment`: `clinicId`, `patientId`, `conceptRefId`.
- `User`: `clinicId`, `professionalId`.
- `Invoice`: `clinicId`, `patientId`.

La API valida correctamente muchos de estos casos, pero la base acepta una fila cruzada si una ruta, script, importacion o cambio futuro olvida la comprobacion.

**Recomendacion**

Agregar restricciones compuestas por tenant cuando el modelo lo permita, centralizar consultas Prisma con helpers de alcance y evaluar Row Level Security en PostgreSQL como segunda barrera. Crear pruebas que intenten todas las combinaciones de IDs entre dos clinicas.

### H-07. Registro, login y superadmin no tienen control de intentos

**Evidencia**

- No hay middleware de rate limiting en `apps/api/src/server.ts`.
- `/auth/login`, `/platform/login`, `/clinics/register` y `/clinics/verify-email` son publicos.
- `apps/api/src/routes/clinics.ts:73-139` crea inmediatamente una clinica activa, admin y demo de siete dias sin verificar email.
- No existe bloqueo progresivo, contador de intentos, captcha ni cuota de registro.

**Impacto**

Fuerza bruta contra usuarios y superadmin, envio masivo de intentos SMTP cuando se active, creacion ilimitada de tenants demo y consumo de recursos de base de datos.

**Recomendacion**

Aplicar limites por IP y por identidad, retrasos progresivos, bloqueo temporal, alertas y verificacion de email antes de activar el tenant. El login del superadmin requiere una proteccion mas estricta y MFA real.

## 6. Hallazgos medios

### M-01. Los webhooks no demuestran criptograficamente su origen

Los endpoints publicos de Payphone validan tienda, transaccion, estado y monto, lo cual es positivo. Sin embargo, el codigo no verifica firma, secreto de webhook ni confirma la transaccion consultando al proveedor con credenciales del servidor.

Un atacante que obtenga `StoreId`, `ClientTransactionId` y monto podria intentar simular una aprobacion. Debe verificarse el mecanismo oficial disponible por el proveedor y, como minimo, confirmar server-to-server la transaccion antes de otorgar saldo o meses.

Referencias: `apps/api/src/routes/payments.ts:56-122` y `apps/api/src/routes/platform.ts:37-99`.

### M-02. Creacion de links de plataforma deja pagos pendientes huerfanos

`apps/api/src/routes/platform.ts:306-329` crea primero el pago local, luego llama a Payphone y finalmente guarda el link. Si Payphone falla, queda un pago pendiente sin link. Conviene registrar un estado `creating/failed`, guardar el error y permitir reintento controlado o compensacion.

### M-03. Fotos clinicas en almacenamiento local pueden perderse

`apps/api/src/routes/photos.ts` guarda binarios en `UPLOAD_DIR`. En plataformas con disco efimero, un reinicio o redeploy puede perderlos mientras la base conserva la metadata. Para datos clinicos debe usarse almacenamiento persistente privado con cifrado, backup, URLs firmadas y politica de retencion.

### M-04. Validacion de archivos basada solo en MIME declarado

`apps/api/src/routes/photos.ts:19-24` acepta cualquier MIME que empiece con `image/` y deriva la extension desde ese valor. El MIME lo controla el cliente. Tambien sirve SVG inline. Se debe inspeccionar la firma real del archivo, permitir una lista corta de formatos raster, rechazar SVG o sanitizarlo, decodificar/re-encodear imagenes y limitar dimensiones.

### M-05. Borrado de fotos puede dejar datos clinicos huerfanos

Se borra primero la fila y luego el archivo; el error de `unlink` se ignora (`photos.ts:102-104`). Si falla el disco, queda un archivo clinico sin registro ni flujo de limpieza. Debe existir una estrategia transaccional/compensatoria y un proceso de deteccion de huerfanos.

### M-06. Borrar o editar citas deja `nextAppointment` desactualizado

La creacion puede asignar `Patient.nextAppointment` (`appointments.ts:129-139`), pero editar, cancelar o eliminar la cita no recalcula ese campo. El dashboard puede mostrar como “proxima” una cita eliminada o con horario antiguo.

Ademas, al borrar una cita atendida, `PackageRedemption.appointmentId` queda en `null` por `onDelete: SetNull`; la sesion no se devuelve y se pierde el enlace explicativo. Se debe definir una politica: impedir borrar citas atendidas, usar cancelacion logica o revertir en una operacion auditada.

### M-07. Venta de paquete y abono inicial no son una sola operacion

`apps/api/src/routes/patients.ts:466-489` crea el balance y luego el abono inicial fuera de una transaccion. Si falla el abono, queda una venta incompleta. Tampoco se limita el abono inicial al precio del paquete.

### M-08. Un admin puede dejar la clinica sin administradores activos

`apps/api/src/routes/admin.ts:197-242` permite que un admin se desactive o cambie su propio rol y permite desactivar/cambiar al ultimo admin. Esto puede bloquear toda administracion de la clinica. Debe impedirse eliminar el ultimo acceso administrativo y tratar el cambio propio con confirmacion reforzada.

### M-09. JWT operativo en `localStorage`

`apps/dashboard/src/lib/api.ts:18,54-61` persiste el token en `localStorage`. React reduce XSS al escapar texto y no se detecto uso de `dangerouslySetInnerHTML`, pero cualquier XSS futuro o dependencia comprometida podria leer el token. Para datos clinicos conviene evaluar cookie `HttpOnly`, `Secure`, `SameSite` con proteccion CSRF, o al menos sesion en memoria/corta duracion y una CSP estricta.

## 7. Hallazgos bajos y mejoras de calidad

### L-01. No existen pruebas automatizadas propias

No hay suite que compruebe IDOR, permisos, concurrencia, webhooks, eliminaciones o reglas financieras. Los archivos de test encontrados pertenecen a dependencias dentro de `node_modules`.

### L-02. El script de lint esta roto

El dashboard declara `eslint` en su script, pero el paquete no figura entre las dependencias instaladas. Por ello el control de estilo y ciertos errores estaticos no puede ejecutarse.

### L-03. No se pudo auditar vulnerabilidades de dependencias

Debe ejecutarse `pnpm audit` en CI y complementarse con Dependabot/Renovate o una herramienta equivalente. Este informe no afirma que las versiones instaladas esten libres de CVE.

### L-04. Llamadas externas sin timeout explicito

La llamada a Payphone en `apps/api/src/lib/payphone.ts:45-52` no usa `AbortSignal` ni timeout. Una conexion lenta puede mantener solicitudes y recursos abiertos. El cliente SMTP manual tampoco establece timeout de conexion/lectura.

### L-05. Claves con requisitos minimos mejorables

`JWT_SECRET` admite solo 16 caracteres. Para produccion debe exigirse un secreto aleatorio de mayor entropia. `PAYPHONE_CREDENTIAL_KEY` deberia ser obligatorio en produccion para no reutilizar indirectamente `JWT_SECRET` como clave de cifrado.

### L-06. Acciones de plataforma sin auditoria completa

Activar/suspender clinicas, cambiar modulos, iniciar demo o extender manualmente una suscripcion no crea siempre un registro de auditoria con identidad del superadmin, IP, estado anterior y estado nuevo. Son acciones comerciales sensibles.

## 8. Controles que estan correctamente implementados

Estos puntos reducen riesgo y deben conservarse:

- `requireAuth` no confia ciegamente en `clinicId` o rol del JWT; vuelve a leer usuario y clinica desde la base.
- Usuarios y clinicas inactivos son rechazados en rutas autenticadas.
- La mayoria de lecturas y mutaciones raiz incluyen `clinicId`.
- `router.param("id")` protege los subrecursos de pacientes contra IDs de otra clinica.
- Profesionales y servicios se validan por clinica en evoluciones, procedimientos y agenda.
- La creacion de procedimientos comprueba que el consentimiento pertenece al paciente.
- Fotos se sirven detras de JWT y se comprueba la clinica del paciente.
- Rutas administrativas de clinica exigen rol `admin` y modulo `sistema`.
- Contraseñas usan bcrypt con costo 12.
- Los tokens Payphone de las clinicas se cifran con AES-256-GCM y no se devuelven al frontend.
- Los webhooks usan reclamacion atomica por estado en sus caminos automaticos, evitando varios reintentos normales.
- Los IDs de transaccion Payphone se generan con `crypto.randomBytes`.
- Prisma evita SQL concatenado y Zod valida una parte importante de las entradas.
- No se detecto uso de `dangerouslySetInnerHTML` en el dashboard.
- No existe endpoint HTTP de borrado de pacientes en el estado revisado.

## 9. Plan de pruebas recomendado

### Fase 1. Pruebas de aislamiento con dos clinicas

Crear Clinica A y Clinica B, cada una con admin, profesional, paciente, servicio, paquete, cita, foto, consentimiento y pago. Para cada endpoint:

1. Autenticarse como usuario A.
2. Sustituir cada ID del request por el ID equivalente de B.
3. Esperar siempre `404` o `403`, nunca datos ni mutacion.
4. Repetir en path, query, body y relaciones anidadas.
5. Confirmar directamente en la base que ninguna fila de B cambio.

Casos obligatorios: `patientId`, `professionalId`, `serviceId`, `templateId`, `consentId`, `packageId`, `balanceId`, `conceptRefId`, `appointmentId`, `paymentId`, `photoId`, `userId` y `clinicId` de plataforma.

### Fase 2. Pruebas de concurrencia

- Dos peticiones simultaneas para marcar la misma cita como atendida.
- Diez webhooks iguales en paralelo.
- Dos conciliaciones manuales del mismo cobro.
- Webhook y conciliacion manual al mismo tiempo.
- Dos facturas creadas simultaneamente.
- Dos ventas consumiendo la ultima sesion disponible.

Invariantes esperadas:

- una cita produce como maximo una redencion;
- un pago produce como maximo un abono;
- `sessionsUsed` nunca supera `sessionsTotal`;
- un pago pendiente solo puede reclamarse una vez;
- cada numero de factura es unico dentro de su emisor sin bloquear a otras clinicas.

### Fase 3. Pruebas de eliminacion y recuperacion

- Intentar borrar recursos de otra clinica.
- Borrar cita agendada, cancelada y atendida, verificando paquete y `nextAppointment`.
- Simular fallo de disco al borrar una foto.
- Verificar que `db:seed` y `db:clean` se niegan a correr contra produccion.
- Restaurar un backup completo en un entorno aislado y medir el tiempo de recuperacion.

### Fase 4. Autenticacion y abuso

- Fuerza bruta controlada sobre login normal y superadmin.
- Reutilizacion, expiracion y adivinacion de codigos de email.
- Registro masivo desde una IP.
- Usuario desactivado con token previamente emitido.
- Clinica suspendida con token previamente emitido.
- Cambio de rol o profesional asociado durante una sesion activa.

### Fase 5. Archivos y webhooks

- Subir archivo no imagen con MIME falso.
- Subir SVG con contenido activo.
- Archivo de 8 MB repetido en paralelo.
- `storagePath` manipulado en entorno de prueba.
- Webhook con tienda, monto, estado, transaccion o moneda alterados.
- Webhook autentico repetido y simultaneo.
- Confirmacion server-to-server de la transaccion antes de acreditar.

## 10. Criterios minimos para aprobar un piloto

El piloto puede considerarse tecnicamente aceptable cuando:

- no queden hallazgos criticos ni altos abiertos;
- exista una suite automatizada multi-tenant con dos clinicas;
- pagos y consumos tengan pruebas de concurrencia;
- facturacion este completamente bloqueada o completada;
- registro y login tengan limites de intentos y email verificado;
- los webhooks tengan autenticidad/confirmacion robusta;
- fotos usen almacenamiento privado persistente;
- exista backup automatico y restauracion probada;
- lint, typecheck, build, pruebas y audit de dependencias sean obligatorios en CI;
- la migracion de produccion se haya ensayado en una copia anonima de la base.

## 11. Limitaciones de esta auditoria

- No se modifico ni creo informacion en la base de datos.
- No se enviaron pagos reales ni correos SMTP.
- No se intento explotar el despliegue publico.
- No se verificaron configuraciones reales de Render, Netlify, Supabase o Payphone.
- No se realizo pentest de red ni analisis SAST/DAST externo.
- El repositorio tenia cambios sin commit al iniciar; el informe corresponde exactamente a ese estado de trabajo.
- La ausencia de un hallazgo en este documento no constituye garantia absoluta de seguridad.

## 12. Conclusion

El filtrado multi-tenant de las rutas principales esta mejor implementado que en un prototipo comun y no se encontro una lectura o borrado directo obvio que permita a una clinica operar sobre un paciente de otra usando solamente el ID. No obstante, todavia no puede afirmarse que no existan cruces o perdida de datos: la base no refuerza todas las relaciones por tenant, hay un cruce confirmado entre paciente y balance dentro de una clinica, y varias operaciones financieras no son atomicas.

La prioridad no debe ser agregar nuevas funciones. Primero deben cerrarse el borrado destructivo, concurrencia de pagos/sesiones, permisos, facturacion residual y pruebas multi-tenant. Despues de esas correcciones se debe repetir esta auditoria con pruebas dinamicas sobre dos clinicas y una base temporal.
