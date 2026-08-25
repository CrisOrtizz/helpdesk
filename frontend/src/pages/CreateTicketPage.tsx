import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Monitor, Printer, Wifi, Package, Laptop, Phone,
  HelpCircle, Server, Mail, Shield, Database,
} from 'lucide-react';
import api from '../lib/api';
import type { Category } from '../types';

// Map category name keywords → icon
function categoryIcon(nombre: string) {
  const n = nombre.toLowerCase();
  if (/impresora|printer|print/.test(n)) return Printer;
  if (/red|wifi|internet|network|conectividad/.test(n)) return Wifi;
  if (/tel[eé]fono|phone|m[oó]vil|celular/.test(n)) return Phone;
  if (/laptop|port[aá]til|notebook/.test(n)) return Laptop;
  if (/servidor|server/.test(n)) return Server;
  if (/correo|email|mail/.test(n)) return Mail;
  if (/seguridad|security|antivirus/.test(n)) return Shield;
  if (/base de datos|database|db/.test(n)) return Database;
  if (/software|aplicaci[oó]n|app|sistema/.test(n)) return Laptop;
  if (/hardware|equipo|pc|computadora|monitor/.test(n)) return Monitor;
  if (/activo|inventario|stock/.test(n)) return Package;
  return HelpCircle;
}

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all duration-150 bg-white/70 border-white/80 focus:ring-orange/30';

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCat) { setError('Selecciona una categoría'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tickets', {
        titulo,
        descripcion: descripcion || titulo,
        categoria_id: selectedCat.id,
        // prioridad omitida — backend la toma de prioridad_sugerida de la categoría
      });
      navigate(`/tickets/${data.id}`, { replace: true });
    } catch {
      setError('Error al crear el ticket. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  return (
    <div>
      <motion.h1
        className="text-2xl font-bold mb-2"
        style={{ color: 'var(--navy)' }}
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Nuevo ticket
      </motion.h1>
      <p className="text-sm mb-6" style={{ color: 'var(--gray-neutral)' }}>
        ¿Qué tipo de problema tenés?
      </p>

      <motion.div {...panelAnim} className="glass p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Category tiles */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--navy)' }}>
              Categoría
            </label>
            {categories.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando categorías...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map(cat => {
                  const Icon = categoryIcon(cat.nombre);
                  const isSelected = selectedCat?.id === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCat(cat); setError(''); }}
                      whileHover={prefersReduced ? {} : { scale: 1.02, y: -2 }}
                      whileTap={prefersReduced ? {} : { scale: 0.98 }}
                      transition={{ type: 'spring' as const, damping: 20, stiffness: 350 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer"
                      style={{
                        background: isSelected ? 'rgba(235,102,0,0.08)' : 'rgba(255,255,255,0.6)',
                        borderColor: isSelected ? 'var(--orange)' : 'rgba(255,255,255,0.8)',
                        color: isSelected ? 'var(--orange)' : 'var(--navy)',
                      }}
                    >
                      <Icon size={24} strokeWidth={1.5} />
                      <span className="text-xs font-medium leading-tight">{cat.nombre}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--navy)' }}>
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              required
              placeholder="Describe el problema brevemente"
              className={inputClass}
              style={{ color: 'var(--navy)' }}
            />
          </div>

          {/* Collapsible description */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(s => !s)}
              className="text-sm font-medium flex items-center gap-1 transition-colors duration-150"
              style={{ color: showDetails ? 'var(--orange)' : 'var(--gray-neutral)' }}
            >
              <span>{showDetails ? '▾' : '▸'}</span>
              {showDetails ? 'Ocultar detalles' : '+ Agregar detalles (opcional)'}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  key="details"
                  initial={prefersReduced ? {} : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={prefersReduced ? {} : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="mt-3">
                    <textarea
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      rows={4}
                      placeholder="Proporciona más detalles sobre el problema..."
                      className={`${inputClass} resize-none`}
                      style={{ color: 'var(--navy)' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(235,102,0,0.08)', color: 'var(--orange)', border: '1px solid rgba(235,102,0,0.2)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !selectedCat || !titulo.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-40"
              style={{ background: 'var(--orange)', boxShadow: selectedCat && titulo.trim() ? '0 4px 14px rgba(235,102,0,0.25)' : 'none' }}
            >
              {loading ? 'Creando...' : 'Crear ticket'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 bg-white/70 border border-white/80 hover:bg-white"
              style={{ color: 'var(--navy)' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
