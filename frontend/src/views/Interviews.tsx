import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { fullDate, time } from '../lib/format'
import type { Interview } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, Card, DemoNotice, IconButton, Modal, Skeleton, StatePanel } from '../components/UI'

const providerMeta = {
  google: { label: 'Google Meet', letter: 'G', color: '#4285f4' },
  outlook: { label: 'Microsoft Teams', letter: 'T', color: '#6264a7' },
  calendly: { label: 'Calendly', letter: 'C', color: '#006bff' },
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay() || 7
  result.setDate(result.getDate() - day + 1)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function localDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function Interviews() {
  const resource = useResource(api.interviews)
  const [interviews, setInterviews] = useState<Interview[] | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [view, setView] = useState<'week' | 'agenda'>('week')
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const items = interviews || resource.data?.items || []
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7)
  const days = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index))

  async function addInterview(input: Partial<Interview>) {
    if (resource.source === 'demo') {
      const local: Interview = {
        id: `local-${Date.now()}`,
        candidate_id: input.candidate_id || '', job_id: input.job_id,
        candidate_name: input.candidate_name || 'Candidate', job_title: input.job_title || '',
        starts_at: input.starts_at || new Date().toISOString(), ends_at: input.ends_at || new Date().toISOString(),
        type: input.type || 'Interview', interviewer_names: input.interviewer_names || [],
        provider: input.provider || 'google', meeting_url: '#', status: 'scheduled',
      }
      setInterviews(current => [...(current || items), local])
      setScheduleOpen(false)
      setToast({ message: 'Interview added to the demo calendar' })
      window.setTimeout(() => setToast(null), 4000)
      return
    }
    try {
      const created = await api.createInterview(input)
      setInterviews(current => [...(current || items), created])
      setScheduleOpen(false)
      setToast({ message: 'Interview scheduled' })
      window.setTimeout(() => setToast(null), 4000)
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The interview could not be scheduled.', error: true })
    }
  }

  return <div className="interviews-page">
    {resource.source === 'demo' && <DemoNotice error={resource.error} />}
    {resource.error && !resource.data && <div className="inline-error" role="alert"><Icon name="alert" size={16}/><div><strong>Calendar unavailable</strong><span>{resource.error}</span></div><button onClick={() => void resource.reload()}>Try again</button></div>}
    <div className="calendar-toolbar">
      <div className="calendar-nav"><Button variant="secondary" size="sm" onClick={() => setWeekOffset(0)}>Today</Button><IconButton icon="chevron-right" label="Previous week" className="previous" onClick={() => setWeekOffset(value => value - 1)}/><IconButton icon="chevron-right" label="Next week" onClick={() => setWeekOffset(value => value + 1)}/><h2>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(weekStart)}</h2></div>
      <div className="calendar-actions"><div className="segmented-control"><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Week</button><button className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>Agenda</button></div><Button icon="plus" onClick={() => setScheduleOpen(true)}>Schedule interview</Button></div>
    </div>
    <div className="calendar-layout">
      <div>
        {resource.loading ? <Skeleton className="sk-calendar"/> : view === 'week' ? <WeekCalendar days={days} interviews={items}/> : <Agenda interviews={items}/>}
      </div>
      <aside className="calendar-sidebar">
        <Card className="today-card"><div className="panel-header"><div><p className="eyebrow">Today</p><h2>{new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(new Date())}</h2></div><Badge tone="green">{items.filter(item => new Date(item.starts_at).toDateString() === new Date().toDateString()).length} interviews</Badge></div>
          <div className="today-timeline">{items.filter(item => new Date(item.starts_at).toDateString() === new Date().toDateString()).map((item, index) => <article key={item.id}><span className="timeline-line"><i/>{index < 1 && <b/>}</span><span className="timeline-time">{time(item.starts_at)}</span><div><strong>{item.candidate_name}</strong><p>{item.type || 'Interview'}</p><small>{item.job_title}</small><button><Icon name="video" size={13}/> Join {providerMeta[item.provider || 'google'].label}</button></div></article>)}</div>
          {!items.some(item => new Date(item.starts_at).toDateString() === new Date().toDateString()) && <StatePanel icon="calendar" title="Clear calendar" description="No interviews scheduled today."/>}
        </Card>
        <Card className="calendar-health"><span><Icon name="check-circle" size={20}/></span><div><strong>Schedule is up to date</strong><p>Checked against Clove interviews</p></div><IconButton icon="refresh" label="Refresh schedule"/></Card>
        <Card className="availability-card"><h2>Team schedule</h2><div className="avatar-stack"><Avatar name="Nina Patel" size="sm"/><Avatar name="Owen Park" size="sm" color="#d9dff1"/><Avatar name="Alex Kim" size="sm" color="#efd9ca"/><span>+4</span></div><p>Suggested open window this week</p><strong>Wednesday · 10:00 AM–1:00 PM</strong><button className="text-button">Open schedule <Icon name="arrow-right" size={13}/></button></Card>
      </aside>
    </div>
    {scheduleOpen && <ScheduleModal onClose={() => setScheduleOpen(false)} onSubmit={addInterview} existing={items}/>}
    {toast && <div className="toast" role={toast.error ? 'alert' : 'status'}><span><Icon name={toast.error ? 'alert' : 'check-circle'} size={17}/>{toast.message}</span><IconButton icon="x" label="Dismiss" onClick={() => setToast(null)}/></div>}
  </div>
}

