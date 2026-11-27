# Backend Supabase — Biblioteca Jurídica Virtual (LexLibrary)

## Migraciones SQL (orden idempotente y no destructivo)

1. `schema.sql` — Esquema inicial base (solo en proyectos vacíos).
2. `migrations/001_lexlibrary_evolution.sql` — Perfiles, categorías base, biblioteca personal, progreso de lectura, marcadores, colecciones y notificaciones.
3. `migrations/002_virtual_legal_library.sql` — Evolución completa a Biblioteca Jurídica Virtual:
   - Roles administrativos (`profiles.role`) con trigger anti-auto-escalación y helper `public.is_admin()`.
   - Taxonomía oficial de 9 secciones con **Legislación derogada o histórica** anidada como subcategoría de **Legislación dominicana**.
   - Tablas `folders`, `documents`, `document_favorites`, `recent_documents`, `google_drive_connections`, `google_drive_oauth_states`, `drive_sync_state` y `download_events`.
   - Políticas RLS estrictas y RPCs seguras (`get_admin_dashboard_stats`, `get_drive_connection_summary`, `record_document_download`, `record_recent_document`).

## Edge Functions (`supabase/functions/`)

| Función | JWT | Responsabilidad |
| --- | --- | --- |
| `google-drive-oauth` | Admin JWT | Inicia OAuth 2.0 (`drive.readonly`), valida `state` CSRF, cifra tokens (AES-256-GCM), desconecta y revoca. |
| `google-drive-picker-token` | Admin JWT | Entrega `access_token` efímero solo al administrador para abrir Google Picker (nunca expone `refresh_token`). |
| `google-drive-import` | Admin JWT | Importa documentos individuales y carpetas recursivamente con paginación y lotes de 50 sin duplicar registros. |
| `google-drive-sync` | Admin JWT | Sincronización incremental vía Google Drive Changes API con recuperación ante expiración de token. |
| `drive-file-proxy` | Público / Auth | Valida permisos en PostgreSQL (`published`, `visibility`, `allow_preview`, `allow_download`), retransmite binarios con soporte `Range` y registra `download_events`. |
