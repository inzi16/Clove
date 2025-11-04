import type { SVGProps } from 'react'

export type IconName = 'grid' | 'users' | 'layers' | 'briefcase' | 'calendar' | 'settings' | 'search' | 'plus' | 'bell' | 'chevron-down' | 'chevron-right' | 'arrow-up' | 'arrow-right' | 'sparkles' | 'clock' | 'map-pin' | 'more' | 'filter' | 'sliders' | 'check' | 'x' | 'mail' | 'external' | 'video' | 'link' | 'credit-card' | 'shield' | 'building' | 'user' | 'logout' | 'menu' | 'grip' | 'list' | 'kanban' | 'refresh' | 'info' | 'wand' | 'target' | 'trend' | 'download' | 'copy' | 'edit' | 'globe' | 'lock' | 'help' | 'check-circle' | 'alert' | 'chart'

const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.08A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.08A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,
  'chevron-down': <path d="m6 9 6 6 6-6"/>, 'chevron-right': <path d="m9 18 6-6-6-6"/>,
  'arrow-up': <><path d="m18 15-6-6-6 6"/><path d="M12 9v12"/></>, 'arrow-right': <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  sparkles: <><path d="m12 3-1.2 3.1a3 3 0 0 1-1.7 1.7L6 9l3.1 1.2a3 3 0 0 1 1.7 1.7L12 15l1.2-3.1a3 3 0 0 1 1.7-1.7L18 9l-3.1-1.2a3 3 0 0 1-1.7-1.7L12 3Z"/><path d="m5 15-.7 1.8a2 2 0 0 1-1.1 1.1L1.5 18.5l1.7.7a2 2 0 0 1 1.1 1.1L5 22l.7-1.7a2 2 0 0 1 1.1-1.1l1.7-.7-1.7-.6a2 2 0 0 1-1.1-1.1L5 15Z"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, 'map-pin': <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/>, sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  check: <path d="m5 12 4 4L19 6"/>, x: <path d="M18 6 6 18M6 6l12 12"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>, external: <><path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></>, link: <><path d="M10 13a5 5 0 0 0 7.07.07l2-2A5 5 0 0 0 12 4l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/></>,
  'credit-card': <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>, shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  building: <><path d="M3 21h18M6 21V4h12v17M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></>, user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, grip: <><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></>, kanban: <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2L20 12M4 12l2.4 5a7 7 0 0 0 11.5-2"/></>, info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  wand: <><path d="m15 4 5 5L7 22l-5-5L15 4Z"/><path d="m14 5 5 5M6 3v4M4 5h4M19 15v4M17 17h4"/></>, target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>, trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>, copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></>, edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>, lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>, help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1 .8-1.6 1.2-1.6 2.6M12 17h.01"/></>,
  'check-circle': <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>, alert: <><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>, chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
}

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
