# Módulo de estilo — Menús del Sidebar (estilo "LUNO" theme-blue)

> Bloque aislado SOLO para la navegación del sidebar. Pégalo en Claude Design indicando: *"Aplica este estilo específicamente a los menús del panel."* El resto del diseño se mantiene igual.
>
> ✅ Valores **verificados contra el CSS original** (color de reposo `--color-700`, hover `#00ac9a`, contenedor con borde dashed).

---

## Concepto del menú

Navegación vertical sobre fondo blanco, agrupada en **secciones**, donde cada grupo de ítems va **envuelto en una caja con borde punteado (dashed) y esquinas redondeadas**. Cada ítem es una fila cómoda con icono a la izquierda, etiqueta y flecha a la derecha si tiene submenú. Estados claros: reposo en gris neutro, **hover/acento en teal `#00ac9a`**. Sensación: limpia, ordenada, "enterprise", con el detalle distintivo del contorno dashed.

## Paleta específica de los menús (verificada)

| Rol | Color |
|---|---|
| Texto del ítem en reposo | `var(--color-700)` (gris neutro medio-oscuro) |
| Icono en reposo | hereda `var(--color-700)` |
| Icono en reposo (trazo `.fill-secondary`) | mismo color con menor opacidad (~.45) |
| Texto/icono en **hover** | `#00ac9a` (teal) |
| Texto/icono **activo** | `#00ac9a` (teal) — *mismo acento; confírmalo en tu CSS* |
| Borde del contenedor `.menu-list` | `var(--border-color)` (dashed) |
| Encabezado de sección (rótulo) | muted (`--color-500/600`), MAYÚSCULAS |
| Subtítulo de sección | muted más claro |
| Texto de submenú en reposo | `var(--color-700)` |
| Texto de submenú activo/hover | `#00ac9a` |

## Estructura y reglas

### 0. Contenedor del grupo de menú (`.menu-list`) — detalle clave
- **Borde punteado** alrededor de cada grupo: `1px dashed var(--border-color)`.
- Esquinas redondeadas: `border-radius: .75rem`.
- Padding horizontal interno: `0 1rem`.
- `list-style: none`.
- Cada sección (MAIN, RESOURCES…) es su propia caja dashed independiente.

### 1. Encabezado de sección (divider)
- Rótulo corto en **MAYÚSCULAS** (ej. "PRINCIPAL", "RECURSOS"), peso semibold, tamaño pequeño, color muted.
- Debajo, subtítulo en una línea, más pequeño y tenue.
- Va dentro de la caja dashed, en la parte superior del grupo.

### 2. Ítem de menú principal (`.m-link`)
- Disposición horizontal (flex, alineado al centro).
- Padding interno cómodo (~`0.6rem 0`).
- Tipografía: peso 500, tamaño ~`0.9rem`.
- **Color en reposo: `var(--color-700)`**.
- **Icono SVG** a la izquierda, ~18px, bicolor: trazo principal en el color del texto + un segundo trazo (`.fill-secondary`) en el mismo tono con menor opacidad. El icono hereda el color del estado.
- **Etiqueta** con pequeño margen a la izquierda del icono (~0.5rem).
- **Flecha** (chevron `>`) empujada al extremo derecho con `margin-left: auto`, solo si hay submenú.
- `transition` suave (~150–200ms) en color.

### 3. Estados
- **Reposo**: texto e icono en `var(--color-700)`, sin fondo.
- **Hover**: texto e icono pasan a **`#00ac9a`** (teal), cursor pointer.
- **Activo**: texto e icono en **`#00ac9a`** (mismo acento). Sin fondo de color sólido — el cambio es de color de texto/icono (verifica en tu CSS si además lleva peso bold o algún indicador).

### 4. Flecha desplegable
- Chevron a la derecha en estado colapsado.
- Al expandir el submenú, **rota 90°** (apunta hacia abajo) con transición suave.

### 5. Submenú (acordeón) (`.sub-menu` / `.ms-link`)
- Se despliega/colapsa con animación suave.
- Ítems **indentados** para alinearse después del icono del padre.
- Color de reposo `var(--color-700)`, tipografía algo más pequeña.
- **Hover/activo**: color `#00ac9a` (teal).
- Soporta varios niveles anidados (nivel 1 → 2 → 3) con indentación creciente.

---

## Referencia rápida en CSS (basada en el original)

```css
/* Caja del grupo de menú — detalle distintivo */
.layout-1 .sidebar .menu-list {
  border: 1px dashed var(--border-color);
  list-style: none;
  border-radius: .75rem;
  padding: 0 1rem;
}

/* Encabezado de sección */
.menu-list .divider .label {
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-500);
}
.menu-list .divider .subtitle { color: var(--color-400); }

/* Ítem principal */
.m-link {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .6rem 0;
  font-size: .9rem;
  font-weight: 500;
  color: var(--color-700);
  transition: color .18s ease;
}
.m-link svg { width: 18px; height: 18px; color: currentColor; }
.m-link svg .fill-secondary { fill: currentColor; opacity: .45; }
.m-link .arrow { margin-left: auto; transition: transform .2s ease; }

.m-link:hover,
.m-link.active { color: #00ac9a; }

/* Flecha al expandir */
.collapsed.show > .m-link .arrow,
.m-link[aria-expanded="true"] .arrow { transform: rotate(90deg); }

/* Submenú */
.sub-menu { list-style: none; padding-left: 2.2rem; }
.ms-link {
  display: flex;
  align-items: center;
  padding: .4rem 0;
  font-size: .85rem;
  color: var(--color-700);
  transition: color .18s ease;
}
.ms-link:hover,
.ms-link.active { color: #00ac9a; }
```

---

### Cómo integrarlo
Pega esto **junto al prompt principal del dashboard** y dile a Claude Design:

> "Mantén todo el diseño anterior. Para los **menús del sidebar** aplica específicamente este módulo: cada grupo de menú va envuelto en una caja con borde punteado (`1px dashed`, radio `.75rem`, padding horizontal `1rem`); los ítems en reposo usan `var(--color-700)` y en hover/activo cambian a teal `#00ac9a`; icono bicolor, flecha que rota al desplegar y submenús indentados."

### Nota
El color de **estado activo** lo inferí igual al hover (`#00ac9a`). Si en tu CSS el `.m-link.active` o `.ms-link.active` tiene otro valor (o peso/fondo extra), pásamelo y lo ajusto. Igual con el valor real de `var(--color-700)` y `var(--border-color)` si quieres los hex literales en vez de las variables.
