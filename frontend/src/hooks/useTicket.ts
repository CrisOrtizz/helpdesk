import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { TicketDetail } from '../types';

export function useTicket(id: string) {
  return useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data } = await api.get<TicketDetail>(`/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
