import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL as string}/auth/reset-password`,
        { token, new_password: password },
        { withCredentials: true }
      );
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'El enlace es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  const inputClass =
    'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30';

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <div className="glass p-8 max-w-sm w-full text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--navy)' }}>Enlace de restablecimiento inválido.</p>
          <Link to="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--orange)' }}>
            Solicitar uno nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4" style={{ background: 'var(--cream)' }}>
      <div className="ambient-blob ambient-blob-1" aria-hidden />
      <div className="ambient-blob ambient-blob-2" aria-hidden />

      <motion.div {...panelAnim} className="glass relative z-10 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--orange)' }}>
            Almacén El Constructor
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Nueva contraseña</h1>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ background: 'rgba(79,122,91,0.12)' }}
            >
              ✓
            </div>
            <p className="text-sm" style={{ color: 'var(--navy)' }}>
              Contraseña actualizada. Redirigiendo al inicio de sesión...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className={inputClass}
                style={{ color: 'var(--navy)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass}
                style={{ color: 'var(--navy)' }}
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(235,102,0,0.08)', color: 'var(--orange)', border: '1px solid rgba(235,102,0,0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--orange)', boxShadow: '0 4px 16px rgba(235,102,0,0.25)' }}
            >
              {loading ? 'Actualizando...' : 'Establecer nueva contraseña'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-xs" style={{ color: 'var(--gray-neutral)' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
