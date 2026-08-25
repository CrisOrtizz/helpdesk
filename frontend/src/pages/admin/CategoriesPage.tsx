import { useState, useEffect, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import type { Category, TicketPrioridad } from '../../types';

const PRIORIDAD_LABELS: Record<TicketPrioridad, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30';

export default function CategoriesPage() {
  const prefersReduced = useReducedMotion();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [prioridad, setPrioridad] = useState<string>('media');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Category[]>('/categories')
      .then(r => setCategories(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/categories', { nombre: nombre.trim(), prioridad_sugerida: prioridad });
      setSuccess(`Categoría "${nombre.trim()}" creada.`);
      setNombre('');
      setPrioridad('media');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Error al crear la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  return (
    <motion.div {...panelAnim} className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>Categorías</h1>

      {/* Form */}
      <div className="glass p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>Nueva categoría</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre de la categoría"
              required
              className={inputClass}
              style={{ color: 'var(--navy)' }}
            />
            <select
              value={prioridad}
              onChange={e => setPrioridad(e.target.value)}
              className={inputClass}
              style={{ color: 'var(--navy)', maxWidth: '160px' }}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap disabled:opacity-50"
              style={{ background: 'var(--orange)', flexShrink: 0 }}
            >
              {saving ? '...' : 'Crear'}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--gray-neutral)' }}>
            Prioridad sugerida: se aplica automáticamente a los tickets de esta categoría.
          </p>
        </form>
        {error && (
          <p className="mt-3 text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(235,102,0,0.08)', color: 'var(--orange)', border: '1px solid rgba(235,102,0,0.2)' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(79,122,91,0.1)', color: 'var(--green-muted)', border: '1px solid rgba(79,122,91,0.2)' }}>
            {success}
          </p>
        )}
      </div>

      {/* List */}
      <div className="glass overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="px-5 py-10 text-sm" style={{ color: 'var(--gray-neutral)' }}>Sin categorías.</p>
        ) : (
          <ul>
            {categories.map((c, i) => (
              <li
                key={c.id}
                className="px-5 py-3.5 flex items-center justify-between text-sm"
                style={{
                  borderBottom: i < categories.length - 1 ? '1px solid rgba(0,18,43,0.06)' : 'none',
                  color: 'var(--navy)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--orange)' }} />
                  {c.nombre}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium prio-${c.prioridad_sugerida}`}>
                  {PRIORIDAD_LABELS[c.prioridad_sugerida]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
