import axios from 'axios';
import Constants from 'expo-constants';

import { useAuthStore } from '@/store/authStore';

function getDefaultBaseURL() {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];

  if (host) {
    return `http://${host}:4000/api`;
  }

  return 'http://localhost:4000/api';
}

export const apiBaseURL = process.env.EXPO_PUBLIC_API_URL ?? getDefaultBaseURL();

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 120000
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise = refreshPromise ?? refreshAccessToken();
    const token = await refreshPromise;
    refreshPromise = null;

    if (!token) {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${token}`;
    return apiClient(originalRequest);
  }
);

async function refreshAccessToken() {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post(`${apiBaseURL}/auth/refresh`, { refreshToken });
    useAuthStore.getState().setSession(data);
    return data.accessToken as string;
  } catch {
    return null;
  }
}
