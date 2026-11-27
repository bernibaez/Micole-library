# LexLibrary — Biblioteca Jurídica Digital

Plataforma editorial digital especializada en **Derecho Procesal Penal de la República Dominicana**, desarrollada con **React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod, Motion, React-PDF y Supabase**.

---

## Características implementadas

- **Navegación editorial responsive**:
  - **Desktop**: barra superior minimalista con buscador global (`Ctrl + K`), sugerencias y búsquedas recientes, centro de notificaciones, menú de perfil y barra lateral compacta y colapsable.
  - **Mobile**: barra de navegación inferior con 5 accesos (Inicio, Explorar, Biblioteca, Favoritos y Perfil), adaptada al uso con una sola mano.
- **Inicio editorial**: saludo personalizado, banner editorial compacto, *Continuar leyendo*, libros destacados, recomendados, recientemente agregados, más consultados, legislación dominicana, jurisprudencia destacada y categorías.
- **Catálogo y búsqueda inteligente**: búsqueda con debounce, filtros por categoría, autor, año y tipo de documento, ordenamiento (relevancia, recientes, popularidad, título), chips de filtros activos, conservación de filtros en URL, vista en cuadrícula y lista, paginación progresiva y *bottom sheet* de filtros en móviles.
- **Detalles y vista previa rápida**: portada vertical 2:3, acciones principales (*Leer ahora*, *Vista previa*, *Descargar PDF*, *Añadir a mi biblioteca*, *Favoritos*, *Colecciones*, *Compartir*), metadatos bibliográficos reales (sin inventar campos vacíos) y vista previa rápida con renderizado de las primeras páginas sin abandonar el catálogo (modal en desktop, *bottom sheet* deslizable en mobile).
- **Lector PDF avanzado (`react-pdf` + `pdfjs-dist`)**:
  - Renderizado página bajo demanda (optimizado para documentos extensos), navegación por teclado y selector de página.
  - Panel lateral con miniaturas progresivas, índice/tabla de contenido del PDF (cuando existe), marcadores de páginas y búsqueda interna con resaltado.
  - Selección de texto real, zoom, gestos *pinch-to-zoom* en móvil, ajustar al ancho, ajustar a la página, rotación 90°, pantalla completa y descarga.
  - Modos de lectura: **Claro**, **Sepia**, **Oscuro** y **Modo concentración**.
  - Guardado automático de la última página leída y recuperación al reabrir.
- **Autenticación (Supabase Auth)**: inicio de sesión, registro, recuperación y restablecimiento de contraseña, confirmación de correo, indicador de fortaleza de contraseña, soporte para Google OAuth, protección de rutas privadas y redirección post-login.
- **Perfil y Mi Biblioteca**: edición de perfil académico, carga/recorte/previsualización/eliminación de foto de perfil en Supabase Storage, cambio de contraseña, estadísticas académicas discretas, biblioteca organizada por pestañas, colecciones personalizadas, favoritos, historial de lectura, descargas y preferencias.

---

## Requisitos y ejecución local

- Node.js 20 o superior.

```bash
npm install
npm run dev
```

Comandos de verificación y producción:

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

---

## Variables de entorno

Copia `.env.example` a `.env.local` y completa tus credenciales públicas de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
VITE_APP_URL=http://localhost:5173
```

> **Seguridad:** Nunca expongas la clave `service_role` de Supabase en el frontend ni en archivos `.env` públicos.

---

## Migraciones SQL en Supabase

El proyecto conserva compatibilidad con el esquema inicial (`supabase/schema.sql`) y añade una migración **no destructiva e idempotente** en:

- `supabase/migrations/001_lexlibrary_evolution.sql`

### Pasos de configuración en Supabase

1. Abre **SQL Editor** en tu proyecto de Supabase.
2. Si es un proyecto nuevo, ejecuta primero `supabase/schema.sql` y luego `supabase/migrations/001_lexlibrary_evolution.sql`. Si ya tenías `books` creada, ejecuta únicamente `supabase/migrations/001_lexlibrary_evolution.sql`.
3. La migración crea/actualiza de forma segura:
   - Tablas: `profiles`, `categories`, `books` (columnas extendidas sin borrar datos), `user_library`, `favorites`, `reading_progress`, `reading_history`, `bookmarks`, `downloads`, `collections`, `collection_books`, `notifications` y `user_preferences`.
   - Índices, restricciones de unicidad, políticas **Row Level Security (RLS)** estrictas por usuario y trigger automático `handle_new_user()` al registrarse.
   - Función RPC `increment_book_downloads(uuid)` para contabilizar descargas de libros publicados.
   - Buckets de Storage: `documents` (público), `covers` (público), `avatars` (público con escritura restringida a `{user_id}/*`) y `private-documents` (privado con lectura por URL firmada para usuarios autenticados).

---

## Funcionalidades que requieren configuración externa

- **Autenticación real y sincronización entre dispositivos**: requieren configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` y ejecutar `supabase/migrations/001_lexlibrary_evolution.sql`.
- **Google OAuth**: requiere habilitar el proveedor Google en **Supabase Dashboard → Authentication → Providers → Google**, configurando Client ID/Secret de Google Cloud y añadiendo la URL de redirección de tu app en **Authentication → URL Configuration**.
- **Correos de confirmación y recuperación de contraseña**: requieren configurar las URLs permitidas (`/confirmar-correo` y `/restablecer-contrasena`) en Supabase Auth (y un proveedor SMTP propio para producción).
- **Catálogo real de libros y documentos privados**: requiere subir los PDFs a los buckets `documents` o `private-documents` y las portadas a `covers`, e insertar los registros publicados (`published = true`) en la tabla `public.books`.

Sin credenciales de Supabase configuradas, la aplicación funciona en **modo demostración local** con 12 recursos ilustrativos, un PDF demostrativo de 8 páginas con índice y texto seleccionable (`public/demo.pdf`), y persistencia local opcional en el navegador para evaluar las secciones personales.
