import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../lib/api';
import { useTicket } from '../hooks/useTicket';
import { useAuthStore } from '../stores/authStore';
import SlaRingBadge from '../components/SlaRingBadge';
import type { Comment, TicketEstado, User } from '../types';

// State machine — mirrors backend _VALID_TRANSITIONS exactly
const VALID_TRANSITIONS: Record<TicketEstado, TicketEstado[]> = {
  abierto:     ['en_progreso'],
  en_progreso: ['resuelto'],
  resuelto:    ['cerrado', 'en_progreso'],
  cerrado:     [],
};

function transitionLabel(from: TicketEstado, to: TicketEstado): string {
  if (from === 'resuelto' && to === 'en_progreso') return 'Reabrir';
  const labels: Record<TicketEstado, string> = {
    abierto: 'Marcar abierto', en_progreso: 'Iniciar', resuelto: 'Resolver', cerrado: 'Cerrar ticket',
  };
  return labels[to];
}

const ESTADO_LABELS: Record<TicketEstado, string> = {
  abierto: 'Abierto', en_progreso: 'En progreso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};

function CommentBubble({ comment, currentUserId, animate }: { comment: Comment; currentUserId: string; animate: boolean }) {
  const isOwn = comment.autor_id === currentUserId;
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring' as const, damping: 20, stiffness: 300 }}
      className={`rounded-xl px-4 py-3 text-sm ${
        comment.es_interno
          ? 'border'
          : ''
      }`}
      style={
        comment.es_interno
          ? { background: 'rgba(235,102,0,0.06)', borderColor: 'rgba(235,102,0,0.18)' }
          : { background: 'rgba(0,18,43,0.04)' }
      }
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
          {isOwn ? 'Tú' : comment.autor_id.slice(0, 8)}
          {comment.es_interno && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'rgba(235,102,0,0.12)', color: 'var(--orange)' }}
            >
              Interno
            </span>
          )}
        </span>
        <span className="mono text-xs" style={{ color: 'var(--gray-neutral)' }}>
          {new Date(comment.created_at).toLocaleString('es')}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--navy)' }}>
        {comment.contenido}
      </p>
    </motion.div>
  );
}

