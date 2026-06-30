export interface RawJob {
  title: string
  company: string
  location: string
  state: string
  zip_code: string
  apply_url: string
  source: string
  description?: string
  min_age?: number
  salary_min?: number
  salary_max?: number
  posted_at?: string
}

export interface EnrichedJob extends RawJob {
  teen_friendly_score: number
  schedule_flexibility_score: number
  hiring_speed_score: number
  scam_risk_score: number
  commute_estimate: number
  physical_demand_level: number
  customer_interaction_level: number
  experience_required: string
  tags: string[]
}

export interface IngestionStats {
  source: string
  jobs_fetched: number
  jobs_inserted: number
  jobs_rejected: number
  jobs_deduplicated: number
  error?: string
}
