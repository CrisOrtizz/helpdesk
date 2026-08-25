import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

interface Props {
  /** Si se especifica, solo los usuarios con ese rol pueden acceder. */
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    // Usuario autenticado pero sin el rol requerido
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
