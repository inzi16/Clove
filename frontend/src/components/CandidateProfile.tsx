import type { Candidate } from '../types'
import { stageLabel } from '../lib/format'
import { Avatar, Badge, Button, Divider, Modal, ScoreRing } from './UI'
import { Icon } from './Icon'

const breakdownMeta = {
  semantic: { label: 'Role alignment', hint: 'Resume and role meaning overlap' },
  skills: { label: 'Skills match', hint: 'Required and adjacent capabilities' },
  experience: { label: 'Experience', hint: 'Scope, tenure and seniority' },
  location: { label: 'Location', hint: 'Workplace and timezone fit' },
}

export function CandidateProfile({ candidate, onClose, onAdvance }: { candidate: Candidate; onClose: () => void; onAdvance?: () => void }) {
  return <Modal title="Candidate profile" onClose={onClose} wide>
    <div className="candidate-profile__hero">
      <Avatar name={candidate.name} color={candidate.avatar_color} size="lg" />
      <div className="candidate-profile__identity">
        <div><h3>{candidate.name}</h3><Badge tone="green">{stageLabel[candidate.stage]}</Badge></div>
        <p>{candidate.headline}</p>
        <span><Icon name="map-pin" size={14} /> {candidate.location} · {candidate.experience_years} years experience</span>
      </div>
      <ScoreRing score={candidate.match_score} size={66} />
    </div>
    <div className="candidate-profile__actions">
      <Button variant="secondary" icon="mail">Email</Button>
      <Button variant="secondary" icon="calendar">Schedule</Button>
      <Button icon="arrow-right" onClick={onAdvance}>Advance candidate</Button>
    </div>
    <Divider />
    <div className="candidate-profile__grid">
      <section>
        <p className="section-kicker"><Icon name="sparkles" size={15} /> AI match summary</p>
        <p className="profile-summary">{candidate.summary || `${candidate.name}'s background closely aligns with the core requirements for ${candidate.job_title}.`}</p>
        <div className="reason-list">
          {(candidate.match_reasons || ['Strong experience alignment', 'Relevant technical capabilities', 'Good seniority match']).map(reason => <div key={reason}><span><Icon name="check" size={12} /></span>{reason}</div>)}
        </div>
        <h4>Career highlights</h4>
        <ul className="highlight-list">{(candidate.highlights || ['Demonstrated impact in a closely related role', 'Experience shipping work in high-growth teams']).map(item => <li key={item}>{item}</li>)}</ul>
        <h4>Skills</h4>
        <div className="chip-list">{candidate.skills.map(skill => <span className="chip" key={skill}>{skill}</span>)}</div>
      </section>
      <aside className="score-explanation">
        <div className="score-explanation__header"><div><p>Match score</p><strong>{candidate.match_score}%</strong></div><span><Icon name="info" size={14} /> How this works</span></div>
        {(Object.keys(breakdownMeta) as (keyof typeof breakdownMeta)[]).map(key => {
          const value = candidate.score_breakdown?.[key] ?? candidate.match_score
          const meta = breakdownMeta[key]
          return <div className="score-factor" key={key}>
            <div><span>{meta.label}</span><strong>{value}%</strong></div>
            <span className="score-factor__bar"><i style={{ width: `${value}%` }} /></span>
            <small>{meta.hint}</small>
          </div>
        })}
        <p className="score-disclaimer"><Icon name="shield" size={15} /> Scores support—not replace—human judgment. Protected characteristics are never used.</p>
      </aside>
    </div>
  </Modal>
}
