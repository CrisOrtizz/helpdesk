import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTickets, type TicketFilters } from '../hooks/useTickets';
import SlaRingBadge from '../components/SlaRingBadge';
import type { Ticket, TicketEstado, TicketPrioridad } from '../types';

const ESTADO_LABELS: Record<TicketEstado, string> = {
  abierto: 'Abierto', en_progreso: 'En progreso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};
const PRIORIDAD_LABELS: Record<TicketPrioridad, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

type Tab = 'pendientes' | 'completados' | 'todos';

const TABS: { id: Tab; label: string; estados: TicketEstado[] }[] = [
  { id: 'pendientes', label: 'Pendientes', estados: ['abierto', 'en_progreso'] },
  { id: 'completados', label: 'Completados', estados: ['resuelto', 'cerrado'] },
  { id: 'todos', label: 'Todos', estados: [] },
];

function EstadoBadge({ estado }: { estado: TicketEstado }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium badge-${estado}`}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.tr
      className="cursor-pointer"
      onClick={onClick}
      whileHover={prefersReduced ? {} : { backgroundColor: 'rgba(235,102,0,0.03)' }}
      transition={{ duration: 0.12 }}
      style={{ borderBottom: '1px solid rgba(0,18,43,0.06)' }}
    >
      <td className="px-5 py-3.5">
        <Link
          to={`/tickets/${ticket.id}`}
          className="font-medium text-sm hover:underline"
          style={{ color: 'var(--navy)' }}
          onClick={e => e.stopPropagation()}
        >
          {ticket.titulo}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <EstadoBadge estado={ticket.estado} />
      </td>
      <td className="px-5 py-3.5">
        <span className={`text-sm prio-${ticket.prioridad}`}>
          {PRIORIDAD_LABELS[ticket.prioridad]}
        </span>
      </td>
      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-neutral)' }}>
        {ticket.agente_id ? `${ticket.agente_id.slice(0, 8)}…` : '—'}
      </td>
      <td className="px-5 py-3.5">
        <SlaRingBadge
          createdAt={ticket.created_at}
          slaResolutionDueAt={ticket.sla_resolution_due_at}
          slaVencido={ticket.sla_vencido ?? false}
        />
      </td>
      <td className="px-5 py-3.5 mono text-xs" style={{ color: 'var(--gray-neutral)' }}>
        {new Date(ticket.created_at).toLocaleDateString('es')}
      </td>
    </motion.tr>
  );
}

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className="glass p-4 cursor-pointer"
      onClick={onClick}
      whileHover={prefersReduced ? {} : { scale: 1.01, y: -2 }}
      whileTap={prefersReduced ? {} : { scale: 0.99 }}
      transition={{ type: 'spring' as const, damping: 20, stiffness: 300 }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-medium text-sm leading-snug" style={{ color: 'var(--navy)' }}>
          {ticket.titulo}
        </p>
        <EstadoBadge estado={ticket.estado} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs prio-${ticket.prioridad}`}>{PRIORIDAD_LABELS[ticket.prioridad]}</span>
        <SlaRingBadge
          createdAt={ticket.created_at}
          slaResolutionDueAt={ticket.sla_resolution_due_at}
          slaVencido={ticket.sla_vencido ?? false}
        />
      </div>
    </motion.div>
  );
}

const selectClass =
  'border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange/30 bg-white/70 border-white/80';

export default function TicketsListPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<Tab>('pendientes');
  const [filters, setFilters] = useState<Omit<TicketFilters, 'estados'>>({});

  const tabDef = TABS.find(t => t.id === activeTab)!;
  const queryFilters: TicketFilters = { ...filters, estados: tabDef.estados };
  const { data, isLoading, isError } = useTickets(queryFilters);

  const containerAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  return (
    <motion.div {...containerAnim}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
          Tickets
          {data && (
            <span className="ml-2 text-base font-normal mono" style={{ color: 'var(--gray-neutral)' }}>
              ({data.total})
            </span>
          )}
        </h1>
        <Link
          to="/tickets/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-150"
          style={{ background: 'var(--orange)', boxShadow: '0 4px 14px rgba(235,102,0,0.25)' }}
        >
          + Nuevo ticket
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 glass p-1 w-fit rounded-2xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === tab.id ? 'var(--orange)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--navy)',
              opacity: activeTab === tab.id ? 1 : 0.6,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={filters.prioridad ?? ''}
          onChange={e => setFilters(f => ({ ...f, prioridad: (e.target.value as TicketPrioridad) || undefined }))}
          className={selectClass}
          style={{ color: 'var(--navy)' }}
        >
          <option value="">Todas las prioridades</option>
          {(['baja', 'media', 'alta', 'critica'] as TicketPrioridad[]).map(p => (
            <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm py-6" style={{ color: 'var(--gray-neutral)' }}>Cargando...</p>}
      {isError && <p className="text-sm py-6" style={{ color: 'var(--orange)' }}>Error al cargar tickets.</p>}

      {data && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(0,18,43,0.03)', borderBottom: '1px solid rgba(0,18,43,0.06)' }}>
                  <tr>
                    {['Título', 'Estado', 'Prioridad', 'Agente', 'SLA', 'Creado'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray-neutral)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--gray-neutral)' }}>
                        No hay tickets en esta vista.
                      </td>
                    </tr>
                  )}
                  {data.items.map(ticket => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {data.items.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: 'var(--gray-neutral)' }}>
                No hay tickets en esta vista.
              </p>
            )}
            {data.items.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TicketCard
                  ticket={ticket}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
