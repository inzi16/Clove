export type CandidateStage = 'sourced' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface ScoreBreakdown {
  semantic: number
  skills: number
  experience: number
  location: number
}

export interface Candidate {
  id: string
  application_id?: string
  name: string
  email: string
  headline: string
  location: string
  experience_years: number
  skills: string[]
  stage: CandidateStage
  match_score: number
  score_breakdown: ScoreBreakdown
  job_id: string
  job_title: string
  applied_at: string
  avatar_color?: string
  summary?: string
  match_reasons?: string[]
  highlights?: string[]
}

export interface Job {
  id: string
  title: string
  department: string
  location: string
  employment_type: string
  status: 'active' | 'draft' | 'closed'
  candidate_count: number
  new_candidates: number
  hiring_manager: string
  created_at: string
  target_hires: number
  description?: string
  skills?: string[]
  pipeline_health?: 'strong' | 'attention' | 'new'
}

export interface Interview {
  id: string
  candidate_id: string
  job_id?: string
  candidate_name: string
  job_title: string
  starts_at: string
  ends_at: string
  type: string
  interviewer_names: string[]
  provider: 'google' | 'outlook' | 'calendly'
  meeting_url?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Integration {
  id: string
  name: string
  category: string
  description: string
  connected: boolean
  account?: string
  color: string
  initials: string
}

export interface Billing {
  plan: string
  status: string
  amount: number
  currency: string
  interval: string
  renewal_at: string | null
  seats_used: number
  seats_total: number
  usage: { label: string; used: number; limit: number | null }[]
}

export interface Activity {
  id: string
  actor: string
  action: string
  subject: string
  timestamp: string
  kind: 'candidate' | 'interview' | 'job' | 'team'
}

export interface Dashboard {
  metrics: {
    active_jobs: number
    total_candidates: number
    interviews_this_week: number
    average_match_score: number
  }
  pipeline: { stage: CandidateStage; count: number }[]
  recent_candidates: Candidate[]
  upcoming_interviews: Interview[]
  activity?: Activity[]
}

export interface SearchResponse {
  query: string
  total: number
  results: Candidate[]
}

export interface Collection<T> {
  items: T[]
  total: number
}

export interface ApiResult<T> {
  data: T
  source: 'live' | 'demo'
  error?: string
}
