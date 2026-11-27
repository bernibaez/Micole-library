import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { m } from 'motion/react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  Compass,
  FileText,
  FolderOpen,
  FolderTree,
  Gavel,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import { AdminNavHeader } from './AdminNavHeader';
import { fetchAdminDashboardStats, fetchAdminDocuments } from '../../services/adminService';
import { triggerGoogleDriveSync } from '../../services/driveService';
import { QUERY_KEYS, useCategoriesQuery } from '../library/useLibraryData';
import { BookCover } from '../books/BookCover';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { useToast } from '../../components/feedback/ToastProvider';
import {
  formatRelativeDate,
  getDocumentTypeLabel,
  getSyncStatusLabel,
} from '../../utils/format';
import { EASE_EDITORIAL } from '../../utils/motion';

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [syncing, setSyncing] = useState(false);

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: fetchAdminDashboardStats,
  });

  const docsQuery = useQuery({
    queryKey: QUERY_KEYS.adminDocuments,
    queryFn: fetchAdminDocuments,
  });

  const { data: categories = [] } = useCategoriesQuery();

  const stats = statsQuery.data;
  const allDocs = docsQuery.data ?? [];
  const recentDocs = allDocs.slice(0, 8);
  const driveSummary = stats?.drive_summary;
  const driveConnected = Boolean(driveSummary?.connected);
  const syncState = driveSummary?.sync_state;

  const categoryBreakdown = useMemo(() => {
    const topCats = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const items = topCats.map((cat) => {
      const count = allDocs.filter(
        (d) =>
          d.category_id === cat.id ||
          d.category.toLowerCase() === cat.name.toLowerCase()
      ).length;
      return { id: cat.id, name: cat.name, count };
    });
    const maxCount = Math.max(1, ...items.map((i) => i.count));
    return items
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        percent: Math.round((item.count / maxCount) * 100),
      }));
  }, [allDocs, categories]);

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerGoogleDriveSync();
      notify(
        res.initialized
          ? 'Sincronización inicial configurada.'
          : `Sincronización completada: +${res.added} nuevos, ${res.updated} actualizados, ${res.removed} retirados.`
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDocuments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.books });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al sincronizar.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const statCards = [
    {
      label: 'Total de documentos',
      value: stats?.total_documents ?? 0,
      icon: FileText,
      to: '/admin/documentos',
    },
    {
      label: 'Libros y doctrina',
      value: stats?.total_books ?? 0,
      icon: BookOpen,
      to: '/admin/documentos',
    },
    {
      label: 'Leyes y códigos',
      value: stats?.total_laws ?? 0,
      icon: Landmark,
      to: '/admin/documentos',
    },
    {
      label: 'Sentencias y jurisp.',
      value: stats?.total_judgments ?? 0,
      icon: Gavel,
      to: '/admin/documentos',
    },
    {
      label: 'Categorías activas',
      value: stats?.total_categories ?? 0,
      icon: FolderTree,
      to: '/admin/organizacion',
    },
  ];

  const quickActions = [
    {
      title: 'Gestión documental',
      description: 'Subir, editar o importar desde Drive',
      icon: FileText,
      to: '/admin/documentos',
    },
    {
      title: 'Categorías y carpetas',
      description: 'Editar taxonomía y explorar carpetas',
      icon: FolderOpen,
      to: '/admin/organizacion',
    },
    {
      title: 'Google Drive',
      description: driveConnected ? 'Cuenta conectada y activa' : 'Vincular almacenamiento',
      icon: Cloud,
      to: '/admin/google-drive',
    },
    {
      title: 'Catálogo público',
      description: 'Previsualizar como lector',
      icon: Compass,
      to: '/explorar',
    },
  ];

  return (
    <div className="space-y-7">
      <AdminNavHeader
        title="Dashboard de la Biblioteca"
        subtitle="Resumen en tiempo real del acervo jurídico, distribución temática y estado de Google Drive."
        actions={
          <>
            <Link to="/admin/documentos">
              <Button variant="primary" size="sm">
                <FileText className="h-4 w-4" />
                Gestionar documentos
              </Button>
            </Link>
            {driveConnected && (
              <Button
                variant="secondary"
                size="sm"
                loading={syncing}
                onClick={() => void handleQuickSync()}
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar Drive
              </Button>
            )}
          </>
        }
      />

      {/* Metric Cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, idx) => (
            <Skeleton key={idx} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {statCards.map(({ label, value, icon: Icon, to }, idx) => (
            <m.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04, ease: EASE_EDITORIAL }}
            >
              <Link
                to={to}
                className="group block h-full rounded-2xl border border-line bg-white p-5 space-y-4 shadow-subtle hover:border-navy/25 hover:shadow-cover transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="h-10 w-10 rounded-2xl bg-sand-soft text-gold-dark inline-flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ink-subtle opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-navy tabular-nums leading-none">
                    <AnimatedCounter value={value} />
                  </p>
                  <p className="text-xs font-medium text-ink-muted mt-1.5">{label}</p>
                </div>
              </Link>
            </m.div>
          ))}
        </div>
      )}

      {/* Quick Actions Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map(({ title, description, icon: Icon, to }) => (
          <Link
            key={title}
            to={to}
            className="group flex items-center gap-3.5 rounded-2xl border border-line bg-sand-soft/45 hover:bg-white hover:border-navy/25 px-4 py-3.5 transition-all"
          >
            <span className="h-9 w-9 rounded-xl bg-white border border-line text-navy inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold group-hover:border-navy transition-colors shadow-subtle">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy truncate">{title}</p>
              <p className="text-[11px] text-ink-muted truncate">{description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-ink-subtle group-hover:text-navy shrink-0 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Drive Health + Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unified Google Drive & Sync Card */}
        <section className="rounded-2xl border border-line bg-white p-6 flex flex-col justify-between gap-5 shadow-subtle">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={
                    driveConnected
                      ? 'h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center justify-center'
                      : 'h-10 w-10 rounded-2xl bg-surface-secondary border border-line text-ink-subtle inline-flex items-center justify-center'
                  }
                >
                  {driveConnected ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-navy">Google Drive y Sincronización</h2>
                  <p className="text-xs text-ink-muted">
                    {driveConnected && driveSummary?.connection
                      ? driveSummary.connection.google_email
                      : 'Almacenamiento documental en la nube'}
                  </p>
                </div>
              </div>

              <span
                className={
                  driveConnected
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-800'
                    : 'inline-flex items-center gap-1.5 rounded-full bg-surface-secondary border border-line px-3 py-1 text-[11px] font-semibold text-ink-muted'
                }
              >
                <span
                  className={
                    driveConnected
                      ? 'h-2 w-2 rounded-full bg-emerald-500 animate-pulse'
                      : 'h-2 w-2 rounded-full bg-ink-subtle'
                  }
                />
                {driveConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {driveConnected ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-xl bg-sand-soft/75 border border-line/60 p-3">
                  <p className="text-ink-subtle">Enlazados a Drive</p>
                  <p className="text-lg font-bold text-navy tabular-nums mt-0.5">
                    {stats?.drive_linked_documents ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-sand-soft/75 border border-line/60 p-3">
                  <p className="text-ink-subtle">Carpetas</p>
                  <p className="text-lg font-bold text-navy tabular-nums mt-0.5">
                    {stats?.total_folders ?? 0}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl bg-sand-soft/75 border border-line/60 p-3">
                  <p className="text-ink-subtle">Último ciclo</p>
                  <p className="text-xs font-semibold text-navy mt-1.5 truncate">
                    {syncState?.last_sync_at
                      ? formatRelativeDate(syncState.last_sync_at)
                      : 'Pendiente'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Conecta una cuenta de Google Drive dedicada para importar carpetas y libros sin
                duplicar archivos y mantener la biblioteca actualizada con Changes API.
              </p>
            )}

            {syncState && driveConnected && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 font-medium">
                  +{syncState.files_added} añadidos
                </span>
                <span className="rounded-full bg-surface-secondary text-navy border border-line px-2.5 py-0.5 font-medium">
                  {syncState.files_updated} actualizados
                </span>
                <span className="rounded-full bg-surface-secondary text-ink-muted border border-line px-2.5 py-0.5 font-medium">
                  {syncState.files_removed} retirados
                </span>
              </div>
            )}

            {(driveSummary?.connection?.last_error || syncState?.last_error) && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{driveSummary?.connection?.last_error || syncState?.last_error}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/70">
            {driveConnected && (
              <Button
                variant="primary"
                size="sm"
                loading={syncing}
                onClick={() => void handleQuickSync()}
              >
                <CheckCircle2 className="h-4 w-4" />
                Sincronizar ahora
              </Button>
            )}
            <Link to="/admin/google-drive">
              <Button variant={driveConnected ? 'secondary' : 'primary'} size="sm">
                {driveConnected ? 'Administrar conexión' : 'Configurar Google Drive'}
              </Button>
            </Link>
          </div>
        </section>

        {/* Category Distribution Visual Card */}
        <section className="rounded-2xl border border-line bg-white p-6 flex flex-col justify-between gap-4 shadow-subtle">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-navy">Distribución por categorías</h2>
                <p className="text-xs text-ink-muted">
                  Secciones con mayor volumen documental en el catálogo.
                </p>
              </div>
              <Link
                to="/admin/organizacion"
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-navy hover:bg-sand-soft transition-colors"
              >
                Editar
                <ArrowUpRight className="h-3.5 w-3.5 text-ink-muted" />
              </Link>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">
                Aún no hay categorías registradas.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((item) => (
                  <Link
                    key={item.id}
                    to={`/explorar?categoria=${encodeURIComponent(item.name)}`}
                    className="group block space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-navy group-hover:text-gold-dark transition-colors truncate">
                        {item.name}
                      </span>
                      <span className="font-semibold text-ink-muted tabular-nums shrink-0">
                        {item.count} {item.count === 1 ? 'doc.' : 'docs.'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-sand-soft overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
                        style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.percent)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Latest Imported / Added Documents */}
      <section className="rounded-2xl border border-line bg-white overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy">Últimos documentos incorporados</h2>
            <p className="text-xs text-ink-muted">
              Registros más recientes en el catálogo (manuales e importados desde Drive).
            </p>
          </div>
          <Link
            to="/admin/documentos"
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:bg-sand-soft transition-colors"
          >
            Ver todos
            <ArrowUpRight className="h-3.5 w-3.5 text-ink-muted" />
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Aún no hay documentos registrados en Supabase.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                to={`/libro/${doc.id}`}
                className="group px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3.5 hover:bg-sand-soft/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 shrink-0">
                    <BookCover book={doc} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy group-hover:text-navy-secondary truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-ink-muted truncate mt-0.5">
                      {doc.author} · {doc.category} · {getDocumentTypeLabel(doc.document_type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Badge variant={doc.sync_status === 'synced' ? 'gold' : 'neutral'}>
                    {getSyncStatusLabel(doc.sync_status)}
                  </Badge>
                  {doc.added_at && (
                    <span className="hidden sm:inline text-[11px] text-ink-subtle tabular-nums">
                      {formatRelativeDate(doc.added_at)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
