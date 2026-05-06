export type UserRole = 'customer' | 'owner' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  created_at?: string;
}
