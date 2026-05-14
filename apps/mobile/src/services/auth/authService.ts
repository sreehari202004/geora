import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/store/authStore';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  };
};

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  useAuthStore.getState().setSession(data);
  return data;
}

export function logout() {
  useAuthStore.getState().clearSession();
}

