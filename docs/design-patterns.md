# Manifiesto de Design Patterns — Linear

## 1. Filosofía

Cada píxel debe tener un propósito. La interfaz es un marco para el contenido, no un adorno.
Preferimos jerarquías claras, gestos mínimos y consistencia quirúrgica sobre decoración.

---

## 2. Layout

- **Chrome mínimo.** Sin barras decorativas. Sin sombras gratuitas. Sin bordes que no separen algo real.
- **Las superficies se distinguen por sutileza:** `bg-primary` → `bg-secondary` → `bg-tertiary`. La elevación es tonal, no por sombras.
- **El contenido gobierna el ancho.** El viewport nunca debe sentirse apretado ni abandonado.
- **Paneles laterales:** anclados, no modales. Se abren y cierran sin perder contexto.

---

## 3. Tipografía

- **Inter** para todo lo funcional (UI, navegación, etiquetas, números de versículo).
- **Lora** solo para el texto bíblico en sí. Separar aguas: UI ≠ lectura.
- Una escala tipográfica estrecha pero deliberada:
  - `2xs` (10px) — etiquetas meta, shortcuts, badges
  - `xs` (11px) — metadata secundaria
  - `sm` (12px) — cuerpo pequeño, descripciones
  - `base` (13px) — cuerpo default de UI
  - `md` (14px) — énfasis UI
  - `lg` (15px) — cuerpo grande de lectura
- El peso **500** es el default para UI. **600** solo para títulos de sección o botones primarios.

---

## 4. Color

- Un solo color de acento (`accent`). Para todo: hover states, selection, links, borders activos, iconos de acción. No hay segundo acento.
- Un color de favorito (`fav`) — exclusivo para bookmarks. No se reusa.
- 3 tonos de fondo. 3 tonos de texto. 1 tono de borde. Esa es la paleta completa.
- `text-muted` es para cosas que existen pero no piden atención (timestamps, contadores, metadatos).
- La selección del usuario se expresa con el acento, no con azul de sistema ni con `text-primary`.
- Overflow de color: `color-mix(in srgb, var(--accent) X%, transparent)` para fondos de selección/hover.

---

## 5. Espaciado

- **Grid de 4px.** Todas las distancias son múltiplos de 4. Sin valores impares.
- El padding interno de un contenedor es `px-6` (24px). Los paneles laterales llevan `px-6 py-3` (24px / 12px).
- El espacio entre elementos relacionados es `gap-2` (8px). Entre grupos es `gap-4` (16px).
- Nunca más de 32px entre secciones dentro de un panel.

---

## 6. Bordes y separación

- `border-border-subtle` (1px) es el único borde. Sin borders gruesos, sin borders dobles.
- Los separadores entre items son bordes bottom, nunca right. El ojo lee de arriba abajo.
- El acento en forma de `border-l-accent` es la señal de "seleccionado". Siempre a la izquierda, siempre 2px.
- El `border-l` transparent por defecto evita saltos de layout al seleccionar.

---

## 7. Interacción y feedback

- **Transiciones de 75-150ms.** 75ms para micro-interacciones (hover en items de menú). 150ms para cambios de estado (selección, paneles). Nunca más de 200ms.
- **Easing:** `duration-150` con default ease. No bezier personalizados excepto para animaciones decorativas (burst).
- El hover nunca es un cambio brusco. Fondo se oscurece/aclara 5-8%. Borde nunca aparece en hover — solo en selected.
- El clic derecho en un versículo no seleccionado lo selecciona y abre menú. Si ya está seleccionado, abre menú sobre el grupo.
- Después de ejecutar una acción del menú contextual, la selección se limpia automáticamente.

---

## 8. Command Palette (cmd+K)

- La paleta es el navegador primario. Cualquier búsqueda comienza aquí.
- Atajos listados explícitamente en los items del menú contextual (ej. `⌘C`).
- Sin modales de confirmación para acciones destructivas — un undo toast es suficiente.

---

## 9. Temas

- `data-theme="dark"` y `data-theme="light"` en `<html>`. Sin modo sistema. El usuario elige.
- Cada variable de color existe en ambos temas con el mismo nombre. El JS nunca referencia colores hardcodeados.
- La diferencia entre temas es de temperatura, no de reordenamiento. El layout es idéntico.

---

## 10. Animaciones decorativas

- Solo existen tres animaciones: **burst** (feedback de bookmark, 0.9s), **aura pulse** (bookmark activo, 2.6s infinito), **tooltip** (entrada 120ms, salida 100ms).
- Las animaciones nunca bloquean interacción ni afectan layout. Son puramente cosméticas.
- `prefers-reduced-motion` debe respetarse — animaciones se desactivan, transiciones se reducen a 0ms.

---

## 11. Scrollbar

- 6px de ancho. Color `--scrollbar` (mismo que `border-subtle`). Hover se aclara a `--scrollbar-hover`.
- Sin borde, sin fondo de track. La scrollbar es un invitado discreto que solo aparece al hacer scroll.
