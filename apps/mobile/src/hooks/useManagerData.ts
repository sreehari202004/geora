import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/services/api/client';
import {
  AppNotification,
  Employee,
  ManagedTask,
  ManagerDashboard,
  ManagerMapPoint,
  PendingProof,
  TimelineEvent
} from '@/types/domain';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await apiClient.get<Employee[]>('/users/employees');
      return data;
    }
  });
}

export function useManagedTasks() {
  return useQuery({
    queryKey: ['managed-tasks'],
    queryFn: async () => {
      const { data } = await apiClient.get<ManagedTask[]>('/tasks/managed');
      return data;
    }
  });
}

export function usePendingProofs() {
  return useQuery({
    queryKey: ['pending-proofs'],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingProof[]>('/work-proofs/pending-review');
      return data;
    }
  });
}

export function useReviewedProofs() {
  return useQuery({
    queryKey: ['reviewed-proofs'],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingProof[]>('/work-proofs/reviewed');
      return data;
    }
  });
}

export function useManagerDashboard() {
  return useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<ManagerDashboard>('/dashboard/manager');
      return data;
    }
  });
}

export function useManagerMapPoints() {
  return useQuery({
    queryKey: ['manager-map-points'],
    queryFn: async () => {
      const { data } = await apiClient.get<ManagerMapPoint[]>('/dashboard/manager/map');
      return data;
    }
  });
}

export function useEmployeeTimeline() {
  return useQuery({
    queryKey: ['employee-timeline'],
    queryFn: async () => {
      const { data } = await apiClient.get<TimelineEvent[]>('/dashboard/employee/timeline');
      return data;
    }
  });
}

export function useEmployeeNotifications() {
  return useQuery({
    queryKey: ['employee-notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<AppNotification[]>('/dashboard/employee/notifications');
      return data;
    }
  });
}
