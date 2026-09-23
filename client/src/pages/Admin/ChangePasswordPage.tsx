import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { PATHS } from '@/routes/paths';

export function ChangePasswordPage() {
  const { cambiarPassword } = useAuth();
  const navigate = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setGuardando(true);
    try { await cambiarPassword(actual, nueva); navigate(`${PATHS.admin}/agenda`, { replace: true }); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'No pudimos cambiar la contraseña.'); }
    finally { setGuardando(false); }
  }
  return <main className="grid min-h-dvh place-items-center bg-cream px-4"><form onSubmit={submit} className="w-full max-w-md rounded-card bg-ivory p-8 shadow-card"><h1 className="mb-2 text-3xl">Elegí una contraseña nueva</h1><p className="mb-6 text-sm text-ink-soft">Por seguridad, cambiá la contraseña provisoria antes de usar el panel.</p>{error && <p role="alert" className="mb-4 rounded-soft bg-beige p-3 text-sm">{error}</p>}<label className="mb-4 block text-sm">Contraseña actual<input required type="password" value={actual} onChange={(e) => setActual(e.target.value)} className="mt-1 w-full rounded-soft border border-beige px-3 py-2.5" /></label><label className="mb-6 block text-sm">Contraseña nueva<input required minLength={12} type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} className="mt-1 w-full rounded-soft border border-beige px-3 py-2.5" /></label><button disabled={guardando} className="w-full rounded-soft bg-forest px-5 py-3 text-ivory disabled:opacity-60">{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button></form></main>;
}
