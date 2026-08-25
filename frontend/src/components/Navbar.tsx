import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL as string}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/tickets" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
        Helpdesk El Constructor
      </Link>
      <div className="flex items-center gap-4">
        <Link
          to="/tickets/new"
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nuevo ticket
        </Link>
        <span className="text-sm text-gray-600">
          {user?.nombre} <span className="text-gray-400">({user?.rol})</span>
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
