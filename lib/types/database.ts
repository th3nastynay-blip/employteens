import type { VerificationStatus } from '@/lib/jobs/verify-url'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Omit<UserRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserRow, 'id' | 'created_at'>>
        Relationships: []
      }
      jobs: {
        Row: JobRow
        Insert: Omit<JobRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<JobRow, 'id' | 'created_at'>>
        Relationships: []
      }
      applications: {
        Row: ApplicationRow
        Insert: Omit<ApplicationRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ApplicationRow, 'id' | 'created_at'>>
        Relationships: []
      }
      job_matches: {
        Row: JobMatchRow
        Insert: Omit<JobMatchRow, 'id'>
        Update: Partial<Omit<JobMatchRow, 'id'>>
        Relationships: []
      }
      ingestion_logs: {
        Row: IngestionLogRow
        Insert: Omit<IngestionLogRow, 'id'>
        Update: Partial<Omit<IngestionLogRow, 'id'>>
        Relationships: []
      }
      analytics_events: {
        Row: AnalyticsEventRow
        Insert: Omit<AnalyticsEventRow, 'id' | 'created_at'>
        Update: Partial<Omit<AnalyticsEventRow, 'id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_feed: {
        Args: { p_user_id: string; p_section: string; p_limit: number }
        Returns: {
          job_id: string
          title: string
          company: string
          location: string
          apply_url: string
          teen_friendly_score: number
          hiring_speed_score: number
          schedule_flexibility_score: number
          match_score: number
          match_explanation: string
        }[]
      }
    }
    Enums: Record<string, never>
  }
}

// Row interfaces: [key: string]: unknown is required so that TypeScript's structural
// typing considers these compatible with Record<string, unknown> (needed by
// postgrest-js v2+ GenericTable constraint). Every named property must be assignable
// to unknown — which is vacuously true since unknown is the top type.
export interface UserRow {
  [key: string]: unknown
  id: string
  name: string
  age: number
  state: string
  zip_code: string
  transportation: string
  school_grade: string
  school_end_time: string
  availability: Json
  skills: Json
  interests: Json
  resume_url: string | null
  onboarding_completed?: boolean
  created_at: string
  updated_at?: string
}

export interface JobRow {
  [key: string]: unknown
  id: string
  title: string
  company: string
  location: string
  state: string
  zip_code: string
  apply_url: string
  source: string
  min_age: number
  experience_required: string
  teen_friendly_score: number
  schedule_flexibility_score: number
  hiring_speed_score: number
  scam_risk_score: number
  commute_estimate: number
  physical_demand_level: number
  customer_interaction_level: number
  description?: string | null
  tags?: string[] | null
  salary_min?: number | null
  salary_max?: number | null
  job_type?: string | null
  status: 'active' | 'inactive' | 'pending' | 'flagged'
  last_verified_at: string | null
  // Verification metadata — added by supabase/migrations/add_verification_fields.sql
  verified_at: string | null
  last_checked_at: string | null
  http_status: number | null
  is_active: boolean
  verification_status: VerificationStatus | 'expired'
  posted_at?: string | null
  embedding: number[] | null
  created_at: string
  updated_at?: string
}

export interface ApplicationRow {
  [key: string]: unknown
  id: string
  user_id: string
  job_id: string
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected'
  notes?: string | null
  created_at: string
  updated_at?: string
}

export interface JobMatchRow {
  [key: string]: unknown
  id: string
  user_id: string
  job_id: string
  match_score: number
  match_explanation: string | null
  feed_section: string
  generated_at: string
}

export interface IngestionLogRow {
  [key: string]: unknown
  id: string
  source: string
  jobs_fetched: number
  jobs_inserted: number
  jobs_rejected: number
  jobs_deduplicated: number
  error_message?: string | null
  started_at: string
  completed_at?: string | null
  // Added by supabase/migrations/add_ingestion_log_details.sql — holds the full
  // per-run IngestStats breakdown (see lib/jobs/ingest-pipeline.ts) so Phase 6
  // reporting can sum granular counts (verified/rejected_mismatch/etc) historically,
  // not just the four aggregate columns above.
  details?: Json | null
}

export interface AnalyticsEventRow {
  [key: string]: unknown
  id: string
  user_id: string | null
  event_type: string
  job_id: string | null
  metadata: Json
  created_at: string
}

// App-level types (no index signature needed — not used as Supabase Row types)
export interface UserProfile {
  id: string
  name: string
  age: number | null
  state: string
  zip_code: string
  transportation: string
  school_grade: string
  school_end_time: string
  availability: AvailabilitySchedule
  skills: string[]
  interests: string[]
  experience_required?: string
  resume_url: string | null
  onboarding_completed?: boolean
  created_at: string
}

export interface AvailabilitySchedule {
  [key: string]: boolean
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export interface TimeSlot {
  start: string
  end: string
}

export interface JobMatch extends JobRow {
  match_score: number
  match_explanation: string
  distance_miles?: number
}
