import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { PATHS } from '@/routes/paths';
import { Logo } from '@/components/ui/Logo';

export function AdminLoginPage() {
  const { admin, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (admin !== null) {
    return <Navigate to={`${PATHS.admin}/agenda`} replace />;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? `${PATHS.admin}/agenda`, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No pudimos iniciar sesión. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-card bg-ivory p-8 shadow-card">
        <div className="mb-8 text-center"><Logo /><h1 className="mt-6 text-3xl">Ingresar al panel</h1><p className="mt-2 text-sm text-ink-soft">Administración de KAYA KALPA</p></div>
        {error && <p role="alert" className="mb-4 rounded-soft bg-beige p-3 text-sm text-deep">{error}</p>}
        <label className="mb-4 block text-sm font-medium">Correo<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-soft border border-beige bg-ivory px-3 py-2.5" /></label>
        <label className="mb-6 block text-sm font-medium">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-soft border border-beige bg-ivory px-3 py-2.5" /></label>
        <button disabled={enviando} className="w-full rounded-soft bg-forest px-5 py-3 font-medium text-ivory hover:bg-forest-dark disabled:opacity-60">{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
