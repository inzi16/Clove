import type { Activity, Billing, Candidate, Dashboard, Integration, Interview, Job } from '../types'

export const demoCandidates: Candidate[] = [
  {
    id: 'cand-1', name: 'Maya Chen', email: 'maya.chen@example.com', headline: 'Staff ML Engineer · Search & Ranking',
    location: 'San Francisco, CA', experience_years: 9, skills: ['Python', 'PyTorch', 'Vector search', 'MLOps'],
    stage: 'interview', match_score: 96, score_breakdown: { semantic: 98, skills: 96, experience: 94, location: 92 },
    job_id: 'job-1', job_title: 'Senior AI Engineer', applied_at: '2026-08-16T11:30:00Z', avatar_color: '#d6e7db',
    summary: 'Built retrieval and ranking systems used by 12M users; led a team of six across ML platform and product search.',
    match_reasons: ['Deep vector retrieval experience', 'Led production ML teams', 'Strong Python and PyTorch fit'],
    highlights: ['Scaled ANN search to 1B embeddings', 'Reduced inference cost by 38%'],
  },
  {
    id: 'cand-2', name: 'Jon Bell', email: 'jon.bell@example.com', headline: 'Product Designer · B2B SaaS',
    location: 'Brooklyn, NY', experience_years: 7, skills: ['Figma', 'Design systems', 'Research', 'Prototyping'],
    stage: 'screening', match_score: 91, score_breakdown: { semantic: 93, skills: 95, experience: 88, location: 82 },
    job_id: 'job-2', job_title: 'Senior Product Designer', applied_at: '2026-08-16T08:10:00Z', avatar_color: '#eadccf',
    summary: 'End-to-end product designer focused on complex workflows, zero-to-one products, and accessible design systems.',
    match_reasons: ['Complex workflow portfolio', 'Design systems owner', 'Strong research practice'],
    highlights: ['Led redesign improving activation 24%', 'Created 60-component design system'],
  },
  {
    id: 'cand-3', name: 'Amara Okafor', email: 'amara.o@example.com', headline: 'Backend Engineer · Distributed Systems',
    location: 'London, UK', experience_years: 6, skills: ['Python', 'FastAPI', 'PostgreSQL', 'Kubernetes'],
    stage: 'sourced', match_score: 89, score_breakdown: { semantic: 91, skills: 93, experience: 86, location: 78 },
    job_id: 'job-1', job_title: 'Senior AI Engineer', applied_at: '2026-08-15T18:45:00Z', avatar_color: '#d9def0',
    summary: 'Backend specialist building resilient data and ML-serving infrastructure at high-growth startups.',
    match_reasons: ['FastAPI and PostgreSQL expertise', 'Production Kubernetes ownership', 'Relevant startup environment'],
    highlights: ['Maintained 99.99% API availability', 'Cut p95 latency from 410ms to 120ms'],
  },
  {
    id: 'cand-4', name: 'Luca Romano', email: 'luca.r@example.com', headline: 'ML Engineer · NLP & Recommendations',
    location: 'Berlin, DE', experience_years: 5, skills: ['NLP', 'Transformers', 'Python', 'Milvus'],
    stage: 'offer', match_score: 88, score_breakdown: { semantic: 95, skills: 92, experience: 81, location: 70 },
    job_id: 'job-1', job_title: 'Senior AI Engineer', applied_at: '2026-08-13T13:20:00Z', avatar_color: '#f0dfc2',
    summary: 'Applied ML engineer with hands-on recommendation, LLM evaluation, and vector database experience.',
    match_reasons: ['Direct Milvus experience', 'Strong transformer fundamentals', 'Recommendation domain overlap'],
    highlights: ['Shipped multilingual semantic search', 'Improved recommendation CTR 17%'],
  },
  {
    id: 'cand-5', name: 'Priya Shah', email: 'priya.shah@example.com', headline: 'Growth Product Manager · PLG',
    location: 'Austin, TX', experience_years: 8, skills: ['Product strategy', 'Analytics', 'Experimentation', 'SQL'],
    stage: 'interview', match_score: 86, score_breakdown: { semantic: 90, skills: 86, experience: 91, location: 76 },
    job_id: 'job-3', job_title: 'Product Manager, Growth', applied_at: '2026-08-12T16:00:00Z', avatar_color: '#eed4d5',
    summary: 'Product-led growth leader who has scaled self-serve acquisition and monetization loops from seed to Series C.',
    match_reasons: ['Led PLG at scale', 'Strong experimentation cadence', 'Advanced product analytics'],
    highlights: ['Grew paid conversion 31%', 'Launched usage-based pricing'],
  },
  {
    id: 'cand-6', name: 'Eli Thompson', email: 'eli.t@example.com', headline: 'Full-stack Engineer · Developer Tools',
    location: 'Toronto, CA', experience_years: 4, skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    stage: 'screening', match_score: 82, score_breakdown: { semantic: 84, skills: 90, experience: 75, location: 80 },
    job_id: 'job-4', job_title: 'Frontend Engineer', applied_at: '2026-08-11T09:15:00Z', avatar_color: '#d2e6e5',
    summary: 'Product-minded engineer building polished developer experiences with a focus on performance and maintainability.',
    match_reasons: ['Excellent React and TypeScript fit', 'Developer tooling experience', 'Product-minded approach'],
    highlights: ['Built IDE extension used by 40k developers', 'Reduced bundle size 43%'],
  },
  {
    id: 'cand-7', name: 'Sofia Reyes', email: 'sofia.r@example.com', headline: 'Enterprise Account Executive',
    location: 'Chicago, IL', experience_years: 9, skills: ['Enterprise sales', 'SaaS', 'MEDDPICC', 'Salesforce'],
    stage: 'hired', match_score: 93, score_breakdown: { semantic: 94, skills: 96, experience: 94, location: 88 },
    job_id: 'job-5', job_title: 'Enterprise Account Executive', applied_at: '2026-08-05T14:45:00Z', avatar_color: '#e8dded',
    summary: 'Consistent enterprise seller with a record of landing complex multi-stakeholder deals in regulated industries.',
    match_reasons: ['Exceeded quota five years running', 'Deep enterprise SaaS motion', 'Strong methodology match'],
    highlights: ['$2.4M largest closed deal', '132% average quota attainment'],
  },
  {
    id: 'cand-8', name: 'Noah Williams', email: 'noah.w@example.com', headline: 'Data Platform Engineer',
    location: 'Seattle, WA', experience_years: 6, skills: ['Spark', 'Kafka', 'Python', 'AWS'],
    stage: 'rejected', match_score: 74, score_breakdown: { semantic: 80, skills: 78, experience: 84, location: 36 },
    job_id: 'job-1', job_title: 'Senior AI Engineer', applied_at: '2026-08-02T10:05:00Z', avatar_color: '#dbe3cc',
    summary: 'Experienced platform engineer specializing in event-driven data pipelines and cloud infrastructure.',
    match_reasons: ['Strong distributed data foundation', 'Relevant Python depth'],
    highlights: ['Processed 6TB daily with Kafka', 'Led AWS migration'],
  },
]

