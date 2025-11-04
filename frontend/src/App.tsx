import { useEffect, useMemo, useState } from 'react'
import { Layout, PageHeaderAction, navigate, type RouteName } from './components/Layout'
import { Overview } from './views/Overview'
import { Candidates } from './views/Candidates'
import { Pipeline } from './views/Pipeline'
import { Jobs } from './views/Jobs'
import { Interviews } from './views/Interviews'
import { Settings } from './views/Settings'

function parseHash() {
  const value = window.location.hash.replace(/^#\/?/, '') || 'overview'
  const [page, id] = value.split('/')
  const valid: RouteName[] = ['overview', 'candidates', 'pipeline', 'jobs', 'interviews', 'settings']
  return { route: valid.includes(page as RouteName) ? page as RouteName : 'overview', id }
}

export default function App() {
  const [location, setLocation] = useState(parseHash)

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/overview')
    const onChange = () => setLocation(parseHash())
    window.addEventListener('hashchange', onChange)
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('candidates')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('hashchange', onChange); window.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => {
    const titles: Record<RouteName, string> = { overview: 'Overview', candidates: 'Candidates', pipeline: 'Pipeline', jobs: 'Jobs', interviews: 'Interviews', settings: 'Settings' }
    document.title = `${titles[location.route]} — Clove`
    document.querySelector('.main-area')?.scrollTo({ top: 0 })
  }, [location])

  const content = useMemo(() => {
    switch (location.route) {
      case 'candidates': return <Candidates />
      case 'pipeline': return <Pipeline />
      case 'jobs': return <Jobs jobId={location.id} />
      case 'interviews': return <Interviews />
      case 'settings': return <Settings />
      default: return <Overview />
    }
  }, [location])

  const headerAction = location.route === 'overview' ? <PageHeaderAction onClick={() => navigate('jobs')}>Create job</PageHeaderAction> : undefined
  const hideHeader = location.route === 'jobs' && Boolean(location.id)
  return <Layout route={location.route} headerActions={headerAction} hideHeader={hideHeader}>{content}</Layout>
}
