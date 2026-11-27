import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminRoute } from '../features/auth/AdminRoute';
import { AuthLayout } from '../features/auth/AuthLayout';
import { BookGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/feedback/EmptyState';
import { Button } from '../components/ui/Button';
import { PAGE_VARIANTS } from '../utils/motion';

const HomePage = lazy(() =>
  import('../features/books/HomePage').then((m) => ({ default: m.HomePage }))
);
const CatalogPage = lazy(() =>
  import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const CategoriesPage = lazy(() =>
  import('../features/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const BookDetailPage = lazy(() =>
  import('../features/books/BookDetailPage').then((m) => ({ default: m.BookDetailPage }))
);
const AboutPage = lazy(() =>
  import('../features/books/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const PdfReaderPage = lazy(() =>
  import('../features/reader/PdfReaderPage').then((m) => ({ default: m.PdfReaderPage }))
);
const LibraryPage = lazy(() =>
  import('../features/library/LibraryPage').then((m) => ({ default: m.LibraryPage }))
);
const FavoritesPage = lazy(() =>
  import('../features/library/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const RecentDocumentsPage = lazy(() =>
  import('../features/library/RecentDocumentsPage').then((m) => ({
    default: m.RecentDocumentsPage,
  }))
);
const HistoryPage = lazy(() =>
  import('../features/library/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const DownloadsPage = lazy(() =>
  import('../features/library/DownloadsPage').then((m) => ({ default: m.DownloadsPage }))
);
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import('../features/profile/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const EmailConfirmPage = lazy(() =>
  import('../features/auth/EmailConfirmPage').then((m) => ({ default: m.EmailConfirmPage }))
);

// Admin pages
const AdminDashboardPage = lazy(() =>
  import('../features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminDocumentsPage = lazy(() =>
  import('../features/admin/AdminDocumentsPage').then((m) => ({ default: m.AdminDocumentsPage }))
);
const AdminOrganizationPage = lazy(() =>
  import('../features/admin/AdminOrganizationPage').then((m) => ({
    default: m.AdminOrganizationPage,
  }))
);
const AdminGoogleDrivePage = lazy(() =>
  import('../features/admin/AdminGoogleDrivePage').then((m) => ({
    default: m.AdminGoogleDrivePage,
  }))
);
const GoogleDriveCallbackPage = lazy(() =>
  import('../features/admin/GoogleDriveCallbackPage').then((m) => ({
    default: m.GoogleDriveCallbackPage,
  }))
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function ShellLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AppShell>
      <Suspense fallback={<BookGridSkeleton count={6} />}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {outlet}
          </m.div>
        </AnimatePresence>
      </Suspense>
    </AppShell>
  );
}

function NotFoundPage() {
  return (
    <EmptyState
      mascot="not-found"
      title="Página no encontrada"
      description="La ruta que intentas visitar no existe en MICOLE LIBRARY."
      action={
        <Link to="/">
          <Button variant="primary" className="rounded-full">
            Volver al inicio
          </Button>
        </Link>
      }
    />
  );
}

export function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center p-8 bg-paper">
            <div className="w-full max-w-4xl">
              <BookGridSkeleton count={6} />
            </div>
          </div>
        }
      >
        <Routes>
          {/* Full-screen routes outside main shell */}
          <Route path="/leer/:id" element={<PdfReaderPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/crear-cuenta" element={<RegisterPage />} />
            <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
            <Route path="/confirmar-correo" element={<EmailConfirmPage />} />
          </Route>

          {/* Main editorial shell */}
          <Route element={<ShellLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explorar" element={<CatalogPage />} />
            <Route path="/biblioteca" element={<CatalogPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/libro/:id" element={<BookDetailPage />} />
            <Route path="/acerca" element={<AboutPage />} />

            {/* Accessible to both visitors (localStorage) and authenticated users (Supabase) */}
            <Route path="/favoritos" element={<FavoritesPage />} />
            <Route path="/recientes" element={<RecentDocumentsPage />} />

            {/* Authenticated personal routes */}
            <Route
              path="/mi-biblioteca"
              element={
                <ProtectedRoute>
                  <LibraryPage />
                </ProtectedRoute>
              }
            />
            <Route path="/guardados" element={<Navigate to="/mi-biblioteca" replace />} />
            <Route
              path="/historial"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/descargas"
              element={
                <ProtectedRoute>
                  <DownloadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Administrative routes (validated in frontend + Supabase RLS & Edge Functions) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/documentos"
              element={
                <AdminRoute>
                  <AdminDocumentsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/organizacion"
              element={
                <AdminRoute>
                  <AdminOrganizationPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/google-drive"
              element={
                <AdminRoute>
                  <AdminGoogleDrivePage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/google-drive/callback"
              element={
                <AdminRoute>
                  <GoogleDriveCallbackPage />
                </AdminRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