export const demoJobs: Job[] = [
  { id: 'job-1', title: 'Senior AI Engineer', department: 'Engineering', location: 'San Francisco · Hybrid', employment_type: 'Full-time', status: 'active', candidate_count: 42, new_candidates: 8, hiring_manager: 'Nina Patel', created_at: '2026-07-28T00:00:00Z', target_hires: 2, description: 'Build the intelligence layer behind Clove—from semantic matching to explainable candidate ranking. You will ship production ML systems and influence the product roadmap.', skills: ['Python', 'PyTorch', 'Vector databases', 'FastAPI', 'MLOps'], pipeline_health: 'strong' },
  { id: 'job-2', title: 'Senior Product Designer', department: 'Design', location: 'New York · Hybrid', employment_type: 'Full-time', status: 'active', candidate_count: 27, new_candidates: 5, hiring_manager: 'Alex Kim', created_at: '2026-08-01T00:00:00Z', target_hires: 1, description: 'Shape calm, powerful workflows for recruiting teams. Own discovery through delivery and evolve our young design system.', skills: ['Product design', 'Research', 'Design systems', 'Prototyping'], pipeline_health: 'strong' },
  { id: 'job-3', title: 'Product Manager, Growth', department: 'Product', location: 'Austin · Remote', employment_type: 'Full-time', status: 'active', candidate_count: 31, new_candidates: 4, hiring_manager: 'Sam Rivera', created_at: '2026-07-22T00:00:00Z', target_hires: 1, description: 'Own the product-led growth engine from activation to expansion. Run experiments and build compounding growth loops.', skills: ['PLG', 'Experimentation', 'Analytics', 'Pricing'], pipeline_health: 'attention' },
  { id: 'job-4', title: 'Frontend Engineer', department: 'Engineering', location: 'Remote · Americas', employment_type: 'Full-time', status: 'active', candidate_count: 19, new_candidates: 7, hiring_manager: 'Owen Park', created_at: '2026-08-09T00:00:00Z', target_hires: 2, description: 'Create the fast, accessible interface teams use all day. Work closely with design and platform engineering.', skills: ['React', 'TypeScript', 'Accessibility', 'Performance'], pipeline_health: 'new' },
  { id: 'job-5', title: 'Enterprise Account Executive', department: 'Sales', location: 'Chicago · Remote', employment_type: 'Full-time', status: 'active', candidate_count: 16, new_candidates: 2, hiring_manager: 'Taylor Moss', created_at: '2026-07-15T00:00:00Z', target_hires: 2, description: 'Help modern recruiting teams adopt a more intelligent way to hire. Own strategic accounts end to end.', skills: ['Enterprise SaaS', 'MEDDPICC', 'Executive selling'], pipeline_health: 'attention' },
  { id: 'job-6', title: 'People Operations Lead', department: 'People', location: 'San Francisco · Hybrid', employment_type: 'Full-time', status: 'draft', candidate_count: 0, new_candidates: 0, hiring_manager: 'Nina Patel', created_at: '2026-08-14T00:00:00Z', target_hires: 1, description: 'Build the systems and rituals that help our growing team do its best work.', skills: ['People ops', 'HRIS', 'Employee experience'], pipeline_health: 'new' },
]

