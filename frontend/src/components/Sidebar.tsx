import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// ---- Inline SVG icons ----
const IconTickets = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconDevice = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

interface NavItem {
  to: string;
  label: string;
  Icon: React.FC;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/tickets', label: 'Tickets', Icon: IconTickets },
  { to: '/tickets/new', label: 'Nuevo ticket', Icon: IconPlus },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: '/admin/users', label: 'Usuarios', Icon: IconUsers },
  { to: '/admin/categories', label: 'Categorías', Icon: IconTag },
  { to: '/admin/assets', label: 'Activos', Icon: IconDevice },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
      style={{
        color: active ? 'var(--orange)' : 'var(--navy)',
        background: active ? 'rgba(235,102,0,0.08)' : 'transparent',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6 }}><item.Icon /></span>
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);

  const isActive = (to: string) =>
    to === '/tickets'
      ? location.pathname === '/tickets'
      : location.pathname.startsWith(to);

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
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-col fixed top-4 left-4 bottom-4 w-56 z-20"
        style={{ zIndex: 20 }}
      >
        <div
          className="glass flex flex-col h-full p-4 gap-1"
          style={{ borderRadius: 20 }}
        >
          {/* Logo */}
          <div className="px-3 py-3 mb-2">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--orange)' }}>
              El Constructor
            </p>
            <p className="text-lg font-bold leading-tight" style={{ color: 'var(--navy)' }}>
              Helpdesk
            </p>
          </div>

          {/* Main nav */}
          <nav className="flex flex-col gap-0.5">
            {MAIN_ITEMS.map(item => (
              <NavLink key={item.to} item={item} active={isActive(item.to)} />
            ))}
          </nav>

          {/* Admin section */}
          {user?.rol === 'admin' && (
            <div className="mt-4">
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gray-neutral)' }}>
                Admin
              </p>
              <nav className="flex flex-col gap-0.5">
                {ADMIN_ITEMS.map(item => (
                  <NavLink key={item.to} item={item} active={isActive(item.to)} />
                ))}
              </nav>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* User info + logout */}
          <div
            className="pt-3 mt-2"
            style={{ borderTop: '1px solid rgba(0,18,43,0.08)' }}
          >
            <p className="px-3 text-sm font-medium truncate" style={{ color: 'var(--navy)' }}>
              {user?.nombre}
            </p>
            <p className="px-3 text-xs mb-3" style={{ color: 'var(--gray-neutral)' }}>
              {user?.rol === 'admin' ? 'Administrador' : user?.rol === 'agente_soporte' ? 'Agente' : 'Solicitante'}
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm transition-all duration-150 hover:bg-red-50"
              style={{ color: '#dc2626' }}
            >
              <IconLogout /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.8)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0,18,43,0.08)',
          minHeight: 60,
        }}
      >
        {MAIN_ITEMS.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[44px] min-h-[44px] justify-center"
              style={{ color: active ? 'var(--orange)' : 'var(--gray-neutral)' }}
            >
              <item.Icon />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
        {user?.rol === 'admin' && (
          <Link
            to="/admin/users"
            className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[44px] min-h-[44px] justify-center"
            style={{ color: location.pathname.startsWith('/admin') ? 'var(--orange)' : 'var(--gray-neutral)' }}
          >
            <IconUsers />
            <span className="text-xs">Admin</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[44px] min-h-[44px] justify-center"
          style={{ color: 'var(--gray-neutral)' }}
        >
          <IconLogout />
          <span className="text-xs">Salir</span>
        </button>
      </nav>
    </>
  );
}
