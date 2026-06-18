# Proyecto: Sitio Web Comercial + Dashboard Administrativo — Dermatología

## Visión General
Crear un **sitio web inmersivo y minimalista** para una clínica de dermatología que funciona en dos capas:
1. **Sitio comercial público** — experiencia de paciente / potencial cliente (diseño limpio, moderno, enfocado en conversión)
2. **Dashboard administrativo** — gestión interna del dueño (gestión de citas, pacientes, servicios, facturación, reportes)

Ambos son **proyectos HTML/React separados** que pueden funcionar en dominios distintos (ej: `www.derma-piel.com` vs `admin.derma-piel.com`).

---

## Sitio Comercial — Requisitos Iniciales

### Tono & Estética
- **Minimalista e inmersivo:** mucho espacio en blanco, tipografía clara, imágenes de alta calidad
- **Confianza profesional:** tonos tierra, verdes suaves, blanco/gris neutro
- **Responsive first:** fluido en móvil, tablet, desktop
- **Rápido & accesible:** sin cargas innecesarias, contraste legible, nav clara

### Secciones (TBD tras exploración)
- **Hero** — imagen inmersiva + CTA "Agendar cita"
- **Servicios** — dermatología general, estética, tratamientos especializados (cards minimalistas)
- **Equipo** — profesionales con foto + especialidad + bio breve
- **Antes/Después** — galería de casos (con privacidad/consentimiento)
- **Blog/Recursos** — artículos sobre skincare, tips dermatológicos
- **Contacto/Ubicación** — mapa, formulario, horarios
- **Testimonios** — reseñas de pacientes (opcional)

### Colores & Tipografía
- **Palette:** café clínico (de DERMA-OS) + verdes suaves + tierra + blanco/gris neutro
- **Tipografía:** sans-serif limpia (ej: Inter, Poppins, Outfit) para headers; sans-serif lectura para body
- **Espaciado:** generoso; ratio 1.6x–2x entre secciones

### Interactividad
- Scroll suave, fade-in animations (sutiles, sin spam)
- Hover states claros en botones y links
- Modal o overlay para "Agendar cita" (integración con sistema de citas)
- Formulario de contacto básico (nombre, email, teléfono, mensaje)

---

## Dashboard Administrativo — Requisitos Iniciales

### Usuarios & Roles
- **Dueño/Admin:** acceso total (pacientes, citas, servicios, facturación, reportes)
- (Futuros: staff/recepcionista, profesional con su propia agenda)

### Vistas Principales (similar a DERMA-OS)
- **Dashboard/Home** — KPIs: citas hoy, pacientes este mes, ingresos, gráficos rápidos
- **Agenda** — calendario visual + listado de citas, drag-and-drop para reagendar
- **Pacientes** — CRUD completo (datos, teléfono, historial)
- **Servicios** — catálogo de tratamientos (nombre, precio, duración, descripción)
- **Facturación** — recibos, comprobantes, reportes de ingresos
- **Profesionales** — equipo médico, horarios, especialidades

### Estética Dashboard
- Reutilizar/adaptar la estética de DERMA-OS (tema café clínico minimalista)
- Sidebar + header, modales globales, tablas y cards limpias
- Colores consistentes, pero diferenciados del sitio público (ej: sitio más "cálido", admin más "funcional/gris")

---

## Estructura de Proyectos

### Opción A: Un repo con dos carpetas
```
derma-web/
  ├── public-site/
  │   ├── index.html
  │   ├── assets/
  │   │   ├── images/
  │   │   ├── css/
  │   │   └── js/
  │   └── pages/
  ├── admin-dashboard/
  │   ├── index.html
  │   ├── derma/    (copiar app.jsx, ui.jsx, data.jsx, etc. de DERMA-OS)
  │   └── assets/
  └── shared/
      ├── theme.css  (tokens de color compartidos)
      └── icons.jsx
```

### Opción B: Dos proyectos separados en Figma (actual)
- Proyecto 1: Sitio Comercial
- Proyecto 2: Dashboard (reutiliza DERMA-OS como base)

---

## Preguntas de Diseño (para exploración)

1. **Colores:** ¿mantener la paleta café clínico de DERMA-OS? ¿o explorar nuevas direcciones (verde sage, azul médico, minimalismo blanco/gris)?
2. **Tipografía:** ¿qué estilo de fuente prefieres? (moderna sans-serif, elegante serif, algo custom?)
3. **Imágenes:** ¿tendrás fotografía profesional de la clínica/equipo, o usar placeholders?
4. **Servicios:** ¿cuántos servicios principales? ¿hay servicios con sub-categorías?
5. **Agenda pública:** ¿mostrar disponibilidad de citas en el sitio comercial (con reserva online)?
6. **Blog:** ¿es prioritario para SEO/content marketing?
7. **Movilidad:** ¿el dueño necesita acceso al admin desde móvil con la misma calidad?

---

## Fases de Desarrollo

1. **Fase 1: Exploración visual + Wireframes**
   - Presentar 2–3 direcciones de diseño para el sitio comercial
   - Bocetos de las vistas principales del dashboard
   - Feedback del usuario

2. **Fase 2: Sitio comercial hi-fi**
   - Diseño interactivo con scroll animations
   - Integración de modal "Agendar cita"
   - Responsive testing

3. **Fase 3: Dashboard administrativo**
   - Basado en DERMA-OS + nuevas vistas (si aplica)
   - Sincronización con base de datos (TBD tecnología)
   - Testing de flujos CRUD

4. **Fase 4: Integración & Deployment**
   - Conectar sitio comercial → dashboard (backend, auth)
   - Deploy a producción
   - Capacitación del dueño

---

## Notas Técnicas

- **Sitio comercial:** HTML + CSS + mínimo JS (perf); opcionalmente React si hay muchas interacciones
- **Dashboard:** React (reutilizar stack de DERMA-OS)
- **Compartir:** tokens de diseño (colores, espaciado), componentes UI comunes
- **CMS/Data:** decidir si usar JSON estático, Supabase, Firebase, otro (TBD)

---

## Siguiente paso
Responder las preguntas de diseño arriba ↑ para iniciar la **Fase 1: Exploración visual**.
