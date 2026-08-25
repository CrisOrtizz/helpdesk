import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const prefersReduced = useReducedMotion();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL as string}/auth/forgot-password`,
        { email },
        { withCredentials: true }
      );
    } catch {
      // Absorb errors intentionally — same message regardless of whether email exists
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  const inputClass =
    'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30';

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4" style={{ background: 'var(--cream)' }}>
      <div className="ambient-blob ambient-blob-1" aria-hidden />
      <div className="ambient-blob ambient-blob-2" aria-hidden />

      <motion.div {...panelAnim} className="glass relative z-10 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--orange)' }}>
            Almacén El Constructor
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Recuperar contraseña</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ background: 'rgba(79,122,91,0.12)' }}
            >
              ✓
            </div>
            <p className="text-sm" style={{ color: 'var(--navy)' }}>
              Si ese email está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm font-medium mt-2"
              style={{ color: 'var(--orange)' }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--gray-neutral)' }}>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="usuario@empresa.com"
                  className={inputClass}
                  style={{ color: 'var(--navy)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--orange)', boxShadow: '0 4px 16px rgba(235,102,0,0.25)' }}
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <div className="mt-5 text-center">
              <Link to="/login" className="text-xs" style={{ color: 'var(--gray-neutral)' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
