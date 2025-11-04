import { useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { fullDate, stageLabel, time, timeAgo } from '../lib/format'
import type { Candidate } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Card, DemoNotice, IconButton, ScoreRing, Skeleton, StatePanel } from '../components/UI'
import { CandidateProfile } from '../components/CandidateProfile'
import { navigate } from '../components/Layout'

const metricCards = [
  { key: 'active_jobs', label: 'Active jobs', icon: 'briefcase' as const, delta: '+2 this month', color: 'sage' },
  { key: 'total_candidates', label: 'Total candidates', icon: 'users' as const, delta: '+18 this week', color: 'blue' },
  { key: 'interviews_this_week', label: 'Interviews this week', icon: 'calendar' as const, delta: '4 today', color: 'amber' },
  { key: 'average_match_score', label: 'Average match', icon: 'sparkles' as const, delta: '+3.2% vs last month', color: 'purple', suffix: '%' },
] as const

export function Overview() {
  const { data, loading, source, error } = useResource(api.dashboard)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const maxPipeline = Math.max(1, ...(data?.pipeline.map(item => item.count) || [0]))

  function openCandidate(candidate: Candidate) {
    setSelected(candidate)
    void api.candidate(candidate.id, candidate.job_id).then(result => {
      setSelected(current => current?.id === candidate.id && current.job_id === candidate.job_id ? { ...candidate, ...result.data } : current)
    }).catch(() => { /* retain the summary if detail access is unavailable */ })
  }

  if (loading) return <OverviewSkeleton />
  if (!data) return <StatePanel icon="alert" title="Dashboard unavailable" description="We could not load this workspace. Try refreshing the page." />

  return <div className="overview-grid">
    {source === 'demo' && <div className="span-all"><DemoNotice error={error} /></div>}
    <section className="metric-grid span-all" aria-label="Workspace metrics">
      {metricCards.map(card => <Card className={`metric-card metric-card--${card.color}`} key={card.key}>
        <div className="metric-card__top"><span className="metric-icon"><Icon name={card.icon} size={18} /></span><span className="trend"><Icon name="arrow-up" size={12} /> {card.delta}</span></div>
        <strong>{data.metrics?.[card.key] ?? 0}{'suffix' in card ? card.suffix : ''}</strong>
        <p>{card.label}</p>
      </Card>)}
    </section>

    <Card className="pipeline-card dashboard-panel">
      <div className="panel-header"><div><p className="eyebrow">Conversion</p><h2>Pipeline at a glance</h2></div><button className="text-button" onClick={() => navigate('pipeline')}>View pipeline <Icon name="arrow-right" size={14} /></button></div>
      {data.pipeline?.length ? <div className="pipeline-chart">
        {data.pipeline.map((item, index) => <div className="pipeline-bar-wrap" key={item.stage}>
          <div className="pipeline-bar-label"><span>{stageLabel[item.stage] || item.stage}</span><strong>{item.count}</strong></div>
          <div className="pipeline-bar"><i style={{ width: `${Math.max(10, (item.count / maxPipeline) * 100)}%` }}><span /></i></div>
          {index < data.pipeline.length - 1 && <small>{item.count > 0 ? `${Math.round(((data.pipeline[index + 1]?.count || 0) / item.count) * 100)}%` : '—'}</small>}
        </div>)}
      </div> : <StatePanel title="No pipeline activity" description="Candidates will appear here once they enter your pipeline." />}
      <div className="pipeline-insight"><span><Icon name="sparkles" size={16} /></span><div><strong>Healthy conversion</strong><p>Your interview-to-offer rate is 8% above the team benchmark.</p></div><Icon name="chevron-right" size={17} /></div>
    </Card>

    <Card className="interviews-card dashboard-panel">
      <div className="panel-header"><div><p className="eyebrow">Coming up</p><h2>Interviews</h2></div><button className="text-button" onClick={() => navigate('interviews')}>Calendar <Icon name="arrow-right" size={14} /></button></div>
      <div className="interview-mini-list">
        {data.upcoming_interviews?.map(interview => <article key={interview.id} className="interview-mini">
          <div className="date-tile"><span>{new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(interview.starts_at))}</span><strong>{new Date(interview.starts_at).getDate()}</strong></div>
          <div><strong>{interview.candidate_name}</strong><p>{interview.type || 'Interview'} · {interview.job_title}</p><small><Icon name="clock" size={12} /> {time(interview.starts_at)} · {(interview.interviewer_names || []).join(', ') || 'Hiring team'}</small></div>
          <IconButton icon="video" label="Join meeting" />
        </article>)}
      </div>
      <button className="full-row-button" onClick={() => navigate('interviews')}><Icon name="plus" size={15} /> Schedule an interview</button>
    </Card>

    <Card className="recent-card dashboard-panel">
      <div className="panel-header"><div><p className="eyebrow">Fresh talent</p><h2>Recent candidates</h2></div><button className="text-button" onClick={() => navigate('candidates')}>All candidates <Icon name="arrow-right" size={14} /></button></div>
      <div className="candidate-table candidate-table--compact">
        <div className="candidate-table__header"><span>Candidate</span><span>Role</span><span>Stage</span><span>Match</span><span /></div>
        {data.recent_candidates?.map(candidate => <button className="candidate-row" key={candidate.application_id || `${candidate.id}:${candidate.job_id}`} onClick={() => openCandidate(candidate)}>
          <span className="candidate-cell"><Avatar name={candidate.name} color={candidate.avatar_color} size="sm" /><span><strong>{candidate.name}</strong><small>{candidate.headline}</small></span></span>
          <span>{candidate.job_title}</span><span><Badge>{stageLabel[candidate.stage]}</Badge></span><span><ScoreRing score={candidate.match_score} size={42} /></span><Icon name="chevron-right" size={16} />
        </button>)}
      </div>
    </Card>

    <Card className="activity-card dashboard-panel">
      <div className="panel-header"><div><p className="eyebrow">Team pulse</p><h2>Recent activity</h2></div><IconButton icon="more" label="Activity options" /></div>
      <div className="activity-list">
        {(data.activity || []).map(activity => <div className="activity-item" key={activity.id}>
          <span className={`activity-icon activity-icon--${activity.kind}`}><Icon name={activity.kind === 'candidate' ? 'user' : activity.kind === 'interview' ? 'calendar' : activity.kind === 'job' ? 'briefcase' : 'users'} size={15} /></span>
          <div><p><strong>{activity.actor}</strong> {activity.action} <b>{activity.subject}</b></p><small>{timeAgo(activity.timestamp)}</small></div>
        </div>)}
        {!data.activity?.length && <div className="empty-inline">No recent activity yet.</div>}
      </div>
    </Card>
    {selected && <CandidateProfile candidate={selected} onClose={() => setSelected(null)} onAdvance={() => { setSelected(null); navigate('pipeline') }} />}
  </div>
}

function OverviewSkeleton() {
  return <div className="overview-grid"><section className="metric-grid span-all">{[1,2,3,4].map(item => <Card className="metric-card" key={item}><Skeleton className="sk-circle"/><Skeleton className="sk-number"/><Skeleton className="sk-text"/></Card>)}</section><Card className="pipeline-card dashboard-panel"><Skeleton className="sk-heading"/><Skeleton className="sk-chart"/></Card><Card className="interviews-card dashboard-panel"><Skeleton className="sk-heading"/><Skeleton className="sk-list"/></Card></div>
}
