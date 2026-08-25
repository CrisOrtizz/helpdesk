import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import type { TokenResponse, User } from '../types';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const prefersReduced = useReducedMotion();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: tokenData } = await axios.post<TokenResponse>(
        `${import.meta.env.VITE_API_URL as string}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const { data: user } = await axios.get<User>(
        `${import.meta.env.VITE_API_URL as string}/users/me`,
        { withCredentials: true, headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      setAuth(tokenData.access_token, user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Email o contraseña incorrectos');
      } else {
        setError('Error de conexión con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  const inputClass =
    'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all duration-150' +
    ' bg-white/70 border-white/80 focus:ring-orange/40';

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4"
      style={{ background: 'var(--cream)' }}
    >
      {/* Background blobs */}
      <div className="ambient-blob ambient-blob-1" aria-hidden />
      <div className="ambient-blob ambient-blob-2" aria-hidden />

      <motion.div
        {...panelAnim}
        className="glass relative z-10 w-full max-w-sm p-8"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--orange)' }}>
            Almacén El Constructor
          </p>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>Helpdesk</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gray-neutral)' }}>Ingresa a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="usuario@empresa.com"
              className={inputClass}
              style={{ color: 'var(--navy)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
              style={{ color: 'var(--navy)' }}
            />
          </div>

          {error && (
            <motion.p
              initial={prefersReduced ? {} : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm px-3 py-2 rounded-xl"
              style={{ background: 'rgba(235,102,0,0.08)', color: 'var(--orange)', border: '1px solid rgba(235,102,0,0.2)' }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50"
            style={{ background: loading ? 'rgba(235,102,0,0.7)' : 'var(--orange)', boxShadow: '0 4px 16px rgba(235,102,0,0.25)' }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/forgot-password"
            className="text-xs transition-colors duration-150"
            style={{ color: 'var(--gray-neutral)' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
