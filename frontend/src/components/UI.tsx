import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md'; icon?: IconName }) {
  return <button className={`button button--${variant} button--${size} ${className}`} {...props}>{icon && <Icon name={icon} size={16} />}<span>{children}</span></button>
}

export function IconButton({ icon, label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}><Icon name={icon} /></button>
}

export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple'; dot?: boolean }) {
  return <span className={`badge badge--${tone}`}>{dot && <span className="badge__dot" />}{children}</span>
}

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
  return <span className={`avatar avatar--${size}`} style={{ backgroundColor: color || '#dce6df' }} aria-hidden="true">{initials}</span>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function StatePanel({ icon = 'search', title, description, action }: { icon?: IconName; title: string; description: string; action?: ReactNode }) {
  return <div className="state-panel"><span className="state-panel__icon"><Icon name={icon} size={22} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function DemoNotice({ error }: { error?: string }) {
  return <div className="demo-notice" role="status"><Icon name="info" size={15} /><span><strong>Demo workspace</strong> · Showing realistic sample data while the API is unavailable.</span>{error && <span className="demo-notice__detail">{error}</span>}</div>
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference
  return <div className="score-ring" style={{ width: size, height: size }} aria-label={`${score}% match`}>
    <svg viewBox="0 0 44 44" role="img"><circle className="score-ring__track" cx="22" cy="22" r={radius} /><circle className="score-ring__value" cx="22" cy="22" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
    <strong>{score}</strong>
  </div>
}

export function Divider() { return <div className="divider" /> }

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal__header"><h2 id="modal-title">{title}</h2><IconButton icon="x" label="Close" onClick={onClose} /></header>
      <div className="modal__body">{children}</div>
    </section>
  </div>
}
