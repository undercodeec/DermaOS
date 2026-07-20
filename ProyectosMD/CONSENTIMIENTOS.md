# Flujo de consentimientos en DERMA-OS

## Administración

El rol `admin` configura el logo y administra las plantillas desde **Sistema**.

1. Crear una plantilla manual o importar un archivo PDF/DOCX de hasta 8 MB.
2. Si se importa, DERMA-OS conserva el archivo original y su huella SHA-256, y extrae el texto a un borrador.
3. Revisar el texto extraído. Los PDF escaneados sin texto requieren transcripción manual; no se aplica OCR en esta versión.
4. Aprobar el borrador. Una versión aprobada queda bloqueada.
5. Para cambiar una versión aprobada, usar **Nueva versión**, editar el nuevo borrador y aprobarlo.

Solo las plantillas aprobadas aparecen al generar un consentimiento para un paciente.

## Firma y PDF

Al generar un consentimiento se guarda una copia del título, tipo, versión y texto legal. Por eso una modificación futura de la plantilla no altera lo que aceptó el paciente.

La firma exige la aceptación expresa y una firma manuscrita en pantalla. Se registran fecha, hora, IP y usuario en auditoría. Después de firmar, el PDF puede descargarse desde la pestaña **Consentimientos** del paciente e incluye:

- logo, nombre y RUC de la clínica;
- identificación del paciente;
- tipo, título y versión del consentimiento;
- texto legal congelado;
- firma manuscrita, fecha, IP e identificador del documento.

## Base de datos

Antes de iniciar la API debe aplicarse la migración `20260720000000_consent_template_workflow` y regenerarse Prisma:

```powershell
pnpm --filter @derma-os/api exec prisma migrate deploy
pnpm --filter @derma-os/api db:generate
```
