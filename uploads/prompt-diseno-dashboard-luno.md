# Prompt de diseño — Dashboard estilo "LUNO" (para Claude Design)

> Copia y pega todo lo de abajo en Claude Design. Está escrito como instrucción de diseño, no como código.

---

## Objetivo

Diseña un **panel de administración (admin dashboard) profesional** replicando con exactitud el sistema visual descrito a continuación. Es un estilo limpio, corporativo y moderno basado en Bootstrap 5, con sidebar fijo a la izquierda, cabecera superior y un cuerpo de tarjetas (cards) sobre fondo gris claro. Prioriza la fidelidad al sistema de diseño por encima de la creatividad: respeta espaciados, radios, sombras y jerarquía tal como se especifican.

## Estructura general (layout)

Tres zonas fijas:

1. **Sidebar izquierdo** fijo, ancho ~280px, fondo blanco, scroll interno.
2. **Header superior** (barra fija) con logo/marca, buscador central y acciones a la derecha (notificaciones, idioma, pantalla completa, grid de apps, avatar de usuario).
3. **Área de contenido**, dividida en:
   - **Page toolbar**: breadcrumb (Inicio / Sección) + título de bienvenida ("Bienvenido de nuevo, [Nombre]") con subtítulo muted + selector de rango de fechas con botones de acción (enviar, descargar, PDF, compartir).
   - **Page body**: grid responsivo de cards con `gap` consistente (~1rem / `g-3`), filas tipo "row-deck" donde las tarjetas de la misma fila igualan altura.

El contenedor del cuerpo es fluido (full width), con padding lateral generoso en desktop que se reduce en móvil.

## Paleta de color (variante "theme-blue")

> Valores de partida. Ajusta los hex si tienes el CSS original; lo importante es la **relación** entre tonos.

**Base / superficies**
- Fondo de la app: `#f3f4f7` (gris azulado muy claro)
- Superficie de cards: `#ffffff`
- Bordes / divisores sutiles: `#e9ecef`

**Texto**
- Texto principal (`color-900`): `#1f2937` (casi negro)
- Texto secundario / muted: `#8a92a6` (gris medio)
- Texto tenue (`color-400`): `#aeb4c4`

**Color primario (theme-blue)**
- Primary: `#4680ff` (azul)
- Primary hover/oscuro: `#2f6bff`
- Gradiente primario (para card destacada de bienvenida/CTA): de `#4680ff` a `#3a6fe0` (diagonal)

**Color secundario (acento)**
- Secondary: `#22c55e` / verde-teal de acento (usado en barras de progreso positivas y botones secundarios) — *si tu marca usa otro acento, sustitúyelo aquí*

**Estados**
- Info: `#36c6f0` (cian)
- Success: `#22c55e`
- Warning: `#ffb547` (ámbar)
- Danger: `#ff5c6c` (rojo coral)
- Dark: `#2a2f45`

**Colores para gráficas** (derivados, en este orden)
- chart-color1: primary `#4680ff`
- chart-color2: secondary/teal `#22c55e`
- chart-color3: info `#36c6f0`

## Tipografía

- Fuente sans-serif limpia y neutra (tipo Inter / Nunito Sans / system-ui). Sin serifas.
- Jerarquía:
  - Título de página: tamaño ~`fs-5` (≈1.25rem), peso medio, color `color-900`.
  - Títulos de card (`card-title`): ~`h6`, peso semibold, sin margen inferior.
  - Cifras destacadas en stat-cards: estilo `h4` (≈1.5rem), peso bold.
  - Etiquetas de stat-cards: **MAYÚSCULAS**, tamaño pequeño, ligero `letter-spacing`.
  - Texto de apoyo: `small` + color muted en casi todos los pies de tarjeta.
- Mucho uso de texto muted en tamaño pequeño para subtítulos y metadatos.

## Forma, sombra y espaciado

- **Radio de cards**: ~`0.75rem`; algunos contenedores flotantes (buscador, dropdowns) usan radio mayor `1rem` (`rounded-4`).
- **Sombras**: muy sutiles. Las cards por defecto casi sin sombra (borde casi imperceptible); los elementos flotantes (dropdowns, resultados de búsqueda) sí llevan `box-shadow` suave y difusa.
- **Botones / selects tipo "pill"**: el selector de proyecto del sidebar y algunos botones son completamente redondeados (`rounded-pill`).
- **Padding interno de card**: cómodo (~1.25rem).
- Barras de progreso muy finas (4–5px de alto), redondeadas.

## Componentes clave (replicar exactamente)

