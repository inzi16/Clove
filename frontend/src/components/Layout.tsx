import { useEffect, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { Avatar, Button, IconButton } from './UI'
import { api } from '../lib/api'
import { useResource } from '../hooks/useResource'

export type RouteName = 'overview' | 'candidates' | 'pipeline' | 'jobs' | 'interviews' | 'settings'

const navItems: { id: RouteName; label: string; icon: IconName; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'candidates', label: 'Candidates', icon: 'users' },
  { id: 'pipeline', label: 'Pipeline', icon: 'layers' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { id: 'interviews', label: 'Interviews', icon: 'calendar' },
]

const pageMeta: Record<RouteName, { eyebrow: string; title: string }> = {
  overview: { eyebrow: 'Monday, August 17', title: 'Good morning, Nina' },
  candidates: { eyebrow: 'Talent intelligence', title: 'Candidates' },
  pipeline: { eyebrow: 'All active roles', title: 'Hiring pipeline' },
  jobs: { eyebrow: 'Workspace', title: 'Jobs' },
  interviews: { eyebrow: 'Calendar', title: 'Interviews' },
  settings: { eyebrow: 'Northstar Labs', title: 'Settings' },
}

export function navigate(route: string) {
  window.location.hash = route.startsWith('/') ? route : `/${route}`
}

export function Layout({ route, children, headerActions, hideHeader = false }: { route: RouteName; children: ReactNode; headerActions?: ReactNode; hideHeader?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [orgOpen, setOrgOpen] = useState(false)
  const dashboard = useResource(api.dashboard)
  const jobs = useResource(api.jobs)
  const billing = useResource(api.billing)
  const meta = pageMeta[route]
  const aiUsage = billing.data?.usage?.find(item => item.label.toLowerCase().includes('ai'))
  const aiLimit = aiUsage?.limit
  const aiPercent = aiUsage && aiLimit && aiLimit > 0 ? Math.min(100, aiUsage.used / aiLimit * 100) : 0
  const navBadge = (id: RouteName) => id === 'candidates'
    ? dashboard.data?.metrics?.total_candidates
    : id === 'jobs' ? jobs.data?.items.filter(job => job.status === 'active').length : undefined

  useEffect(() => setMobileOpen(false), [route])

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="brand" onClick={() => navigate('overview')} role="link" tabIndex={0} onKeyDown={event => event.key === 'Enter' && navigate('overview')}>
        <span className="brand__mark"><span /><span /><span /></span>
        <span className="brand__word">clove</span>
      </div>

      <div className="org-switcher-wrap">
        <button className="org-switcher" onClick={() => setOrgOpen(value => !value)} aria-expanded={orgOpen}>
          <span className="org-switcher__logo">N</span>
          <span><strong>Northstar Labs</strong><small>{billing.data ? `${billing.data.plan} plan` : 'Workspace'}</small></span>
          <Icon name="chevron-down" size={15} />
        </button>
        {orgOpen && <div className="org-menu">
          <button><span className="org-switcher__logo">N</span><span><strong>Northstar Labs</strong><small>Current workspace</small></span><Icon name="check" size={15} /></button>
          <button onClick={() => navigate('settings')}><Icon name="plus" size={16} /><span><strong>Create workspace</strong><small>Start something new</small></span></button>
        </div>}
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map(item => <button key={item.id} className={route === item.id ? 'active' : ''} onClick={() => navigate(item.id)} aria-current={route === item.id ? 'page' : undefined}>
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
          {navBadge(item.id) !== undefined && <small>{navBadge(item.id)}</small>}
        </button>)}
        <p className="nav-label nav-label--second">Manage</p>
        <button className={route === 'settings' ? 'active' : ''} onClick={() => navigate('settings')} aria-current={route === 'settings' ? 'page' : undefined}><Icon name="settings" size={18} /><span>Settings</span></button>
      </nav>

      <div className="sidebar__spacer" />
      {aiUsage && <div className="search-credit">
        <div><span><Icon name="sparkles" size={14} /> AI searches</span><strong>{aiUsage.used.toLocaleString()} <small>{aiLimit ? `/ ${aiLimit.toLocaleString()}` : '/ Unlimited'}</small></strong></div>
        <span className="meter"><i style={{ width: aiLimit ? `${aiPercent}%` : '100%' }} /></span>
        <button onClick={() => navigate('settings')}>View usage <Icon name="arrow-right" size={13} /></button>
      </div>}
      <button className="profile-button">
        <Avatar name="Nina Patel" size="sm" color="#e3c89e" />
        <span><strong>Nina Patel</strong><small>Workspace admin</small></span>
        <Icon name="more" size={17} />
      </button>
    </aside>

    <main className="main-area">
      <div className="mobile-topbar">
        <IconButton icon="menu" label="Open navigation" onClick={() => setMobileOpen(true)} />
        <span className="brand brand--mobile"><span className="brand__mark"><span /><span /><span /></span><span className="brand__word">clove</span></span>
        <IconButton icon="bell" label="Notifications" />
      </div>
      {!hideHeader && <header className="page-header">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1>{meta.title}</h1>
        </div>
        <div className="page-header__actions">
          <button className="command-search" onClick={() => navigate('candidates')}><Icon name="search" size={16} /><span>Search anything</span><kbd>⌘ K</kbd></button>
          <IconButton icon="bell" label="Notifications" className="notification-button" />
          {headerActions}
        </div>
      </header>}
      <div className={`page-content ${hideHeader ? 'page-content--full' : ''}`}>{children}</div>
    </main>
  </div>
}

export function PageHeaderAction({ onClick, children, icon = 'plus' }: { onClick?: () => void; children: ReactNode; icon?: IconName }) {
  return <Button icon={icon} onClick={onClick}>{children}</Button>
}
