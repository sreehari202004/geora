import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/services/api/client';
import { Task } from '@/types/domain';

export function useAssignedTasks() {
  return useQuery({
    queryKey: ['assigned-tasks'],
    queryFn: async () => {
      const { data } = await apiClient.get<Task[]>('/tasks/assigned');
      return data;
    }
  });
}

