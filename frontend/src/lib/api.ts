import { demoBilling, demoCandidates, demoDashboard, demoIntegrations, demoInterviews, demoJobs } from '../data/demo'
import type { ApiResult, Billing, Candidate, Collection, Dashboard, Integration, Interview, Job, SearchResponse } from '../types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const USER_ID = import.meta.env.VITE_DEMO_USER_ID || 'demo-user'
const REQUEST_TIMEOUT = 3500

type RequestOptions<T> = {
  method?: string
  body?: unknown
  fallback: T
}

async function request<T>(path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': USER_ID,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    })
    if (!response.ok) throw await responseError(response)
    const data = await response.json() as T
    return { data, source: 'live' }
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? 'The API took too long to respond.'
      : error instanceof Error ? error.message : 'Could not reach the API.'
    return { data: options.fallback, source: 'demo', error: message }
  } finally {
    window.clearTimeout(timer)
  }
}

export class ApiRequestError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function responseError(response: Response) {
  let message = `Request failed (${response.status})`
  try {
    const payload = await response.json() as { detail?: string | { message?: string } }
    if (typeof payload.detail === 'string') message = payload.detail
    else if (payload.detail?.message) message = payload.detail.message
  } catch { /* use the status-based message */ }
  return new ApiRequestError(message, response.status)
}

async function mutation<T>(path: string, method: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    let response: Response
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'The API took too long to respond.'
        : 'Could not reach the API. Your change was not saved.'
      throw new ApiRequestError(message)
    }
    if (!response.ok) throw await responseError(response)
    return await response.json() as T
  } finally {
    window.clearTimeout(timer)
  }
}

function normalizeCollection<T>(payload: Collection<T> | T[]): Collection<T> {
  if (Array.isArray(payload)) return { items: payload, total: payload.length }
  return { items: payload.items || [], total: payload.total ?? payload.items?.length ?? 0 }
}

function scoreCandidate(candidate: Candidate, query: string): Candidate {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
  if (!terms.length) return candidate
  const haystack = [candidate.headline, candidate.summary, candidate.location, ...candidate.skills, ...(candidate.highlights || [])].join(' ').toLowerCase()
  const hits = terms.filter(term => haystack.includes(term)).length
  const adjusted = Math.min(99, Math.round(candidate.match_score * 0.72 + (hits / terms.length) * 28))
  return { ...candidate, match_score: adjusted }
}

export const api = {
  dashboard: () => request<Dashboard>('/dashboard', { fallback: demoDashboard }),

  jobs: async () => {
    const result = await request<Collection<Job> | Job[]>('/jobs', { fallback: { items: demoJobs, total: demoJobs.length } })
    return { ...result, data: normalizeCollection(result.data) }
  },

  job: (id: string) => request<Job>(`/jobs/${id}`, { fallback: demoJobs.find(job => job.id === id) || demoJobs[0] }),

  jobCandidates: async (id: string, query = '', minScore = 0) => {
    const fallback = demoCandidates.filter(candidate => candidate.job_id === id && candidate.match_score >= minScore)
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (minScore) params.set('min_score', String(minScore))
    const result = await request<Collection<Candidate> | Candidate[]>(`/jobs/${id}/candidates?${params}`, { fallback: { items: fallback, total: fallback.length } })
    return { ...result, data: normalizeCollection(result.data) }
  },

  candidates: async () => {
    const result = await request<Collection<Candidate> | Candidate[]>('/candidates', { fallback: { items: demoCandidates, total: demoCandidates.length } })
    return { ...result, data: normalizeCollection(result.data) }
  },

  candidate: (id: string, jobId?: string) => {
    const params = jobId ? `?${new URLSearchParams({ job_id: jobId })}` : ''
    return request<Candidate>(`/candidates/${id}${params}`, { fallback: demoCandidates.find(candidate => candidate.id === id && (!jobId || candidate.job_id === jobId)) || demoCandidates[0] })
  },

  updateStage: (id: string, stage: string, jobId: string) => mutation<Candidate>(`/candidates/${id}/stage`, 'PATCH', { stage, job_id: jobId }),

  semanticSearch: async (query: string, jobId?: string, limit = 20) => {
    const ranked = demoCandidates
      .filter(candidate => !jobId || candidate.job_id === jobId)
      .map(candidate => scoreCandidate(candidate, query))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit)
    const fallback: SearchResponse = { query, total: ranked.length, results: ranked }
    const result = await request<SearchResponse | Collection<Candidate> | Candidate[]>('/search/semantic', {
      method: 'POST', body: { query, job_id: jobId || undefined, limit }, fallback,
    })
    if (Array.isArray(result.data)) return { ...result, data: { query, total: result.data.length, results: result.data } }
    if ('items' in result.data) return { ...result, data: { query, total: result.data.total, results: result.data.items } }
    return result as ApiResult<SearchResponse>
  },

  interviews: async () => {
    const result = await request<Collection<Interview> | Interview[]>('/interviews', { fallback: { items: demoInterviews, total: demoInterviews.length } })
    return { ...result, data: normalizeCollection(result.data) }
  },

  createInterview: (interview: Partial<Interview>) => mutation<Interview>('/interviews', 'POST', interview),

  integrations: async () => {
    const result = await request<Collection<Integration> | Integration[]>('/integrations', { fallback: { items: demoIntegrations, total: demoIntegrations.length } })
    return { ...result, data: normalizeCollection(result.data) }
  },

  billing: () => request<Billing>('/billing', { fallback: demoBilling }),
}

export const apiBaseUrl = API_URL
