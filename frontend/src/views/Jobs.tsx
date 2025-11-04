import { useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { shortDate, stageLabel } from '../lib/format'
import type { Candidate, Job } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, Card, DemoNotice, IconButton, Modal, ScoreRing, Skeleton, StatePanel } from '../components/UI'
import { navigate } from '../components/Layout'
import { CandidateProfile } from '../components/CandidateProfile'

function healthMeta(value: Job['pipeline_health']) {
  if (value === 'attention') return { label: 'Needs attention', tone: 'amber' as const }
  if (value === 'new') return { label: 'New role', tone: 'blue' as const }
  return { label: 'Healthy', tone: 'green' as const }
}

export function Jobs({ jobId }: { jobId?: string }) {
  return jobId ? <JobDetail jobId={jobId} /> : <JobList />
}

function JobList() {
  const resource = useResource(api.jobs)
  const [tab, setTab] = useState<'active' | 'draft' | 'closed' | 'all'>('active')
  const [department, setDepartment] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const jobs = (resource.data?.items || []).filter(job => (tab === 'all' || job.status === tab) && (!department || job.department === department))
  const departments = Array.from(new Set((resource.data?.items || []).map(job => job.department)))

  return <div className="jobs-page">
    {resource.source === 'demo' && <DemoNotice error={resource.error} />}
    <div className="jobs-summary">
      <div><span className="jobs-summary__icon"><Icon name="briefcase" /></span><span><strong>{resource.data?.items.filter(job => job.status === 'active').length || 0}</strong><small>Active roles</small></span></div>
      <div><span className="jobs-summary__icon jobs-summary__icon--blue"><Icon name="users" /></span><span><strong>{resource.data?.items.reduce((sum, job) => sum + (job.candidate_count || 0), 0) || 0}</strong><small>Total candidates</small></span></div>
      <div><span className="jobs-summary__icon jobs-summary__icon--amber"><Icon name="clock" /></span><span><strong>18d</strong><small>Avg. time to hire</small></span></div>
      <Button icon="plus" onClick={() => setCreateOpen(true)}>Create job</Button>
    </div>
    <div className="tabs-toolbar">
      <div className="tabs" role="tablist">{(['active','draft','closed','all'] as const).map(item => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item[0].toUpperCase() + item.slice(1)}<small>{item === 'all' ? resource.data?.total : resource.data?.items.filter(job => job.status === item).length}</small></button>)}</div>
      <label className="select-control"><Icon name="filter" size={14}/><select value={department} onChange={event => setDepartment(event.target.value)} aria-label="Filter by department"><option value="">All departments</option>{departments.map(item => <option key={item}>{item}</option>)}</select><Icon name="chevron-down" size={12}/></label>
    </div>
    {resource.loading ? <div className="job-grid">{[1,2,3,4].map(item => <Skeleton className="sk-job-card" key={item}/>)}</div> : resource.error && !resource.data ? <StatePanel icon="alert" title="Jobs unavailable" description={resource.error} action={<Button variant="secondary" icon="refresh" onClick={() => void resource.reload()}>Try again</Button>}/> : jobs.length ? <div className="job-grid">
      {jobs.map(job => {
        const health = healthMeta(job.pipeline_health)
        return <Card className="job-card" key={job.id} onClick={() => navigate(`jobs/${job.id}`)} role="link" tabIndex={0} onKeyDown={event => event.key === 'Enter' && navigate(`jobs/${job.id}`)}>
          <div className="job-card__top"><span className="department-mark">{job.department?.slice(0, 2).toUpperCase() || '—'}</span><Badge tone={job.status === 'active' ? 'green' : job.status === 'draft' ? 'amber' : 'neutral'} dot>{job.status}</Badge><IconButton icon="more" label={`Actions for ${job.title}`} onClick={event => event.stopPropagation()} /></div>
          <h2>{job.title}</h2><p className="job-location"><Icon name="map-pin" size={14}/> {job.location || 'Location flexible'} · {job.employment_type || 'Full-time'}</p>
          <div className="job-card__stats"><span><strong>{job.candidate_count || 0}</strong><small>Candidates</small></span><span><strong>{job.new_candidates || 0}</strong><small>New this week</small></span><span><strong>{job.target_hires || 1}</strong><small>Opening{(job.target_hires || 1) > 1 ? 's' : ''}</small></span></div>
          <div className="job-card__progress"><div><span>Pipeline health</span><Badge tone={health.tone}>{health.label}</Badge></div><span><i style={{ width: `${Math.min(100, ((job.candidate_count || 0) / Math.max(1, (job.target_hires || 1) * 18)) * 100)}%` }}/></span></div>
          <footer><span className="manager-mini"><Avatar name={job.hiring_manager || 'Hiring Team'} size="sm"/><span><small>Hiring manager</small><strong>{job.hiring_manager || 'Hiring team'}</strong></span></span><span>Opened {shortDate(job.created_at)}</span></footer>
        </Card>
      })}
    </div> : <StatePanel icon="briefcase" title={`No ${tab === 'all' ? '' : tab} jobs`} description="Create a role or adjust the filters to see more jobs." action={<Button icon="plus" onClick={() => setCreateOpen(true)}>Create job</Button>} />}
    {createOpen && <CreateJobModal onClose={() => setCreateOpen(false)} />}
  </div>
}

