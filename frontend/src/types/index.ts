// Refleja exactamente los modelos del backend (app/schemas/user.py, app/models/ticket.py)
// Los tipos de enum usan los mismos valores string que los enums Python del backend.

export type UserRole = 'admin' | 'agente_soporte' | 'solicitante';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  departamento: string | null;
  created_at: string;
}

export type TicketEstado = 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
export type TicketPrioridad = 'baja' | 'media' | 'alta' | 'critica';

export interface Ticket {
  id: string;
  titulo: string;
  descripcion: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  categoria_id: string;
  solicitante_id: string;
  agente_id: string | null;
  activo_id: string | null;
  created_at: string;
  resolved_at: string | null;
  sla_response_due_at: string | null;
  sla_resolution_due_at: string | null;
  first_response_at: string | null;
  sla_breach_notified: boolean;
  // Solo presente en respuestas de listado (TicketListItem)
  sla_vencido?: boolean;
}

export interface Comment {
  id: string;
  ticket_id: string;
  autor_id: string;
  contenido: string;
  es_interno: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  nombre_archivo: string | null;
  mime_type: string | null;
  confirmado: boolean;
  subido_por: string;
  created_at: string;
}

export interface Category {
  id: string;
  nombre: string;
  prioridad_sugerida: TicketPrioridad;
}

export interface TicketDetail extends Ticket {
  sla_vencido: boolean;
  comentarios: Comment[];
  adjuntos: Attachment[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  offset: number;
  limit: number;
}

export type AssetEstado = 'activo' | 'en_reparacion' | 'dado_de_baja';

export interface Asset {
  id: string;
  nombre: string;
  tipo: string;
  numero_serie: string;
  ubicacion: string | null;
  asignado_a: string | null;
  estado: AssetEstado;
}
