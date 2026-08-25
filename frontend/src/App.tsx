import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tryRestoreSession } from './lib/api';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TicketsListPage from './pages/TicketsListPage';
import CreateTicketPage from './pages/CreateTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';

const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const AssetsPage = lazy(() => import('./pages/admin/AssetsPage'));

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--cream)' }}>
      {/* Animated background blobs */}
      <div className="ambient-blob ambient-blob-1" aria-hidden />
      <div className="ambient-blob ambient-blob-2" aria-hidden />

      <Sidebar />

      {/* Main content: pushed right by sidebar on desktop, padded bottom on mobile */}
      <main
        className="relative z-10 px-4 py-6 md:py-8 md:px-8 pb-24 md:pb-8"
        style={{ marginLeft: 0 }}
      >
        <div className="md:ml-60 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

const AdminFallback = (
  <div className="flex items-center justify-center py-20">
    <span className="text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</span>
  </div>
);

export default function App() {
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    tryRestoreSession().finally(() => setSessionChecked(true));
  }, []);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <span className="text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</span>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected — any authenticated user */}
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <AppLayout><TicketsListPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/new"
            element={
              <ProtectedRoute>
                <AppLayout><CreateTicketPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <AppLayout><TicketDetailPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <Suspense fallback={AdminFallback}><UsersPage /></Suspense>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <Suspense fallback={AdminFallback}><CategoriesPage /></Suspense>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assets"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <Suspense fallback={AdminFallback}><AssetsPage /></Suspense>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