function WeekCalendar({ days, interviews }: { days: Date[]; interviews: Interview[] }) {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  return <Card className="week-calendar">
    <div className="week-calendar__head"><span/><>{days.map(day => <div key={day.toISOString()} className={day.toDateString() === new Date().toDateString() ? 'today' : ''}><span>{new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong></div>)}</></div>
    <div className="week-calendar__body"><div className="time-axis">{hours.map(hour => <span key={hour}>{new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(2026, 1, 1, hour))}</span>)}</div>{days.map(day => <div className="day-column" key={day.toISOString()}>{hours.map(hour => <span className="hour-line" key={hour}/>)}{interviews.filter(item => new Date(item.starts_at).toDateString() === day.toDateString()).map(item => {
      const start = new Date(item.starts_at)
      const top = Math.max(0, (start.getHours() - 9) * 72 + start.getMinutes() * 1.2)
      const duration = Math.max(42, (new Date(item.ends_at).getTime() - start.getTime()) / 60000 * 1.2)
      return <article className={`calendar-event calendar-event--${item.provider || 'google'}`} style={{ top, height: duration }} key={item.id} title={`${item.candidate_name} — ${item.type || 'Interview'}`}><span>{time(item.starts_at)}</span><strong>{item.candidate_name}</strong><small>{item.type || 'Interview'}</small><i style={{ background: providerMeta[item.provider || 'google'].color }}>{providerMeta[item.provider || 'google'].letter}</i></article>
    })}{day.toDateString() === new Date().toDateString() && <span className="now-line" style={{ top: Math.max(0, (new Date().getHours() - 9) * 72 + new Date().getMinutes() * 1.2) }}><i/></span>}</div>)}</div>
  </Card>
}

function Agenda({ interviews }: { interviews: Interview[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, Interview[]>()
    interviews.slice().sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).forEach(item => {
      const key = new Date(item.starts_at).toDateString()
      map.set(key, [...(map.get(key) || []), item])
    })
    return [...map.entries()]
  }, [interviews])
  return <Card className="agenda-list">{groups.length ? groups.map(([date, items]) => <section key={date}><h2>{fullDate(items[0].starts_at)}</h2>{items.map(item => <article key={item.id}><span className="agenda-time"><strong>{time(item.starts_at)}</strong><small>{Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60000)} min</small></span><span className="provider-mark" style={{ color: providerMeta[item.provider || 'google'].color }}>{providerMeta[item.provider || 'google'].letter}</span><div><strong>{item.candidate_name}</strong><p>{item.type || 'Interview'} · {item.job_title}</p><small>with {(item.interviewer_names || []).join(', ') || 'Hiring team'}</small></div><Button variant="secondary" size="sm" icon="video">Join</Button><IconButton icon="more" label="Interview options"/></article>)}</section>) : <StatePanel icon="calendar" title="No interviews scheduled" description="Schedule a conversation to see it in your agenda."/>}</Card>
}

