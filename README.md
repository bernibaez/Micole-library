# LexLibrary — Biblioteca Jurídica Virtual

Plataforma digital personal y académica para organizar, consultar, visualizar y descargar documentos jurídicos con una **arquitectura híbrida**:

- **Supabase (cerebro de la aplicación):** PostgreSQL (metadatos, categorías, carpetas, favoritos, recientes, estadísticas), Supabase Auth (autenticación y roles `admin`/`visitor`), Row Level Security (RLS) y Edge Functions.
- **Google Drive (almacenamiento principal):** conserva los archivos originales (PDF, Word, Google Docs, legislación, jurisprudencia, doctrina) sin duplicarlos en Supabase Storage ni hacerlos públicos automáticamente.

---

## Arquitectura e integración con Google Drive

### Seguridad y modelo de permisos

1. **Roles validados en el servidor:**
   - **Visitantes anónimos:** exploran catálogo, categorías, carpetas/breadcrumbs, consultan documentos públicos autorizados, descargan documentos habilitados y guardan favoritos y recientes en `localStorage`.
   - **Usuarios registrados:** sincronizan favoritos (`document_favorites`), recientes (`recent_documents`), progreso de lectura, marcadores y colecciones en Supabase.
   - **Administrador (`profiles.role = 'admin'`):** acceso completo al panel `/admin` (dashboard, gestión documental, categorías/carpetas y configuración de Google Drive), validado en cada tabla con `public.is_admin()` y en cada Edge Function mediante verificación JWT.
2. **Alcance OAuth 2.0 (`drive.readonly`):**
   - Se solicita `https://www.googleapis.com/auth/drive.readonly` + `openid email profile`.
   - Este alcance permite listar y recorrer recursivamente carpetas preexistentes en Google Drive, usar Google Drive Changes API y retransmitir archivos por proxy **sin capacidad destructiva** (la aplicación nunca modifica ni elimina archivos originales de Google Drive).
   - **Recomendación crítica:** autoriza una **cuenta de Google dedicada exclusivamente a la biblioteca jurídica** para evitar conceder acceso de lectura a tu Drive personal.
   - **Nota sobre verificación de Google Cloud (publicación externa):** `drive.readonly` es un alcance **restringido (Restricted Scope)** de Google.
     - Mientras la pantalla de consentimiento esté en modo **Pruebas (Testing)** con tu correo administrador añadido como *Usuario de prueba* (o modo **Interno** si usas Google Workspace), no necesitas verificación externa.
     - Si en el futuro publicas la pantalla de consentimiento en modo **Producción** para usuarios externos con `drive.readonly`, Google exigirá verificación de alcance restringido y una evaluación de seguridad (CASA). Para una biblioteca con un único administrador propietario, mantener la app en modo *Testing* (con la cuenta administradora en usuarios de prueba) o cuenta Workspace *Internal* es la vía recomendada.
3. **Tokens cifrados y cero secretos en el frontend:**
   - `access_token` y `refresh_token` se cifran con **AES-256-GCM** dentro de las Edge Functions (`DRIVE_TOKEN_ENCRYPTION_KEY`) antes de guardarse en `public.google_drive_connections`.
   - `google_drive_connections` no tiene políticas RLS de lectura para clientes (`anon`/`authenticated`); solo `service_role` accede a los tokens.
   - El visor y las descargas de documentos almacenados en Google Drive pasan por la Edge Function `drive-file-proxy`, que verifica `published`, `visibility`, `allow_preview` y `allow_download` en PostgreSQL y retransmite el stream con soporte HTTP `Range` sin exponer credenciales de Google ni hacer público el archivo.

---

## Estructura de la biblioteca (9 secciones + subcategoría integrada)

1. Inicio rápido
2. Legislación dominicana
   - Subcategoría integrada: **Legislación derogada o histórica** (nunca como sección independiente)
3. Jurisprudencia
4. Doctrina
5. Derecho comparado
6. Artículos y publicaciones académicas
7. Cursos y trabajos
8. Otras lecturas
9. Formación y desarrollo profesional jurídico

Dentro de cada categoría y subcategoría se pueden crear **carpetas y subcarpetas** dinámicas o importar jerarquías completas directamente desde Google Drive.

---

## Ejecución local

Requisitos: Node.js 20+ y Supabase CLI (para desplegar migraciones y Edge Functions).

