import { useState, useEffect, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import type { User, UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  agente_soporte: 'Agente',
  solicitante: 'Solicitante',
};

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30';

interface UserCreate {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  departamento: string;
}

export default function UsersPage() {
  const prefersReduced = useReducedMotion();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserCreate>({
    nombre: '', email: '', password: '', rol: 'solicitante', departamento: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = () => {
    setLoading(true);
    api.get<User[]>('/users')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/users', form);
      setSuccess(`Usuario ${form.nombre} creado correctamente.`);
      setForm({ nombre: '', email: '', password: '', rol: 'solicitante', departamento: '' });
      setShowForm(false);
      loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Error al crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof UserCreate>(k: K, v: UserCreate[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  return (
    <motion.div {...panelAnim}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Usuarios</h1>
        <button
          onClick={() => { setShowForm(s => !s); setError(''); setSuccess(''); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--orange)', boxShadow: '0 4px 14px rgba(235,102,0,0.25)' }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {success && (
        <p className="mb-4 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(79,122,91,0.1)', color: 'var(--green-muted)', border: '1px solid rgba(79,122,91,0.2)' }}>
          {success}
        </p>
      )}

      {showForm && (
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 mb-6 max-w-xl"
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>Nuevo usuario</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Nombre</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Contraseña</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Rol</label>
                <select value={form.rol} onChange={e => set('rol', e.target.value as UserRole)} className={inputClass} style={{ color: 'var(--navy)' }}>
                  <option value="solicitante">Solicitante</option>
                  <option value="agente_soporte">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Departamento</label>
              <input value={form.departamento} onChange={e => set('departamento', e.target.value)} className={inputClass} style={{ color: 'var(--navy)' }} />
            </div>
            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(235,102,0,0.08)', color: 'var(--orange)', border: '1px solid rgba(235,102,0,0.2)' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--orange)' }}
            >
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>
        </motion.div>
      )}

      <div className="glass overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(0,18,43,0.03)', borderBottom: '1px solid rgba(0,18,43,0.06)' }}>
              <tr>
                {['Nombre', 'Email', 'Rol', 'Departamento'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray-neutral)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--gray-neutral)' }}>Sin usuarios.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,18,43,0.05)' }}>
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--navy)' }}>{u.nombre}</td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--gray-neutral)' }}>{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium badge-${u.rol === 'admin' ? 'en_progreso' : u.rol === 'agente_soporte' ? 'resuelto' : 'cerrado'}`}>
                      {ROLE_LABELS[u.rol]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--gray-neutral)' }}>{u.departamento ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
