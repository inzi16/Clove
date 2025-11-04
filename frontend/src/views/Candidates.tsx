import { useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { shortDate, stageLabel } from '../lib/format'
import type { Candidate, Job } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, Card, DemoNotice, IconButton, ScoreRing, Skeleton, StatePanel } from '../components/UI'
import { CandidateProfile } from '../components/CandidateProfile'

const suggestedQueries = [
  'ML engineers who scaled vector search',
  'Product designers with complex B2B workflows',
  'PLG leaders with pricing experience',
]

function stageTone(stage: Candidate['stage']): 'neutral' | 'green' | 'amber' | 'blue' | 'purple' | 'red' {
  return stage === 'hired' ? 'green' : stage === 'offer' ? 'purple' : stage === 'interview' ? 'blue' : stage === 'screening' ? 'amber' : stage === 'rejected' ? 'red' : 'neutral'
}

export function Candidates() {
  const resource = useResource(api.candidates)
  const jobsResource = useResource(api.jobs)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [jobId, setJobId] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchSource, setSearchSource] = useState<'live' | 'demo'>('live')
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<'match' | 'recent' | 'name'>('match')
  const inputRef = useRef<HTMLInputElement>(null)
  const candidateKey = (candidate: Candidate) => candidate.application_id || `${candidate.id}:${candidate.job_id}`

  const baseCandidates = searchResults || resource.data?.items || []
  const candidates = useMemo(() => [...baseCandidates]
    .filter(candidate => (!jobId || candidate.job_id === jobId) && candidate.match_score >= minScore)
    .sort((a, b) => sort === 'match' ? b.match_score - a.match_score : sort === 'recent' ? new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime() : a.name.localeCompare(b.name)), [baseCandidates, jobId, minScore, sort])

  async function search(text = query) {
    const trimmed = text.trim()
    if (!trimmed) {
      setSubmittedQuery('')
      setSearchResults(null)
      inputRef.current?.focus()
      return
    }
    setQuery(trimmed)
    setSearchError('')
    setSearching(true)
    try {
      const result = await api.semanticSearch(trimmed, jobId || undefined, 40)
      setSearchResults(result.data.results)
      setSubmittedQuery(trimmed)
      setSearchSource(result.source)
    } catch (error) {
      setSearchResults([])
      setSubmittedQuery(trimmed)
      setSearchSource('live')
      setSearchError(error instanceof Error ? error.message : 'Search could not be completed.')
    } finally {
      setSearching(false)
    }
  }

  function openCandidate(candidate: Candidate) {
    const key = candidateKey(candidate)
    setSelected(candidate)
    void api.candidate(candidate.id, candidate.job_id).then(result => {
      setSelected(current => current && candidateKey(current) === key ? { ...candidate, ...result.data } : current)
    }).catch(() => { /* keep the already-rendered safe summary */ })
  }

  return <div className="candidates-page">
    {(resource.source === 'demo' || (submittedQuery && searchSource === 'demo')) && <DemoNotice error={resource.error} />}
    <section className="semantic-search-card">
      <div className="semantic-search-card__intro"><span className="ai-glyph"><Icon name="sparkles" size={20} /></span><div><p className="eyebrow">Semantic talent search</p><h2>Describe who you need</h2><p>Search by experience, outcomes, skills, or context—not just keywords.</p></div></div>
      <form className="semantic-search" onSubmit={event => { event.preventDefault(); void search() }}>
        <Icon name="search" size={20} />
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “backend engineers who built high-scale ML platforms”" aria-label="Search candidates by meaning" />
        {query && <IconButton icon="x" label="Clear search" type="button" onClick={() => { setQuery(''); setSearchResults(null); setSubmittedQuery(''); setSearchError('') }} />}
        <Button type="submit" icon="sparkles" disabled={searching}>{searching ? 'Searching…' : 'Find matches'}</Button>
      </form>
      {!submittedQuery && <div className="query-suggestions"><span>Try:</span>{suggestedQueries.map(item => <button key={item} onClick={() => void search(item)}>{item}</button>)}</div>}
      {submittedQuery && <div className="search-explanation"><span><Icon name="wand" size={15} /></span><p><strong>Ranked by meaning:</strong> experience, demonstrated outcomes, role scope, and relevant skills for “{submittedQuery}”.</p><button onClick={() => { setSubmittedQuery(''); setQuery(''); setSearchResults(null) }}>Reset</button></div>}
    </section>
    {searchError && <div className="inline-error" role="alert"><Icon name="alert" size={16}/><div><strong>Search unavailable</strong><span>{searchError}</span></div><button onClick={() => void search()}>Try again</button></div>}

    <div className="toolbar">
      <div><h2>{submittedQuery ? `${candidates.length} semantic matches` : 'All candidates'}</h2><p>{submittedQuery ? 'Ordered by contextual fit' : `${resource.data?.total || 0} people across active roles`}</p></div>
      <div className="toolbar__controls">
        <label className="select-control"><Icon name="briefcase" size={15} /><select value={jobId} onChange={event => setJobId(event.target.value)} aria-label="Filter by job"><option value="">All jobs</option>{jobsResource.data?.items.map((job: Job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select><Icon name="chevron-down" size={13} /></label>
        <button className={`filter-button ${filtersOpen || minScore > 0 ? 'active' : ''}`} onClick={() => setFiltersOpen(value => !value)}><Icon name="sliders" size={15} /> Filters {minScore > 0 && <span>1</span>}</button>
        <label className="select-control select-control--small"><select value={sort} onChange={event => setSort(event.target.value as typeof sort)} aria-label="Sort candidates"><option value="match">Best match</option><option value="recent">Most recent</option><option value="name">Name</option></select><Icon name="chevron-down" size={13} /></label>
        <Button icon="plus">Add candidate</Button>
      </div>
    </div>

    {filtersOpen && <div className="filter-drawer">
      <div><label htmlFor="score-filter">Minimum match score <strong>{minScore || 'Any'}{minScore ? '%' : ''}</strong></label><input id="score-filter" type="range" min="0" max="95" step="5" value={minScore} onChange={event => setMinScore(Number(event.target.value))} /></div>
      <div className="filter-pills"><span>Stage</span>{(['sourced','screening','interview','offer'] as Candidate['stage'][]).map(stage => <button key={stage}>{stageLabel[stage]}</button>)}</div>
      <button className="text-button" onClick={() => setMinScore(0)}>Clear all</button>
    </div>}

    {resource.loading || searching ? <CandidateListSkeleton /> : resource.error && !resource.data && !searchResults ? <StatePanel icon="alert" title="Candidates unavailable" description={resource.error} action={<Button variant="secondary" icon="refresh" onClick={() => void resource.reload()}>Try again</Button>}/> : candidates.length ? <Card className="candidate-results">
      <div className="candidate-results__header"><span>Candidate</span><span>Applied role</span><span>Stage</span><span>Match score</span><span>Applied</span><span /></div>
      {candidates.map(candidate => <article className="candidate-result" key={candidateKey(candidate)} tabIndex={0} onClick={() => openCandidate(candidate)} onKeyDown={event => event.key === 'Enter' && openCandidate(candidate)}>
        <div className="candidate-cell"><Avatar name={candidate.name} color={candidate.avatar_color} /><span><strong>{candidate.name}</strong><small>{candidate.headline}</small><span className="mobile-only muted">{candidate.job_title}</span></span></div>
        <div className="role-cell"><strong>{candidate.job_title}</strong><small><Icon name="map-pin" size={12} /> {candidate.location}</small></div>
        <div><Badge tone={stageTone(candidate.stage)} dot>{stageLabel[candidate.stage]}</Badge></div>
        <div className="match-cell"><ScoreRing score={candidate.match_score} size={46} /><span><strong>{candidate.match_score >= 90 ? 'Exceptional' : candidate.match_score >= 80 ? 'Strong' : 'Potential'} fit</strong><small>{candidate.match_reasons?.[0] || 'Relevant experience'}</small></span></div>
        <span className="date-cell">{shortDate(candidate.applied_at)}</span>
        <IconButton icon="more" label={`Actions for ${candidate.name}`} onClick={event => event.stopPropagation()} />
      </article>)}
    </Card> : <StatePanel icon="search" title="No candidates match these filters" description="Try broadening your search or lowering the minimum match score." action={<Button variant="secondary" onClick={() => { setMinScore(0); setJobId(''); setQuery(''); setSubmittedQuery(''); setSearchResults(null) }}>Clear filters</Button>} />}
    {selected && <CandidateProfile candidate={selected} onClose={() => setSelected(null)} />}
  </div>
}

function CandidateListSkeleton() {
  return <Card className="candidate-results"><div className="candidate-results__header"><span>Candidate</span><span>Applied role</span><span>Stage</span><span>Match score</span><span>Applied</span><span /></div>{[1,2,3,4,5].map(item => <div className="candidate-result" key={item}><div className="candidate-cell"><Skeleton className="sk-avatar" /><span><Skeleton className="sk-line" /><Skeleton className="sk-line sk-line--short" /></span></div><Skeleton className="sk-line"/><Skeleton className="sk-pill"/><Skeleton className="sk-score"/></div>)}</Card>
}
