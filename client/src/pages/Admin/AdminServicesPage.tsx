import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchAdminServices, updateServicePrice } from '@/api/admin.api';
import { formatCents, parsePesosToCents } from '@/utils/money';

function pesos(cents: number | null): string { return cents === null ? '' : String(cents / 100); }

export function AdminServicesPage() {
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();
  const services = useQuery({ queryKey: ['admin', 'services', q], queryFn: () => fetchAdminServices(q ? { q } : {}) });
  const mutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => updateServicePrice(id, parsePesosToCents(value)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
  return <section><div className="mb-8"><p className="text-sm uppercase tracking-widest text-forest">Catálogo</p><h1 className="text-4xl">Servicios</h1><p className="mt-2 text-ink-soft">Actualizá precios sin tocar los datos de los turnos ya tomados.</p></div><input aria-label="Buscar servicios" placeholder="Buscar por nombre…" value={q} onChange={(event) => setQ(event.target.value)} className="mb-5 w-full max-w-md rounded-soft border border-beige bg-ivory px-3 py-2.5" />{services.isPending && <p>Cargando servicios…</p>}{services.isError && <p role="alert">No pudimos cargar los servicios.</p>}{services.data && <div className="overflow-x-auto rounded-card border border-beige bg-ivory shadow-card"><table className="w-full text-left text-sm"><thead className="border-b border-beige text-ink-soft"><tr><th className="p-4">Servicio</th><th className="p-4">Categoría</th><th className="p-4">Precio</th><th className="p-4">Estado</th></tr></thead><tbody>{services.data.items.map((service) => <ServiceRow key={service.id} service={service} onSave={(value) => mutation.mutate({ id: service.id, value })} saving={mutation.isPending} />)}</tbody></table></div>}{mutation.error instanceof ApiError && <p role="alert" className="mt-3 text-sm">{mutation.error.message}</p>}</section>;
}

function ServiceRow({ service, onSave, saving }: { service: import('@/types/admin').ServiceAdmin; onSave: (value: string) => void; saving: boolean }) {
  const [value, setValue] = useState(pesos(service.priceCents));
  return <tr className="border-b border-beige last:border-0"><td className="p-4 font-medium text-deep">{service.name}{service.needsReview && <span className="ml-2 rounded-full bg-beige px-2 py-1 text-xs">A revisar</span>}</td><td className="p-4 text-ink-soft">{service.category.name}</td><td className="p-4"><div className="flex items-center gap-2"><span className="text-xs">$</span><input aria-label={`Precio de ${service.name}`} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} className="w-28 rounded-soft border border-beige px-2 py-1.5" /><button type="button" disabled={saving} onClick={() => onSave(value)} className="rounded-soft bg-forest px-3 py-1.5 text-xs text-ivory disabled:opacity-50">Guardar</button></div><p className="mt-1 text-xs text-ink-soft">{service.priceCents === null ? 'A consultar' : formatCents(service.priceCents, service.currency)}</p></td><td className="p-4">{service.active ? 'Activo' : 'Inactivo'}</td></tr>;
}
