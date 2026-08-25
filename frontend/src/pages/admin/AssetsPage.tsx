import { useState, useEffect, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import type { Asset, AssetEstado } from '../../types';

const ESTADO_LABELS: Record<AssetEstado, string> = {
  activo: 'Activo',
  en_reparacion: 'En reparación',
  dado_de_baja: 'Dado de baja',
};

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30';

interface AssetCreate {
  nombre: string;
  tipo: string;
  numero_serie: string;
  ubicacion: string;
  estado: AssetEstado;
}

const emptyForm: AssetCreate = {
  nombre: '', tipo: '', numero_serie: '', ubicacion: '', estado: 'activo',
};

export default function AssetsPage() {
  const prefersReduced = useReducedMotion();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AssetCreate>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Asset[]>('/assets')
      .then(r => setAssets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/assets', {
        ...form,
        ubicacion: form.ubicacion || undefined,
      });
      setSuccess(`Activo "${form.nombre}" dado de alta.`);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Error al crear el activo.');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof AssetCreate>(k: K, v: AssetCreate[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  return (
    <motion.div {...panelAnim}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Activos</h1>
        <button
          onClick={() => { setShowForm(s => !s); setError(''); setSuccess(''); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--orange)', boxShadow: '0 4px 14px rgba(235,102,0,0.25)' }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo activo'}
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
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>Nuevo activo</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Nombre</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Tipo</label>
                <input value={form.tipo} onChange={e => set('tipo', e.target.value)} required placeholder="PC, Monitor, Impresora…" className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>N° de serie</label>
                <input value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} required className={inputClass} style={{ color: 'var(--navy)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Estado</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value as AssetEstado)} className={inputClass} style={{ color: 'var(--navy)' }}>
                  <option value="activo">Activo</option>
                  <option value="en_reparacion">En reparación</option>
                  <option value="dado_de_baja">Dado de baja</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>Ubicación</label>
              <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Oficina, planta, sucursal…" className={inputClass} style={{ color: 'var(--navy)' }} />
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
              {saving ? 'Creando...' : 'Dar de alta'}
            </button>
          </form>
        </motion.div>
      )}

      <div className="glass overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(0,18,43,0.03)', borderBottom: '1px solid rgba(0,18,43,0.06)' }}>
                <tr>
                  {['Nombre', 'Tipo', 'N° Serie', 'Ubicación', 'Estado'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray-neutral)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--gray-neutral)' }}>Sin activos registrados.</td></tr>
                )}
                {assets.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,18,43,0.05)' }}>
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--navy)' }}>{a.nombre}</td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--gray-neutral)' }}>{a.tipo}</td>
                    <td className="px-5 py-3.5 mono text-xs" style={{ color: 'var(--gray-neutral)' }}>{a.numero_serie}</td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--gray-neutral)' }}>{a.ubicacion ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: a.estado === 'activo' ? 'rgba(79,122,91,0.12)' : a.estado === 'en_reparacion' ? 'rgba(235,102,0,0.10)' : 'rgba(139,132,120,0.12)',
                          color: a.estado === 'activo' ? 'var(--green-muted)' : a.estado === 'en_reparacion' ? 'var(--orange)' : 'var(--gray-neutral)',
                        }}
                      >
                        {ESTADO_LABELS[a.estado]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