```bash
npm install
npm run dev
```

Verificación de calidad:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Configuración paso a paso (Supabase + Google Cloud)

### 1. Variables públicas del frontend (`.env.local`)

Copia `.env.example` a `.env.local`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
VITE_APP_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=tu-api-key-restringida-para-picker
VITE_GOOGLE_APP_ID=tu-project-number-google-cloud
```

> Restringe `VITE_GOOGLE_API_KEY` en Google Cloud Console por **HTTP Referrer** (tu dominio / `http://localhost:5173/*`) y únicamente a la **Google Picker API**.

### 2. Migraciones SQL en Supabase (no destructivas)

Ejecuta en orden en el **SQL Editor** de Supabase (ambas son idempotentes y no borran datos previos):

1. `supabase/schema.sql` (solo si el proyecto está vacío)
2. `supabase/migrations/001_lexlibrary_evolution.sql`
3. `supabase/migrations/002_virtual_legal_library.sql`

### 3. Asignar el primer usuario administrador

Registra tu cuenta desde `/crear-cuenta` y luego promueve tu perfil a administrador desde el SQL Editor de Supabase (el trigger de seguridad impide que un usuario cambie su propio rol desde el frontend):

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo-admin@ejemplo.com';
```

### 4. Configurar Google Cloud Console

1. Crea un proyecto en Google Cloud Console y habilita:
   - **Google Drive API**
   - **Google Picker API**
2. Configura la pantalla de consentimiento OAuth (External en modo *Testing* añadiendo la cuenta dedicada de la biblioteca como usuario de prueba, o *Internal* si usas Google Workspace) con el alcance `https://www.googleapis.com/auth/drive.readonly`.
3. Crea un **ID de cliente OAuth 2.0 (Aplicación web)** y añade como URI de redirección autorizada:
   - Local: `http://localhost:5173/admin/google-drive/callback`
   - Producción: `https://tu-dominio.com/admin/google-drive/callback`
4. Crea una **API Key** restringida por dominio únicamente para **Google Picker API** y anota el **Número de proyecto** (`VITE_GOOGLE_APP_ID`).

### 5. Secretos y despliegue de Supabase Edge Functions

Genera una clave aleatoria de 32 bytes en base64 para cifrado AES-256-GCM:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configura los secretos en Supabase (nunca en el frontend):

```bash
supabase secrets set \
  GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="tu-client-secret" \
  GOOGLE_OAUTH_REDIRECT_URI="http://localhost:5173/admin/google-drive/callback" \
  DRIVE_TOKEN_ENCRYPTION_KEY="tu-clave-base64-de-32-bytes" \
  ALLOWED_ORIGINS="http://localhost:5173,https://tu-dominio.com"
```

Despliega las 5 Edge Functions:

```bash
supabase functions deploy google-drive-oauth
supabase functions deploy google-drive-picker-token
supabase functions deploy google-drive-import
supabase functions deploy google-drive-sync
supabase functions deploy drive-file-proxy --no-verify-jwt
```

---

## Checklist de pruebas reales (al conectar credenciales)

- [ ] Visitante anónimo: explorar catálogo, filtrar por categoría/subcategoría/vigencia/materia, navegar carpetas con breadcrumbs, ver y descargar documento público, guardar favoritos y recientes en `localStorage`.
- [ ] Visitante anónimo bloqueado en `/admin/*` y bloqueado por RLS y `drive-file-proxy` para documentos `registered` o `admin_only`.
- [ ] Administrador: conectar cuenta dedicada de Google Drive vía `/admin/google-drive`, verificar correo y alcance `drive.readonly`.
- [ ] Importación individual desde Google Picker (PDF y Word) sin duplicar si se vuelve a seleccionar el mismo archivo.
- [ ] Importación masiva de carpeta con subcarpetas anidadas: validar preservación de jerarquía en `folders` y `documents`.
- [ ] Sincronización incremental (Changes API): añadir, renombrar y enviar a la papelera un archivo en Drive, sincronizar y validar reflejo exacto en Supabase sin alterar archivos de Drive.
- [ ] Eliminación segura de registro en `/admin/documentos`: verificar que desaparece de Supabase mientras el archivo original permanece intacto en Google Drive.
- [ ] Visualización y descarga móvil y desktop en `/leer/:id` (PDF streaming vía `drive-file-proxy` + formato no-PDF).
