import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  CloudOff,
  FileText,
  Folder,
  FolderTree,
  Link2,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { AdminNavHeader } from './AdminNavHeader';
import {
  disconnectGoogleDrive,
  fetchDriveConnectionSummary,
  startGoogleDriveOAuth,
  triggerGoogleDriveSync,
} from '../../services/driveService';
import { QUERY_KEYS } from '../library/useLibraryData';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatFullDate, formatRelativeDate } from '../../utils/format';

export function AdminGoogleDrivePage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.driveSummary,
    queryFn: fetchDriveConnectionSummary,
  });

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const summary = summaryQuery.data;
  const connected = Boolean(summary?.connected);
  const connection = summary?.connection ?? null;
  const syncState = summary?.sync_state ?? null;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { authUrl } = await startGoogleDriveOAuth('/admin/google-drive');
      window.location.href = authUrl;
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la autenticación con Google Drive.',
        'error'
      );
      setConnecting(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectGoogleDrive();
      setDisconnectModalOpen(false);
      notify('Cuenta de Google Drive desconectada y tokens revocados.');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.driveSummary });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al desconectar Google Drive.', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerGoogleDriveSync();
      notify(
        res.initialized
          ? 'Token inicial de Google Drive Changes API guardado.'
          : `Sincronización completada: +${res.added} nuevos, ${res.updated} actualizados, ${res.removed} retirados.`
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.driveSummary });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDocuments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.books });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error durante la sincronización.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminNavHeader
        title="Google Drive"
        subtitle="Conecta la cuenta dedicada de almacenamiento documental, gestiona la sincronización incremental y consulta incidencias."
        actions={
          connected ? (
            <Button variant="primary" size="sm" loading={syncing} onClick={() => void handleSync()}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar ahora
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={connecting}
              onClick={() => void handleConnect()}
            >
              <Link2 className="h-4 w-4" />
              Conectar Google Drive
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 items-start">
        {/* Connection Status Card */}
        {summaryQuery.isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : (
          <section className="rounded-2xl border border-line bg-white p-6 space-y-5 shadow-subtle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={
                    connected
                      ? 'h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center'
                      : 'h-12 w-12 rounded-2xl bg-sand-soft text-ink-subtle border border-line inline-flex items-center justify-center'
                  }
                >
                  {connected ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-navy">Cuenta OAuth 2.0</h2>
                  <p className="text-xs text-ink-muted">
                    {connected && connection
                      ? `Conectada desde ${formatFullDate(connection.connected_at)}`
                      : 'Sin cuenta autorizada en este momento'}
                  </p>
                </div>
              </div>

              <span
                className={
                  connected
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800'
                    : 'inline-flex items-center gap-1.5 rounded-full bg-surface-secondary border border-line px-3 py-1 text-xs font-semibold text-ink-muted'
                }
              >
                <span
                  className={
                    connected
                      ? 'h-2 w-2 rounded-full bg-emerald-500 animate-pulse'
                      : 'h-2 w-2 rounded-full bg-ink-subtle'
                  }
                />
                {connected
                  ? connection?.status === 'needs_reauth'
                    ? 'Requiere reconexión'
                    : 'Conectado'
                  : 'Desconectado'}
              </span>
            </div>

            {connected && connection ? (
              <div className="rounded-2xl bg-sand-soft/65 border border-line p-4 space-y-3">
                <div className="flex items-center gap-3.5">
                  {connection.google_avatar_url ? (
                    <img
                      src={connection.google_avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full border border-white shadow-sm"
                    />
                  ) : (
                    <span className="h-11 w-11 rounded-full bg-navy text-gold font-semibold text-sm inline-flex items-center justify-center">
                      {(connection.google_display_name || connection.google_email || 'G')[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">
                      {connection.google_display_name || connection.google_email}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{connection.google_email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {connection.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-[11px] bg-white border border-line rounded-lg px-2.5 py-0.5 text-ink-muted font-medium"
                    >
                      {scope.replace('https://www.googleapis.com/auth/', '')}
                    </span>
                  ))}
                </div>
                {connection.last_error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{connection.last_error}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted leading-relaxed">
                Pulsa el botón inferior para autorizar el acceso de solo lectura mediante Google
                OAuth 2.0 y vincular tus carpetas jurídicas.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!connected ? (
                <Button variant="primary" loading={connecting} onClick={() => void handleConnect()}>
                  <Link2 className="h-4 w-4" />
                  Conectar cuenta de Google Drive
                </Button>
              ) : (
                <>
                  <Button variant="primary" loading={syncing} onClick={() => void handleSync()}>
                    <RefreshCw className="h-4 w-4" />
                    Sincronizar biblioteca ahora
                  </Button>
                  <Button
                    variant="secondary"
                    loading={connecting}
                    onClick={() => void handleConnect()}
                  >
                    Reconectar / cambiar cuenta
                  </Button>
                  <Button
                    variant="danger"
                    loading={disconnecting}
                    onClick={() => setDisconnectModalOpen(true)}
                  >
                    <Unlink className="h-4 w-4" />
                    Desconectar
                  </Button>
                </>
              )}
            </div>
          </section>
        )}

        {/* Sync State & Tracked Roots Card */}
        <section className="rounded-2xl border border-line bg-white p-6 space-y-5 shadow-subtle">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-navy">
                Sincronización incremental (Changes API)
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Detecta archivos nuevos, modificados o eliminados automáticamente.
              </p>
            </div>
            {syncState?.has_change_token && (
              <Badge variant="gold">
                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                Token activo
              </Badge>
            )}
          </div>

          {syncState ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-sand-soft/75 border border-line/60 p-3.5">
                  <dt className="text-ink-subtle">Última sincronización</dt>
                  <dd className="text-sm font-semibold text-navy mt-1">
                    {syncState.last_sync_at ? formatRelativeDate(syncState.last_sync_at) : 'Nunca'}
                  </dd>
                </div>
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-3.5">
                  <dt className="text-emerald-800/80">Añadidos</dt>
                  <dd className="text-sm font-bold text-emerald-900 mt-1 tabular-nums">
                    +{syncState.files_added}
                  </dd>
                </div>
                <div className="rounded-xl bg-sand-soft/75 border border-line/60 p-3.5">
                  <dt className="text-ink-subtle">Actualizados</dt>
                  <dd className="text-sm font-bold text-navy mt-1 tabular-nums">
                    {syncState.files_updated}
                  </dd>
                </div>
                <div className="rounded-xl bg-sand-soft/75 border border-line/60 p-3.5">
                  <dt className="text-ink-subtle">Retirados en Drive</dt>
                  <dd className="text-sm font-bold text-navy mt-1 tabular-nums">
                    {syncState.files_removed}
                  </dd>
                </div>
              </dl>

              {syncState.tracked_roots && syncState.tracked_roots.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-navy uppercase tracking-wider">
                      Carpetas raíz rastreadas ({syncState.tracked_roots.length})
                    </p>
                    <Link
                      to="/admin/organizacion"
                      className="text-xs font-medium text-navy hover:text-gold-dark inline-flex items-center gap-0.5"
                    >
                      Explorar
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {syncState.tracked_roots.map((root) => (
                      <Link
                        key={root.driveFolderId}
                        to="/admin/organizacion"
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-sand-soft/60 hover:bg-white hover:border-navy/25 px-3 py-1.5 text-xs font-medium text-navy transition-colors"
                      >
                        <Folder className="h-3.5 w-3.5 text-gold-dark" />
                        {root.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {syncState.last_error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Última incidencia registrada
                  </p>
                  <p>{syncState.last_error}</p>
                </div>
              )}

              {syncState.recent_errors && syncState.recent_errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-navy">
                    Detalle de errores recientes ({syncState.recent_errors.length})
                  </p>
                  <ul className="divide-y divide-line rounded-xl border border-line text-xs">
                    {syncState.recent_errors.map((err, i) => (
                      <li key={i} className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-navy truncate">
                            {err.name || err.fileId || 'Elemento'}
                          </p>
                          <p className="text-red-700">{err.message}</p>
                        </div>
                        <span className="text-ink-subtle shrink-0">
                          {formatRelativeDate(err.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong bg-sand-soft/40 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-navy">Sin sincronizaciones todavía</p>
              <p className="text-xs text-ink-muted">
                Ejecuta una sincronización manual o importa carpetas desde Gestión documental para
                iniciar el rastreo incremental.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Quick Navigation Strip to Related Admin Workspaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Link
          to="/admin/documentos"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white hover:border-navy/25 hover:bg-sand-soft/35 p-4 transition-all shadow-subtle"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold transition-colors">
              <FileText className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">Importar archivos o carpetas</p>
              <p className="text-xs text-ink-muted truncate">
                Abre Google Picker en Gestión documental para vincular nuevos PDFs.
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-ink-subtle group-hover:text-navy shrink-0" />
        </Link>

        <Link
          to="/admin/organizacion"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white hover:border-navy/25 hover:bg-sand-soft/35 p-4 transition-all shadow-subtle"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold transition-colors">
              <FolderTree className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">Organizar categorías y carpetas</p>
              <p className="text-xs text-ink-muted truncate">
                Edita secciones temáticas y navega las carpetas sincronizadas.
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-ink-subtle group-hover:text-navy shrink-0" />
        </Link>
      </div>

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={disconnectModalOpen}
        onClose={() => setDisconnectModalOpen(false)}
        title="Desconectar Google Drive"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-ink leading-relaxed">
            ¿Desconectar esta cuenta de Google Drive? Los registros en Supabase se conservarán, pero
            las vistas previas y descargas desde Drive dejarán de funcionar hasta reconectar.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDisconnectModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={disconnecting}
              onClick={() => void handleConfirmDisconnect()}
            >
              <Unlink className="h-4 w-4" />
              Desconectar cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
