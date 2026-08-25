import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { TicketEstado, TicketPrioridad, TicketListResponse } from '../types';

export interface TicketFilters {
  estados?: TicketEstado[];
  prioridad?: TicketPrioridad;
  categoria_id?: string;
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery<TicketListResponse>({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.estados && filters.estados.length > 0) {
        filters.estados.forEach(e => params.append('estado', e));
      }
      if (filters.prioridad) params.set('prioridad', filters.prioridad);
      if (filters.categoria_id) params.set('categoria_id', filters.categoria_id);
      const { data } = await api.get<TicketListResponse>(`/tickets?${params}`);
      return data;
    },
    refetchInterval: 15_000,
  });
}
