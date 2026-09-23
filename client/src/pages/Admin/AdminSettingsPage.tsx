import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchAdminSettings, updateAdminSettings } from '@/api/admin.api';

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: fetchAdminSettings });
  const [values, setValues] = useState<Record<string, string>>({});
  const mutation = useMutation({ mutationFn: () => updateAdminSettings(values), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }) });
  if (settings.isPending) return <p>Cargando configuración…</p>;
  if (settings.isError || !settings.data) return <p role="alert">No pudimos cargar la configuración.</p>;
  return <section><div className="mb-8"><p className="text-sm uppercase tracking-widest text-forest">Sitio</p><h1 className="text-4xl">Configuración</h1><p className="mt-2 text-ink-soft">Estos datos se muestran en el sitio público.</p></div><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="max-w-2xl space-y-4 rounded-card border border-beige bg-ivory p-6 shadow-card">{settings.data.map((setting) => <label key={setting.key} className="block text-sm font-medium">{setting.key}<input defaultValue={setting.value} onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))} className="mt-1 w-full rounded-soft border border-beige px-3 py-2.5" /></label>)}{mutation.error instanceof ApiError && <p role="alert">{mutation.error.message}</p>}<button disabled={mutation.isPending} className="rounded-soft bg-forest px-5 py-3 text-ivory disabled:opacity-50">{mutation.isPending ? 'Guardando…' : 'Guardar cambios'}</button></form></section>;
}
