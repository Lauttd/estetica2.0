import { createContext, useContext } from 'react';
import type { AdminIdentity } from '@/types/auth';

export interface AuthContextValue {
  admin: AdminIdentity | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  cambiarPassword: (actual: string, nueva: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth tiene que usarse dentro de AuthProvider.');
  return value;
}