function ScheduleModal({ onClose, onSubmit, existing }: { onClose: () => void; onSubmit: (value: Partial<Interview>) => void; existing: Interview[] }) {
  const candidates = useResource(api.candidates)
  const [candidateSelection, setCandidateSelection] = useState('')
  const [date, setDate] = useState(localDateInputValue)
  const [hour, setHour] = useState('14:00')
  const [duration, setDuration] = useState('60')
  const [provider, setProvider] = useState<Interview['provider']>('google')
  const [interviewType, setInterviewType] = useState('Technical interview')
  const candidateOptions = candidates.data?.items || []
  const optionKey = (id: string, jobId: string) => `${id}::${jobId}`
  useEffect(() => {
    if (!candidateOptions.length) return
    if (!candidateOptions.some(item => optionKey(item.id, item.job_id) === candidateSelection)) {
      setCandidateSelection(optionKey(candidateOptions[0].id, candidateOptions[0].job_id))
    }
  }, [candidateOptions, candidateSelection])
  const selected = candidateOptions.find(item => optionKey(item.id, item.job_id) === candidateSelection)
  const start = new Date(`${date}T${hour}:00`)
  const end = new Date(start.getTime() + Number(duration) * 60000)
  const conflicts = existing.filter(item => new Date(item.starts_at) < end && new Date(item.ends_at) > start)

  return <Modal title="Schedule interview" onClose={onClose} wide>
    <div className="schedule-modal-layout">
      <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!selected) return; onSubmit({ candidate_id: selected.id, job_id: selected.job_id, candidate_name: selected.name, job_title: selected.job_title || '', starts_at: start.toISOString(), ends_at: end.toISOString(), type: interviewType, interviewer_names: ['Nina Patel'], provider }) }}>
        <label>Candidate<select value={candidateSelection} onChange={event => setCandidateSelection(event.target.value)} disabled={!candidateOptions.length}><option value="">{candidates.loading ? 'Loading candidates…' : 'Select a candidate'}</option>{candidateOptions.map(item => <option key={optionKey(item.id, item.job_id)} value={optionKey(item.id, item.job_id)}>{item.name} · {item.job_title}</option>)}</select></label>
        <label>Interview type<select value={interviewType} onChange={event => setInterviewType(event.target.value)}><option>Recruiter screen</option><option>Technical interview</option><option>Portfolio review</option><option>Values interview</option><option>Final conversation</option></select></label>
        <div className="form-row form-row--three"><label>Date<input type="date" min={localDateInputValue()} value={date} onChange={event => setDate(event.target.value)}/></label><label>Start time<input type="time" value={hour} onChange={event => setHour(event.target.value)}/></label><label>Duration<select value={duration} onChange={event => setDuration(event.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label></div>
        <label>Interviewers<div className="input-with-chips"><span><Avatar name="Nina Patel" size="sm"/> Nina Patel <Icon name="x" size={12}/></span><input placeholder="Add interviewer…"/></div></label>
        <fieldset className="provider-options"><legend>Video conferencing</legend>{(['google','outlook','calendly'] as Interview['provider'][]).map(item => <label key={item} className={provider === item ? 'selected' : ''}><input type="radio" name="provider" value={item} checked={provider === item} onChange={() => setProvider(item)}/><span style={{ color: providerMeta[item].color }}>{providerMeta[item].letter}</span><span><strong>{providerMeta[item].label}</strong><small>Link created automatically</small></span><Icon name="check-circle" size={16}/></label>)}</fieldset>
        <div className="modal-footer"><Button variant="quiet" type="button" onClick={onClose}>Cancel</Button><Button icon="calendar" type="submit" disabled={!selected || conflicts.length > 0}>Schedule interview</Button></div>
      </form>
      <aside className="conflict-panel"><div className="conflict-panel__head"><span><Icon name="calendar" size={17}/></span><div><strong>Availability check</strong><p>{fullDate(start.toISOString())}, {time(start.toISOString())}</p></div></div>
        {conflicts.length ? <div className="conflict-warning"><Icon name="alert" size={18}/><div><strong>Scheduling conflict</strong><p>{conflicts[0].candidate_name} is already scheduled from {time(conflicts[0].starts_at)}–{time(conflicts[0].ends_at)}.</p></div></div> : <div className="availability-ok"><Icon name="check-circle" size={22}/><strong>No local conflicts</strong><p>No overlapping interviews found in this workspace.</p></div>}
        <div className="availability-person"><Avatar name="Nina Patel" size="sm"/><span><strong>Nina Patel</strong><small>Available</small></span><Badge tone={conflicts.length ? 'amber' : 'green'}>{conflicts.length ? 'Busy nearby' : 'Open'}</Badge></div>
        <div className="calendar-source"><Icon name="refresh" size={13}/> Local availability check from scheduled interviews</div>
      </aside>
    </div>
  </Modal>
}
