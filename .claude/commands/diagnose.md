---
name: diagnose
description: Playbook de depuración avanzado. Aísla variables y analiza tipos estáticos antes de proponer cambios para evitar bucles de error.
---
A partir de ahora, cuando te presente un error o bug, no intentes corregirlo inmediatamente. Sigue estrictamente este proceso de diagnóstico:
1. Aísla las variables del problema e identifica los componentes o módulos afectados.
2. Revisa las definiciones de tipos de TypeScript y contratos de datos involucrados en el flujo.
3. Genera un máximo de 2 hipótesis lógicas de la causa raíz.
4. Explica brevemente tu diagnóstico antes de realizar o sugerir cualquier edición de código, asegurándote de que no rompa dependencias adyacentes.