### 1. Sidebar
- Arriba: marca/logo donde la primera letra va resaltada en color primario y el resto en texto normal (ej. "**L**UNO Admin"). A la derecha, un icono de tres puntos que abre un dropdown de "Acciones rápidas".
- Bloque "Crear nuevo": un `select` redondeado (rounded-pill) + botón circular primario con icono `+`.
- Lista de menú con **secciones divisoras**: un rótulo en mayúsculas pequeño (ej. "MAIN", "RECURSOS") con un subtítulo muted debajo.
- Cada ítem: icono **SVG bicolor** a la izquierda (un trazo en primary y otro en un tono muted para dar profundidad) + etiqueta + flecha `>` a la derecha si tiene submenú.
- Submenús colapsables (acordeón) que se despliegan; el ítem activo se marca con color primario.

### 2. Header
- Buscador central ancho con input redondeado; al enfocar, despliega una card flotante con "Búsquedas recientes" (chips de colores) y "Sugerencias" (lista con título + descripción muted).
- Acciones a la derecha como iconos SVG monocromos: notificaciones (con dropdown tipo card que tiene cabecera, badge de conteo en rojo, pestañas y lista de items con avatar), idioma (lista con banderas), pantalla completa, grid de apps, y avatar del usuario.
- Los dropdowns aparecen con una **animación sutil de entrada** (escala + fade, "morphing").

### 3. Stat cards (tarjetas de métrica) — patrón estrella
Cada una contiene:
- Un **icono SVG decorativo** posicionado en absoluto arriba a la derecha, en estilo bicolor (relleno muted + acento primary), tamaño ~26px.
- Etiqueta en **MAYÚSCULAS** muted (ej. "NUEVOS LEADS").
- Cifra grande (`h4`) + a su lado un porcentaje pequeño con un icono de flecha hacia arriba y texto muted (ej. "▲ 55%").
- Pie con texto muted pequeño (ej. "Analítica de la última semana").
- En el borde inferior de la card, una **barra de progreso fina (4px)** coloreada según el estado (primary, secondary, warning o danger).
- La card es `overflow-hidden` para que la barra quede al ras del borde.

### 4. Card destacada / CTA
- Fondo con **gradiente primario**, texto blanco, contenido centrado: título + párrafo + botón blanco con texto en mayúsculas y efecto "lift" al pasar el cursor.

### 5. Cards con cabecera + gráfica
- Cabecera: `card-title` a la izquierda + a la derecha icono de pantalla completa y un dropdown de tres puntos (File info, Copiar, Mover, Renombrar, Bloquear, Eliminar).
- Cuerpo: gráfica (usa una librería tipo ApexCharts/Recharts). Tipos presentes: **barras apiladas al 100%** y **donut**, ambas con leyenda inferior centrada, sin data labels, usando los chart-color1/2/3.

### 6. Listas con avatar / progreso
- Items en fila: avatar cuadrado o circular "no-thumbnail" (fondo tenue + icono centrado) + nombre + barra de progreso fina debajo.
- Variante de notificaciones: avatar circular + texto con palabras clave resaltadas en color (primary/warning) + timestamp muted.

### 7. Chips, badges y botones
- Chips de búsqueda reciente: pequeños, redondeados, fondo de color sólido (primary, secondary, info, dark, danger) con texto blanco.
- Badges de conteo en rojo (danger) sobre texto claro.
- Botones: estilo Bootstrap; varios con clase de efecto **"lift"** (se elevan con sombra suave al hover). Grupos de toggle tipo radio (Comprar / Vender) con `btn-outline-secondary`.

## Microinteracciones / efectos
- **lift**: botones y algunas cards se elevan ligeramente con sombra al hover.
- **morphing scale-left**: los dropdowns aparecen con escala + desvanecido desde un punto de anclaje.
- Iconos SVG con paths bicolor (`.fill-primary`, `.fill-secondary`, `.fill-muted`) para dar sensación de profundidad sin saturar de color.
- Transiciones suaves (~150–250ms) en hover y despliegues.

## Tono visual general
Limpio, ordenado, "enterprise" pero amable: mucho espacio en blanco, gris claro de fondo, acentos de color usados con moderación y siempre con propósito (estados y datos), tipografía neutra, esquinas redondeadas y sombras casi imperceptibles. La información manda; la decoración es mínima y funcional.

---

### Pantalla a generar
Genera la **vista de Dashboard principal**: header + sidebar + page toolbar (breadcrumb + saludo + rango de fechas) + una fila de 4 stat-cards + una card CTA con gradiente + una card de gráfica de barras (ingresos) + cards laterales (donut de categorías, descargas con barras de progreso, overview de reportes). Usa datos de ejemplo realistas en español.
