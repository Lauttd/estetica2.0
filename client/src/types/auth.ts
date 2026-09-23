export type AdminRole = 'ADMIN' | 'STAFF';

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  mustChangePassword: boolean;
}

export interface AuthSession {
  admin: AdminIdentity;
  accessToken: string;
}
