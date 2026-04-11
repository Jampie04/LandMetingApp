// ============================================================
// Database types — derived directly from the migration files.
// Column names match exactly what is in the Supabase schema.
// ============================================================

export type UserRole = "landmeter" | "admin";
export type ProjectStatus = "new" | "in_progress" | "completed";

// profiles table
export interface Profile {
  id: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// projects table
export interface Project {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  district: string | null;
  status: ProjectStatus;
  assigned_landmeter_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Pricing fields (added in migration 20240002)
  estimated_price: number | null;
  currency: string;
  estimated_duration_value: number | null;
  estimated_duration_unit: "hours" | "days" | null;
  pricing_notes: string | null;
  priced_at: string | null;
  priced_by_landmeter_id: string | null;
}

// projects joined with profiles via assigned_landmeter_id FK
// also joins priced_by profile for display purposes
export interface ProjectWithProfile extends Project {
  profiles: Pick<Profile, "full_name" | "phone_number"> | null;
  priced_by_profile: Pick<Profile, "full_name"> | null;
}

// project_documents table
export interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  download_url?: string | null;
}

// project_status_history table
export interface ProjectStatusHistory {
  id: string;
  project_id: string;
  changed_by: string | null;
  from_status: ProjectStatus | null;
  to_status: ProjectStatus;
  notes: string | null;
  changed_at: string;
  profiles: Pick<Profile, "full_name"> | null;
}

// Composite returned by useProjectDetail
export interface ProjectDetail {
  project: ProjectWithProfile;
  documents: ProjectDocument[];
}