const now = new Date()
const upcoming = (days: number, hour: number) => {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const demoInterviews: Interview[] = [
  { id: 'int-1', candidate_id: 'cand-1', candidate_name: 'Maya Chen', job_title: 'Senior AI Engineer', starts_at: upcoming(0, 10), ends_at: upcoming(0, 11), type: 'Technical deep dive', interviewer_names: ['Nina Patel', 'Owen Park'], provider: 'google', meeting_url: '#', status: 'scheduled' },
  { id: 'int-2', candidate_id: 'cand-5', candidate_name: 'Priya Shah', job_title: 'Product Manager, Growth', starts_at: upcoming(0, 14), ends_at: upcoming(0, 15), type: 'Product sense', interviewer_names: ['Sam Rivera'], provider: 'outlook', meeting_url: '#', status: 'scheduled' },
  { id: 'int-3', candidate_id: 'cand-4', candidate_name: 'Luca Romano', job_title: 'Senior AI Engineer', starts_at: upcoming(1, 11), ends_at: upcoming(1, 12), type: 'Values interview', interviewer_names: ['Alex Kim', 'Nina Patel'], provider: 'calendly', meeting_url: '#', status: 'scheduled' },
  { id: 'int-4', candidate_id: 'cand-2', candidate_name: 'Jon Bell', job_title: 'Senior Product Designer', starts_at: upcoming(2, 9), ends_at: upcoming(2, 10), type: 'Portfolio review', interviewer_names: ['Alex Kim'], provider: 'google', meeting_url: '#', status: 'scheduled' },
  { id: 'int-5', candidate_id: 'cand-6', candidate_name: 'Eli Thompson', job_title: 'Frontend Engineer', starts_at: upcoming(3, 15), ends_at: upcoming(3, 16), type: 'Pair programming', interviewer_names: ['Owen Park'], provider: 'outlook', meeting_url: '#', status: 'scheduled' },
]

export const demoIntegrations: Integration[] = [
  { id: 'google', name: 'Google Workspace', category: 'Calendar & meetings', description: 'Calendar availability and Google Meet links', connected: true, account: 'recruiting@northstar.io', color: '#4285f4', initials: 'G' },
  { id: 'outlook', name: 'Microsoft Outlook', category: 'Calendar & meetings', description: 'Outlook calendar and Teams meeting links', connected: false, color: '#1976d2', initials: 'O' },
  { id: 'calendly', name: 'Calendly', category: 'Scheduling', description: 'Candidate self-scheduling and routing', connected: true, account: 'Northstar Recruiting', color: '#006bff', initials: 'C' },
  { id: 'slack', name: 'Slack', category: 'Collaboration', description: 'Interview reminders and hiring updates', connected: true, account: 'northstar-hq', color: '#4a154b', initials: 'S' },
  { id: 'greenhouse', name: 'Greenhouse', category: 'ATS', description: 'Keep candidates and jobs synchronized', connected: false, color: '#33704a', initials: 'Gh' },
  { id: 'zoom', name: 'Zoom', category: 'Video meetings', description: 'Create interview rooms automatically', connected: false, color: '#2d8cff', initials: 'Z' },
]

export const demoBilling: Billing = {
  plan: 'Scale', status: 'active', amount: 24900, currency: 'USD', interval: 'month', renewal_at: upcoming(21, 0), seats_used: 8, seats_total: 12,
  usage: [
    { label: 'AI candidate searches', used: 684, limit: 1000 },
    { label: 'Active jobs', used: 5, limit: 20 },
    { label: 'Candidate profiles', used: 142, limit: 1000 },
  ],
}

export const demoActivity: Activity[] = [
  { id: 'act-1', actor: 'Nina Patel', action: 'moved', subject: 'Maya Chen to Interview', timestamp: '2026-08-16T16:45:00Z', kind: 'candidate' },
  { id: 'act-2', actor: 'Alex Kim', action: 'scheduled', subject: 'Portfolio review with Jon Bell', timestamp: '2026-08-16T14:20:00Z', kind: 'interview' },
  { id: 'act-3', actor: 'Sam Rivera', action: 'published', subject: 'Product Manager, Growth', timestamp: '2026-08-16T10:05:00Z', kind: 'job' },
  { id: 'act-4', actor: 'Owen Park', action: 'left feedback on', subject: 'Eli Thompson', timestamp: '2026-08-15T20:30:00Z', kind: 'candidate' },
]

export const demoDashboard: Dashboard = {
  metrics: { active_jobs: 5, total_candidates: 142, interviews_this_week: 12, average_match_score: 86 },
  pipeline: [
    { stage: 'sourced', count: 57 }, { stage: 'screening', count: 34 }, { stage: 'interview', count: 22 },
    { stage: 'offer', count: 8 }, { stage: 'hired', count: 6 },
  ],
  recent_candidates: demoCandidates.slice(0, 4), upcoming_interviews: demoInterviews.slice(0, 3), activity: demoActivity,
}
