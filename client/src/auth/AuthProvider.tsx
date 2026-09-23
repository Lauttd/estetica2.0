import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, ApiError, setTokenRefresher } from '@/api/client';
import { clearAccessToken, setAccessToken } from '@/api/auth-token';
import type { AdminIdentity, AuthSession } from '@/types/auth';
import { AuthContext } from './AuthContext';

function aplicarSesion(session: AuthSession): void {
  setAccessToken(session.accessToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [cargando, setCargando] = useState(true);

  const renovar = useCallback(async (): Promise<string | null> => {
    try {
      const session = await apiRequest<AuthSession>('/auth/refresh', { method: 'POST' });
      aplicarSesion(session);
      setAdmin(session.admin);
      return session.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        setAdmin(null);
        return null;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    setTokenRefresher(renovar);
    // El sitio público no tiene sesión: no se consulta refresh en cada visita.
    if (!window.location.pathname.startsWith('/admin')) {
      setCargando(false);
      return () => setTokenRefresher(null);
    }
    void renovar().finally(() => setCargando(false));
    return () => setTokenRefresher(null);
  }, [renovar]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    aplicarSesion(session);
    setAdmin(session.admin);
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearAccessToken();
      setAdmin(null);
    }
  }, []);

  const cambiarPassword = useCallback(async (actual: string, nueva: string) => {
    const session = await apiRequest<AuthSession>('/auth/change-password', {
      method: 'PATCH',
      auth: true,
      body: { currentPassword: actual, newPassword: nueva },
    });
    aplicarSesion(session);
    setAdmin(session.admin);
  }, []);

  const value = useMemo(
    () => ({ admin, cargando, iniciarSesion, cerrarSesion, cambiarPassword }),
    [admin, cargando, iniciarSesion, cerrarSesion, cambiarPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