// ---- Page ----
export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.accessToken);
  const prefersReduced = useReducedMotion();

  const { data: ticket, isLoading, isError } = useTicket(id!);

  // WebSocket
  useEffect(() => {
    if (!id || !token) return;
    const wsBase = (import.meta.env.VITE_API_URL as string).replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/ws/tickets/${id}?token=${token}`);
    ws.onmessage = () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); };
    return () => { ws.close(); };
  }, [id, token, qc]);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prevCommentCount = useRef(0);

  const handleAddComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmitting(true);
    try {
      await api.post(`/tickets/${id}/comments`, { contenido: commentText.trim(), es_interno: isInternal });
      setCommentText('');
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    } catch {
      alert('Error al enviar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  // State change
  const handleChangeState = async (newState: TicketEstado) => {
    if (!id) return;
    try {
      await api.post(`/tickets/${id}/estado`, { estado: newState });
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    } catch {
      alert('Error al cambiar el estado.');
    }
  };

  // Assign agent (admin)
  const [agents, setAgents] = useState<Pick<User, 'id' | 'nombre'>[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  useEffect(() => {
    if (user?.rol === 'admin') {
      api.get<User[]>('/users?rol=agente_soporte')
        .then(r => { setAgents(r.data); setAgentsLoaded(true); })
        .catch(() => { setAgentsLoaded(true); });
    }
  }, [user?.rol]);

  const handleAssign = async (agenteId: string) => {
    if (!id || !agenteId) return;
    try {
      await api.post(`/tickets/${id}/assign`, { agente_id: agenteId });
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    } catch {
      alert('Error al asignar agente.');
    }
  };

  // Attachments
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!id) return;
    setUploading(true);
    try {
      const { data: presign } = await api.post<{ attachment_id: string; upload_url: string }>(
        `/tickets/${id}/attachments/presign-upload`,
        { nombre_archivo: file.name, mime_type: file.type || 'application/octet-stream' },
      );
      await fetch(presign.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      await api.post(`/tickets/${id}/attachments/${presign.attachment_id}/confirm`);
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    } catch {
      alert('Error al subir el archivo. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachmentId: string) => {
    if (!id) return;
    try {
      const { data } = await api.get<{ download_url: string }>(`/tickets/${id}/attachments/${attachmentId}/download-url`);
      window.open(data.download_url, '_blank');
    } catch {
      alert('Error al obtener el enlace de descarga.');
    }
  };

  const panelAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } };

  if (isLoading) return <p className="py-12 text-sm" style={{ color: 'var(--gray-neutral)' }}>Cargando...</p>;
  if (isError || !ticket) return <p className="py-12 text-sm" style={{ color: 'var(--orange)' }}>Ticket no encontrado.</p>;

  const canChangeState = user?.rol === 'admin' || (user?.rol === 'agente_soporte' && ticket.agente_id === user?.id);
  const transitions = VALID_TRANSITIONS[ticket.estado];
  const newComments = ticket.comentarios.length > prevCommentCount.current;
  prevCommentCount.current = ticket.comentarios.length;

  const glassInput =
    'w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white/70 border-white/80 focus:ring-orange/30 resize-none';

  return (
    <motion.div {...panelAnim} className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link
            to="/tickets"
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--gray-neutral)' }}
          >
            ← Volver a tickets
          </Link>
          <h1 className="mt-1 text-xl font-bold leading-tight" style={{ color: 'var(--navy)' }}>
            {ticket.titulo}
          </h1>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold badge-${ticket.estado}`}>
            {ESTADO_LABELS[ticket.estado]}
          </span>
          <SlaRingBadge
            createdAt={ticket.created_at}
            slaResolutionDueAt={ticket.sla_resolution_due_at}
            slaVencido={ticket.sla_vencido}
            size="md"
          />
        </div>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: description, comments, attachments */}
        <div className="md:col-span-2 space-y-5">
          {/* Description */}
          <div className="glass p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--gray-neutral)' }}>
              Descripción
            </h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--navy)' }}>
              {ticket.descripcion}
            </p>
          </div>

          {/* Comments */}
          <div className="glass p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--gray-neutral)' }}>
              Comentarios ({ticket.comentarios.length})
            </h2>
            <div className="space-y-3 mb-4">
              {ticket.comentarios.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--gray-neutral)' }}>Sin comentarios aún.</p>
              )}
              <AnimatePresence initial={false}>
                {ticket.comentarios.map((c, i) => (
                  <CommentBubble
                    key={c.id}
                    comment={c}
                    currentUserId={user?.id ?? ''}
                    animate={!prefersReduced && newComments && i === ticket.comentarios.length - 1}
                  />
                ))}
              </AnimatePresence>
            </div>

            {ticket.estado !== 'cerrado' && (
              <div style={{ borderTop: '1px solid rgba(0,18,43,0.06)', paddingTop: 16 }}>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={3}
                  className={glassInput}
                  style={{ color: 'var(--navy)' }}
                />
                <div className="mt-2.5 flex items-center justify-between">
                  {user?.rol !== 'solicitante' ? (
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--navy)' }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Comentario interno
                    </label>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !commentText.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'var(--orange)' }}
                  >
                    {submitting ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray-neutral)' }}>
                Adjuntos ({ticket.adjuntos.length})
              </h2>
              {ticket.estado !== 'cerrado' && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50 bg-white/70 border-white/80 hover:bg-white"
                    style={{ color: 'var(--navy)' }}
                  >
                    {uploading ? 'Subiendo…' : '+ Subir archivo'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                  />
                </>
              )}
            </div>
            {ticket.adjuntos.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--gray-neutral)' }}>Sin adjuntos.</p>
            ) : (
              <ul className="space-y-2">
                {ticket.adjuntos.map(a => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="truncate" style={{ color: 'var(--navy)' }}>{a.nombre_archivo ?? 'Archivo'}</span>
                    <button
                      onClick={() => handleDownload(a.id)}
                      className="text-xs font-semibold ml-3 flex-shrink-0 transition-colors"
                      style={{ color: 'var(--orange)' }}
                    >
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: meta + actions */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="glass p-5 space-y-4">
            {[
              { label: 'Prioridad', value: ticket.prioridad, className: `prio-${ticket.prioridad} font-medium capitalize` },
              { label: 'Agente asignado', value: ticket.agente_id ? `${ticket.agente_id.slice(0, 8)}…` : 'Sin asignar' },
              { label: 'Solicitante', value: `${ticket.solicitante_id.slice(0, 8)}…` },
            ].map(({ label, value, className }) => (
              <div key={label}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--gray-neutral)' }}>{label}</p>
                <p className={`text-sm ${className ?? ''}`} style={{ color: className ? undefined : 'var(--navy)' }}>{value}</p>
              </div>
            ))}
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray-neutral)' }}>Creado</p>
              <p className="mono text-xs" style={{ color: 'var(--navy)' }}>
                {new Date(ticket.created_at).toLocaleString('es')}
              </p>
            </div>
            {ticket.resolved_at && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--gray-neutral)' }}>Resuelto</p>
                <p className="mono text-xs" style={{ color: 'var(--navy)' }}>
                  {new Date(ticket.resolved_at).toLocaleString('es')}
                </p>
              </div>
            )}
          </div>

          {/* State transitions */}
          {canChangeState && transitions.length > 0 && (
            <div className="glass p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--gray-neutral)' }}>
                Cambiar estado
              </p>
              <div className="flex flex-col gap-2">
                {transitions.map(t => (
                  <button
                    key={t}
                    onClick={() => handleChangeState(t)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border transition-all bg-white/70 border-white/80 hover:bg-white font-medium"
                    style={{ color: 'var(--navy)' }}
                  >
                    {transitionLabel(ticket.estado, t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assign agent */}
          {user?.rol === 'admin' && (
            <div className="glass p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--gray-neutral)' }}>
                Asignar agente
              </p>
              <select
                defaultValue=""
                onChange={e => { if (e.target.value) handleAssign(e.target.value); }}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange/30 bg-white/70 border-white/80"
                style={{ color: 'var(--navy)' }}
              >
                <option value="">
                  {!agentsLoaded ? 'Cargando agentes…' : agents.length === 0 ? 'Sin agentes disponibles' : 'Seleccionar agente…'}
                </option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
