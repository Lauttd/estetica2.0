import { useQuery } from '@tanstack/react-query';
import { fetchAdminUsers } from '@/api/admin.api';

export function AdminUsersPage() {
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers });
  return <section><div className="mb-8"><p className="text-sm uppercase tracking-widest text-forest">Accesos</p><h1 className="text-4xl">Usuarios</h1></div>{users.isPending && <p>Cargando usuarios…</p>}{users.isError && <p role="alert">No pudimos cargar los usuarios.</p>}{users.data && <div className="overflow-x-auto rounded-card border border-beige bg-ivory shadow-card"><table className="w-full text-left text-sm"><thead className="border-b border-beige text-ink-soft"><tr><th className="p-4">Nombre</th><th className="p-4">Correo</th><th className="p-4">Rol</th><th className="p-4">Estado</th></tr></thead><tbody>{users.data.map((user) => <tr key={user.id} className="border-b border-beige last:border-0"><td className="p-4 font-medium">{user.name}</td><td className="p-4">{user.email}</td><td className="p-4">{user.role}</td><td className="p-4">{user.active ? 'Activo' : 'Inactivo'}</td></tr>)}</tbody></table></div>}</section>;
}
