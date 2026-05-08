export interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  image_url?: string;
  address?: string;
  cnic_front_image?: string;
  cnic_back_image?: string;
  opening_time?: string;
  closing_time?: string;
  approved?: boolean;
  approved_at?: string;
  approved_by?: string;
  created_by?: string;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  created_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  start_time: string;
  status: AppointmentStatus;
  created_at: string;
  business?: Business;
  service?: Service;
  customer_profile?: { full_name: string; phone?: string };
}

export interface BusinessUpdateRequest {
  id: string;
  business_id: string;
  requested_by: string;
  proposed_name: string;
  proposed_category: string;
  proposed_bio?: string;
  proposed_address?: string;
  proposed_cnic_front_image?: string;
  proposed_cnic_back_image?: string;
  proposed_opening_time?: string;
  proposed_closing_time?: string;
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string;
  actor_role?: 'customer' | 'owner' | 'admin';
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