function JobDetail({ jobId }: { jobId: string }) {
  const job = useResource(() => api.job(jobId), [jobId])
  const candidates = useResource(() => api.jobCandidates(jobId), [jobId])
  const [selected, setSelected] = useState<Candidate | null>(null)
  function openCandidate(candidate: Candidate) {
    setSelected(candidate)
    void api.candidate(candidate.id, candidate.job_id).then(result => {
      setSelected(current => current?.id === candidate.id && current.job_id === candidate.job_id ? { ...candidate, ...result.data } : current)
    }).catch(() => { /* retain the summary if detail access is unavailable */ })
  }
  if (job.loading) return <div className="job-detail"><Skeleton className="sk-detail-hero"/><Skeleton className="sk-chart"/></div>
  if (!job.data) return <StatePanel icon="briefcase" title="Job not found" description="This job may have been closed or removed." action={<Button variant="secondary" onClick={() => navigate('jobs')}>Back to jobs</Button>} />
  const details = job.data
  const pipeline = ['sourced','screening','interview','offer','hired'] as Candidate['stage'][]
  const values = pipeline.map(stage => candidates.data?.items.filter(candidate => candidate.stage === stage).length || 0)
  const max = Math.max(...values, 1)

  return <div className="job-detail">
    {(job.source === 'demo' || candidates.source === 'demo') && <DemoNotice error={job.error || candidates.error} />}
    <button className="back-button" onClick={() => navigate('jobs')}><Icon name="arrow-right" size={15}/> All jobs</button>
    <section className="job-detail__hero">
      <div className="department-mark department-mark--large">{details.department?.slice(0, 2).toUpperCase() || '—'}</div>
      <div className="job-detail__heading"><div><Badge tone={details.status === 'active' ? 'green' : 'amber'} dot>{details.status}</Badge><span>{details.department || 'General'}</span></div><h1>{details.title}</h1><p><Icon name="map-pin" size={14}/> {details.location || 'Flexible'} · {details.employment_type || 'Full-time'} · Opened {shortDate(details.created_at)}</p></div>
      <div className="job-detail__actions"><Button variant="secondary" icon="edit">Edit job</Button><Button icon="plus">Add candidate</Button><IconButton icon="more" label="Job options"/></div>
    </section>
    <div className="job-detail__tabs"><button className="active">Overview</button><button>Candidates <span>{details.candidate_count || candidates.data?.total || 0}</span></button><button>Scorecard</button><button>Activity</button></div>
    <div className="job-detail__layout">
      <div>
        <Card className="job-overview-card"><div className="panel-header"><div><p className="eyebrow">Role brief</p><h2>About this role</h2></div><IconButton icon="edit" label="Edit role description"/></div><p className="job-description">{details.description || 'This role is part of a growing team focused on creating thoughtful products and durable customer value.'}</p><h3>What we’re looking for</h3><div className="chip-list">{(details.skills || ['Collaboration', 'Ownership', 'Clear communication']).map(skill => <span className="chip" key={skill}><Icon name="check" size={12}/>{skill}</span>)}</div></Card>
        <Card className="job-candidates-card"><div className="panel-header"><div><p className="eyebrow">Top matches</p><h2>Candidates to review</h2></div><button className="text-button" onClick={() => navigate('candidates')}>View all <Icon name="arrow-right" size={14}/></button></div>
          {candidates.loading ? <Skeleton className="sk-list"/> : candidates.data?.items.length ? <div className="job-candidate-list">{candidates.data.items.slice(0, 4).map(candidate => <button key={candidate.application_id || `${candidate.id}:${candidate.job_id}`} onClick={() => openCandidate(candidate)}><div className="candidate-cell"><Avatar name={candidate.name} color={candidate.avatar_color} size="sm"/><span><strong>{candidate.name}</strong><small>{candidate.headline}</small></span></div><Badge>{stageLabel[candidate.stage]}</Badge><ScoreRing score={candidate.match_score} size={42}/><Icon name="chevron-right" size={15}/></button>)}</div> : <StatePanel title="No candidates yet" description="Add or source candidates for this role to see ranked matches." />}
        </Card>
      </div>
      <aside>
        <Card className="job-side-card"><h2>Hiring team</h2><div className="team-member"><Avatar name={details.hiring_manager || 'Hiring Team'} color="#e4cda6"/><span><strong>{details.hiring_manager || 'Unassigned'}</strong><small>Hiring manager</small></span></div><div className="team-member"><Avatar name="Nina Patel" color="#d4e0d8"/><span><strong>Nina Patel</strong><small>Recruiter</small></span></div><button className="full-row-button"><Icon name="plus" size={14}/> Add team member</button></Card>
        <Card className="job-side-card"><div className="panel-header"><h2>Pipeline</h2><button className="text-button" onClick={() => navigate('pipeline')}>Open</button></div><div className="mini-funnel">{pipeline.map((stage, index) => <div key={stage}><span>{stageLabel[stage]}</span><i><b style={{ width: `${Math.max(7, (values[index] / max) * 100)}%` }}/></i><strong>{values[index]}</strong></div>)}</div></Card>
        <Card className="job-side-card role-details"><h2>Role details</h2><dl><div><dt>Headcount</dt><dd>{details.target_hires || 1}</dd></div><div><dt>Department</dt><dd>{details.department || '—'}</dd></div><div><dt>Employment</dt><dd>{details.employment_type || 'Full-time'}</dd></div><div><dt>Job ID</dt><dd>{details.id}</dd></div></dl></Card>
      </aside>
    </div>
    {selected && <CandidateProfile candidate={selected} onClose={() => setSelected(null)}/>}
  </div>
}

function CreateJobModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  return <Modal title="Create a new job" onClose={onClose}>
    <div className="step-indicator"><span className="active">1</span><i/><span className={step > 1 ? 'active' : ''}>2</span><i/><span>3</span></div>
    {step === 1 ? <div className="form-stack"><label>Job title<input autoFocus placeholder="e.g. Senior Backend Engineer"/></label><div className="form-row"><label>Department<select><option>Engineering</option><option>Design</option><option>Product</option><option>Sales</option></select></label><label>Employment type<select><option>Full-time</option><option>Part-time</option><option>Contract</option></select></label></div><label>Location<input placeholder="City, timezone, or remote"/></label><div className="modal-footer"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button onClick={() => setStep(2)}>Continue</Button></div></div> : <div className="modal-success"><span><Icon name="sparkles" size={24}/></span><h3>Let AI draft the role</h3><p>Paste a few notes and Clove will turn them into a structured, inclusive job brief and scorecard.</p><textarea placeholder="What will this person own? What makes someone great in this role?"/><div className="modal-footer"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button icon="wand" onClick={onClose}>Create draft</Button></div></div>}
  </Modal>
}
