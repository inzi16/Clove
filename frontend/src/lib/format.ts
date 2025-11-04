import type { CandidateStage } from '../types'

export const stageLabel: Record<CandidateStage, string> = {
  sourced: 'Sourced', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected',
}

export function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function fullDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(value))
}

export function time(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function currency(value: number, code = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value)
}
