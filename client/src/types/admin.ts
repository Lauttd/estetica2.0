import type { AdminRole } from './auth';

export interface CategoryAdmin {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  serviceCount: number;
  sortOrder: number;
  active: boolean;
}

export interface ServiceAdmin {
  id: string;
  name: string;
  shortDescription: string;
  priceCents: number | null;
  currency: string;
  durationMin: number | null;
  bookable: boolean;
  bookableOnline: boolean;
  needsReview: boolean;
  active: boolean;
  category: { id: string; name: string; active: boolean };
  updatedAt: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AdminBooking {
  id: string;
  code: string;
  status: BookingStatus;
  date: string;
  startTime: string;
  endTime: string;
  totalPriceCents: number;
  hasPriceOnRequest: boolean;
  notes: string | null;
  customer: { firstName: string; lastName: string; phone: string; email: string | null };
  professional: { name: string; color: string };
  services: Array<{ name: string; priceCents: number | null; durationMin: number | null }>;
  allowedTransitions: BookingStatus[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isSelf: boolean;
  canDeactivate: boolean;
  canActivate: boolean;
  canChangeRole: boolean;
  canResetPassword: boolean;
}
