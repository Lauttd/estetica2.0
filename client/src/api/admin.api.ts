import { apiRequest, apiRequestWithMeta } from '@/api/client';
import { buildQuery } from '@/api/query-string';
import type { AdminBooking, AdminUser, CategoryAdmin, ServiceAdmin, BookingStatus } from '@/types/admin';
import type { PaginationMeta } from '@/types/api';

interface ListResult<T> {
  items: T[];
  pagination: PaginationMeta | undefined;
}

async function list<T>(path: string, query: Record<string, string | number | boolean | undefined>): Promise<ListResult<T>> {
  const result = await apiRequestWithMeta<T[]>(`${path}${buildQuery(query)}`, { auth: true });
  return { items: result.data, pagination: result.meta?.pagination };
}

export function fetchAdminCategories(): Promise<CategoryAdmin[]> {
  return apiRequest<CategoryAdmin[]>('/admin/categories', { auth: true });
}

export function fetchAdminServices(filters: { q?: string; active?: boolean; page?: number } = {}): Promise<ListResult<ServiceAdmin>> {
  return list<ServiceAdmin>('/admin/services', { ...filters, perPage: 50 });
}

export function updateServicePrice(id: string, priceCents: number | null): Promise<ServiceAdmin> {
  return apiRequest<ServiceAdmin>(`/admin/services/${id}/price`, {
    method: 'PATCH',
    auth: true,
    body: { priceCents },
  });
}

export function fetchAdminBookings(date?: string): Promise<ListResult<AdminBooking>> {
  return list<AdminBooking>('/admin/bookings', { date, page: 1, perPage: 100 });
}

export function updateBookingStatus(id: string, status: BookingStatus): Promise<AdminBooking> {
  return apiRequest<AdminBooking>(`/admin/bookings/${id}/status`, {
    method: 'PATCH',
    auth: true,
    body: { status },
  });
}

export function fetchAdminSettings() {
  return apiRequest<Array<{ key: string; value: string; updatedAt: string }>>('/admin/settings', { auth: true });
}

export function updateAdminSettings(settings: Record<string, string>) {
  return apiRequest<Array<{ key: string; value: string; updatedAt: string }>>('/admin/settings', {
    method: 'PATCH',
    auth: true,
    body: { values: settings },
  });
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>('/admin/users', { auth: true });
}
