import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { stageLabel } from '../lib/format'
import type { Candidate, CandidateStage } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, DemoNotice, IconButton, ScoreRing, Skeleton, StatePanel } from '../components/UI'

const stages: CandidateStage[] = ['sourced', 'screening', 'interview', 'offer', 'hired']
const stageMeta: Record<CandidateStage, { color: string; description: string }> = {
  sourced: { color: '#9ba8a2', description: 'New and discovered' },
  screening: { color: '#d29a4b', description: 'Recruiter review' },
  interview: { color: '#5d8ba1', description: 'Meeting the team' },
  offer: { color: '#866ca5', description: 'Decision & close' },
  hired: { color: '#4d8a70', description: 'Joined the team' },
  rejected: { color: '#a66a68', description: 'Not moving forward' },
}

type Toast = { message: string; candidate?: Candidate; previous?: CandidateStage }
const candidateKey = (candidate: Candidate) => candidate.application_id || `${candidate.id}:${candidate.job_id}`

export function Pipeline() {
  const resource = useResource(api.candidates)
  const jobs = useResource(api.jobs)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [jobId, setJobId] = useState('')
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<CandidateStage | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [view, setView] = useState<'board' | 'list'>('board')

  const items = candidates || resource.data?.items || []
  const visible = useMemo(() => items.filter(candidate => !jobId || candidate.job_id === jobId), [items, jobId])

  async function moveCandidate(candidate: Candidate, stage: CandidateStage) {
    if (candidate.stage === stage) return
    const previous = candidate.stage
    const key = candidateKey(candidate)
    const updated = items.map(item => candidateKey(item) === key ? { ...item, stage } : item)
    setCandidates(updated)
    setToast({ message: `${candidate.name} moved to ${stageLabel[stage]}`, candidate, previous })
    if (resource.source === 'demo') {
      setToast({ message: `${candidate.name} moved in this demo workspace`, candidate, previous })
      return
    }
    try {
      await api.updateStage(candidate.id, stage, candidate.job_id)
    } catch (error) {
      setCandidates(current => (current || updated).map(item => candidateKey(item) === key ? { ...item, stage: previous } : item))
      const detail = error instanceof Error ? error.message : 'The API rejected this change.'
      setToast({ message: `Could not move ${candidate.name}: ${detail}` })
    }
  }

  function undo() {
    if (toast?.candidate && toast.previous) {
      const current = items.find(item => candidateKey(item) === candidateKey(toast.candidate!)) || toast.candidate
      void moveCandidate(current, toast.previous)
    }
    setToast(null)
  }

  if (resource.loading) return <PipelineSkeleton />
  if (resource.error && !resource.data) return <StatePanel icon="alert" title="Pipeline unavailable" description={resource.error} action={<Button variant="secondary" icon="refresh" onClick={() => void resource.reload()}>Try again</Button>} />
  if (!items.length) return <StatePanel icon="layers" title="Your pipeline is ready" description="Add candidates to begin moving them through your hiring process." action={<Button icon="plus">Add candidate</Button>} />

  return <div className="pipeline-page">
    {resource.source === 'demo' && <DemoNotice error={resource.error} />}
    <div className="pipeline-toolbar">
      <div className="pipeline-toolbar__left">
        <label className="select-control select-control--job"><Icon name="briefcase" size={15} /><select value={jobId} onChange={event => setJobId(event.target.value)} aria-label="Select job"><option value="">All active jobs</option>{jobs.data?.items.filter(job => job.status === 'active').map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select><Icon name="chevron-down" size={13} /></label>
        <span className="toolbar-separator" />
        <span className="candidate-count"><strong>{visible.length}</strong> candidates</span>
      </div>
      <div className="pipeline-toolbar__right">
        <div className="segmented-control" aria-label="Pipeline view"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')} aria-label="Board view"><Icon name="kanban" size={16} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><Icon name="list" size={16} /></button></div>
        <Button variant="secondary" icon="sliders">Customize</Button>
        <Button icon="plus">Add candidate</Button>
      </div>
    </div>

    {view === 'board' ? <div className="kanban-board" aria-label="Candidate pipeline">
      {stages.map(stage => {
        const stageCandidates = visible.filter(candidate => candidate.stage === stage)
        return <section
          className={`kanban-column ${dragOver === stage ? 'kanban-column--over' : ''}`}
          key={stage}
          onDragOver={event => { event.preventDefault(); setDragOver(stage) }}
          onDragLeave={() => setDragOver(null)}
          onDrop={event => { event.preventDefault(); const key = event.dataTransfer.getData('text/plain') || draggedKey; const candidate = items.find(item => candidateKey(item) === key); if (candidate) void moveCandidate(candidate, stage); setDraggedKey(null); setDragOver(null) }}
          aria-labelledby={`stage-${stage}`}
        >
          <header className="kanban-column__header">
            <div><span className="stage-dot" style={{ background: stageMeta[stage].color }} /><h2 id={`stage-${stage}`}>{stageLabel[stage]}</h2><small>{stageCandidates.length}</small></div>
            <IconButton icon="more" label={`${stageLabel[stage]} options`} />
          </header>
          <p className="kanban-column__description">{stageMeta[stage].description}</p>
          <div className="kanban-cards">
            {stageCandidates.map(candidate => <article
              className="kanban-card" key={candidateKey(candidate)} draggable
              onDragStart={event => { const key = candidateKey(candidate); setDraggedKey(key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key) }}
              onDragEnd={() => { setDraggedKey(null); setDragOver(null) }}
            >
              <div className="kanban-card__grip"><Icon name="grip" size={15} /><IconButton icon="more" label={`Actions for ${candidate.name}`} /></div>
              <div className="kanban-card__person"><Avatar name={candidate.name} color={candidate.avatar_color} size="sm" /><div><strong>{candidate.name}</strong><span>{candidate.headline}</span></div></div>
              <div className="kanban-card__role"><Icon name="briefcase" size={13} /><span>{candidate.job_title}</span></div>
              <div className="chip-list chip-list--small">{candidate.skills.slice(0, 2).map(skill => <span className="chip" key={skill}>{skill}</span>)}</div>
              <div className="kanban-card__footer"><div><ScoreRing score={candidate.match_score} size={39} /><span><strong>{candidate.match_score}%</strong><small>match</small></span></div><div className="card-move-actions">
                {stages.indexOf(stage) > 0 && <IconButton icon="chevron-right" label={`Move ${candidate.name} back`} className="move-back" onClick={() => void moveCandidate(candidate, stages[stages.indexOf(stage) - 1])} />}
                {stages.indexOf(stage) < stages.length - 1 && <IconButton icon="arrow-right" label={`Move ${candidate.name} to ${stageLabel[stages[stages.indexOf(stage) + 1]]}`} onClick={() => void moveCandidate(candidate, stages[stages.indexOf(stage) + 1])} />}
              </div></div>
            </article>)}
            {!stageCandidates.length && <div className="kanban-empty"><Icon name="plus" size={16} /><span>Drop candidates here</span></div>}
          </div>
        </section>
      })}
    </div> : <div className="pipeline-list">
      {visible.map(candidate => <article key={candidateKey(candidate)}><div className="candidate-cell"><Avatar name={candidate.name} color={candidate.avatar_color} size="sm" /><span><strong>{candidate.name}</strong><small>{candidate.headline}</small></span></div><span>{candidate.job_title}</span><Badge>{stageLabel[candidate.stage]}</Badge><ScoreRing score={candidate.match_score} size={41}/><label className="select-control select-control--small"><select value={candidate.stage} onChange={event => void moveCandidate(candidate, event.target.value as CandidateStage)}>{stages.map(stage => <option key={stage} value={stage}>{stageLabel[stage]}</option>)}</select><Icon name="chevron-down" size={12}/></label></article>)}
    </div>}

    <div className="pipeline-legend"><span><Icon name="info" size={14} /> Drag candidates between stages, or use the arrow actions on each card.</span><span>{visible.filter(candidate => candidate.stage === 'rejected').length} archived candidates</span></div>
    {toast && <div className="toast" role="status"><span><Icon name={toast.message.startsWith('Could') ? 'alert' : 'check-circle'} size={17} />{toast.message}</span>{toast.candidate && <button onClick={undo}>Undo</button>}<IconButton icon="x" label="Dismiss" onClick={() => setToast(null)} /></div>}
  </div>
}

function PipelineSkeleton() {
  return <div className="pipeline-page"><Skeleton className="sk-toolbar"/><div className="kanban-board">{stages.map(stage => <section className="kanban-column" key={stage}><Skeleton className="sk-heading"/>{[1,2].map(item => <Skeleton key={item} className="sk-kanban-card"/>)}</section>)}</div></div>
}
