import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { TokenResponse, User } from '../types';

// ---------------------------------------------------------------------------
// Instancia principal — withCredentials envía la cookie httpOnly en cada
// petición sin que el código de la app tenga que recordarlo.
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Interceptor de REQUEST — adjunta el access token del store a cada petición.
// Si el store está vacío (página recién cargada antes de tryRestoreSession),
// el header queda sin Authorization y el backend devuelve 401.
// ---------------------------------------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Cola para serializar reintentos mientras el refresh está en curso.
// Si dos peticiones fallan simultáneamente con 401, solo se llama a
// /auth/refresh una vez; las demás esperan en la cola.
// ---------------------------------------------------------------------------
let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshQueue: QueueEntry[] = [];

function flushQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  );
  refreshQueue = [];
}

// ---------------------------------------------------------------------------
// Interceptor de RESPONSE — detecta 401, refresca el token silenciosamente
// y reintenta el request original. Invisible para el usuario.
// ---------------------------------------------------------------------------
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    // Solo procesar 401 que no sean ya un reintento y que tengan config
    if (error.response?.status !== 401 || original?._retry || !original) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Encolar el reintento para cuando el refresh termine
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Usamos axios base (sin interceptors) para evitar bucle infinito
      const { data } = await axios.post<TokenResponse>(
        `${import.meta.env.VITE_API_URL as string}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.access_token;

      // Actualizar store manteniendo el user ya cargado
      useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user!);

      flushQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ---------------------------------------------------------------------------
// tryRestoreSession — se llama UNA vez al montar la app.
// Usa axios base para no disparar el interceptor de 401 durante el restore.
// Si la cookie httpOnly está presente y es válida, restaura la sesión
// completamente (token + user) sin que el usuario vea el flujo de login.
// ---------------------------------------------------------------------------
export async function tryRestoreSession(): Promise<boolean> {
  try {
    const { data: tokenData } = await axios.post<TokenResponse>(
      `${import.meta.env.VITE_API_URL as string}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const { data: user } = await axios.get<User>(
      `${import.meta.env.VITE_API_URL as string}/users/me`,
      {
        withCredentials: true,
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    useAuthStore.getState().setAuth(tokenData.access_token, user);
    return true;
  } catch {
    return false;
  }
}

export default api;
