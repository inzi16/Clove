import { useState } from 'react'
import { api, apiBaseUrl } from '../lib/api'
import { useResource } from '../hooks/useResource'
import { currency, fullDate } from '../lib/format'
import type { Integration } from '../types'
import { Icon, type IconName } from '../components/Icon'
import { Avatar, Badge, Button, Card, DemoNotice, IconButton, Skeleton, StatePanel } from '../components/UI'

type SettingsTab = 'workspace' | 'team' | 'integrations' | 'billing' | 'security'

const tabs: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: 'workspace', label: 'Workspace', icon: 'building' }, { id: 'team', label: 'Team & access', icon: 'users' },
  { id: 'integrations', label: 'Integrations', icon: 'link' }, { id: 'billing', label: 'Billing & usage', icon: 'credit-card' },
  { id: 'security', label: 'Authentication', icon: 'shield' },
]

export function Settings() {
  const [tab, setTab] = useState<SettingsTab>('workspace')
  return <div className="settings-layout">
    <nav className="settings-nav" aria-label="Settings sections"><p>Settings</p>{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon name={item.icon} size={17}/><span>{item.label}</span><Icon name="chevron-right" size={14}/></button>)}</nav>
    <div className="settings-content">
      {tab === 'workspace' && <WorkspaceSettings/>}
      {tab === 'team' && <TeamSettings/>}
      {tab === 'integrations' && <IntegrationSettings/>}
      {tab === 'billing' && <BillingSettings/>}
      {tab === 'security' && <SecuritySettings/>}
    </div>
  </div>
}

function SettingsTitle({ title, description }: { title: string; description: string }) {
  return <header className="settings-title"><h2>{title}</h2><p>{description}</p></header>
}

function WorkspaceSettings() {
  const [saved, setSaved] = useState(false)
  return <><SettingsTitle title="Workspace" description="Manage how your organization appears across Clove."/><Card className="settings-card"><h3>Organization profile</h3><p>These details are visible to members of your workspace.</p><div className="workspace-logo-row"><span className="workspace-logo">N</span><div><Button variant="secondary" size="sm">Change logo</Button><small>PNG, JPG or SVG. 2MB max.</small></div></div><div className="form-grid"><label>Organization name<input defaultValue="Northstar Labs"/></label><label>Company website<input defaultValue="https://northstar.io"/></label><label>Company size<select defaultValue="51–200"><option>1–10</option><option>11–50</option><option>51–200</option><option>201–500</option></select></label><label>Default timezone<select defaultValue="America/Los_Angeles"><option value="America/Los_Angeles">Pacific Time (US)</option><option value="America/New_York">Eastern Time (US)</option><option value="Europe/London">London</option></select></label></div><div className="settings-card__footer"><span>{saved && <><Icon name="check-circle" size={14}/> Changes saved</>}</span><Button onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2500) }}>Save changes</Button></div></Card>
    <Card className="settings-card"><h3>Hiring preferences</h3><p>Set workspace defaults for new jobs and candidate workflows.</p><div className="setting-row"><div><strong>Default candidate visibility</strong><p>Who can see newly added candidates</p></div><select><option>Everyone in workspace</option><option>Hiring team only</option><option>Admins only</option></select></div><div className="setting-row"><div><strong>AI match explanations</strong><p>Show score factors and evidence on candidate profiles</p></div><label className="switch"><input type="checkbox" defaultChecked/><span/></label></div><div className="setting-row"><div><strong>Automatic duplicate detection</strong><p>Flag candidate records that likely refer to the same person</p></div><label className="switch"><input type="checkbox" defaultChecked/><span/></label></div></Card>
    <Card className="settings-card danger-zone"><h3>Danger zone</h3><div><span><strong>Delete workspace</strong><p>Permanently delete Northstar Labs and all associated data.</p></span><Button variant="danger" size="sm">Delete workspace</Button></div></Card></>
}

const demoMembers = [
  { name: 'Nina Patel', email: 'nina@northstar.io', role: 'Admin', color: '#e3c89e', status: 'Active' },
  { name: 'Owen Park', email: 'owen@northstar.io', role: 'Member', color: '#d9dff1', status: 'Active' },
  { name: 'Alex Kim', email: 'alex@northstar.io', role: 'Member', color: '#efd9ca', status: 'Active' },
  { name: 'Sam Rivera', email: 'sam@northstar.io', role: 'Hiring manager', color: '#d4e2d8', status: 'Active' },
  { name: 'Jamie Wu', email: 'jamie@northstar.io', role: 'Member', color: '#e4d9e9', status: 'Invited' },
]

function TeamSettings() {
  const [members, setMembers] = useState(demoMembers)
  const [search, setSearch] = useState('')
  return <><SettingsTitle title="Team & access" description="Invite teammates and manage what they can do."/><div className="settings-toolbar"><label className="settings-search"><Icon name="search" size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search members…"/></label><Button icon="plus" onClick={() => setMembers([...members, { name: 'New teammate', email: 'invited@northstar.io', role: 'Member', color: '#dce5df', status: 'Invited' }])}>Invite member</Button></div><Card className="members-table"><div className="members-table__head"><span>Member</span><span>Role</span><span>Status</span><span/></div>{members.filter(member => `${member.name} ${member.email}`.toLowerCase().includes(search.toLowerCase())).map(member => <div className="member-row" key={member.email}><div className="candidate-cell"><Avatar name={member.name} color={member.color} size="sm"/><span><strong>{member.name}</strong><small>{member.email}</small></span></div><label className="select-control select-control--small"><select defaultValue={member.role}><option>Admin</option><option>Member</option><option>Hiring manager</option></select><Icon name="chevron-down" size={12}/></label><Badge tone={member.status === 'Active' ? 'green' : 'amber'} dot>{member.status}</Badge><IconButton icon="more" label={`Actions for ${member.name}`}/></div>)}</Card><Card className="settings-card"><div className="plan-seat-row"><span><Icon name="users"/><span><strong>8 of 12 seats used</strong><p>Four seats are still available on your Scale plan.</p></span></span><Button variant="secondary" size="sm">Manage seats</Button></div><span className="usage-bar"><i style={{ width: '66.7%' }}/></span></Card></>
}

function IntegrationSettings() {
  const resource = useResource(api.integrations)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<'all' | 'connected'>('all')
  const integrations = (resource.data?.items || []).filter(item => filter === 'all' || (overrides[item.id] ?? item.connected))
  const isConnected = (item: Integration) => overrides[item.id] ?? item.connected
  return <><SettingsTitle title="Integrations" description="Connect the tools your hiring team already uses."/>{resource.source === 'demo' && <DemoNotice error={resource.error}/>}<div className="integration-summary"><span><Icon name="check-circle"/> <strong>{(resource.data?.items || []).filter(isConnected).length} connected</strong></span><div className="tabs tabs--compact"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'connected' ? 'active' : ''} onClick={() => setFilter('connected')}>Connected</button></div></div>{resource.loading ? <div className="integration-grid"><Skeleton className="sk-integration"/><Skeleton className="sk-integration"/></div> : resource.error && !resource.data ? <StatePanel icon="alert" title="Integrations unavailable" description={resource.error} action={<Button variant="secondary" icon="refresh" onClick={() => void resource.reload()}>Try again</Button>}/> : <div className="integration-grid">{integrations.map(item => <Card className="integration-card" key={item.id}><span className="integration-logo" style={{ background: `${item.color || '#466b5e'}12`, color: item.color || '#466b5e' }}>{item.initials || item.name.slice(0, 2)}</span><div><h3>{item.name}</h3><Badge>{item.category || 'Integration'}</Badge><p>{item.description || 'Connect this app to your recruiting workspace.'}</p>{isConnected(item) && <span className="connected-account"><Icon name="check-circle" size={14}/>{item.account || 'Connected'}</span>}</div><Button variant={isConnected(item) ? 'quiet' : 'secondary'} size="sm" onClick={() => setOverrides({ ...overrides, [item.id]: !isConnected(item) })}>{isConnected(item) ? 'Manage' : 'Connect'}</Button></Card>)}</div>}<Card className="integration-callout"><span><Icon name="wand" size={22}/></span><div><strong>Need another integration?</strong><p>Tell us which tool would make your recruiting flow smoother.</p></div><Button variant="secondary" size="sm">Request integration</Button></Card></>
}

function BillingSettings() {
  const resource = useResource(api.billing)
  const billing = resource.data
  return <><SettingsTitle title="Billing & usage" description="Manage your subscription, seats, and AI usage."/>{resource.source === 'demo' && <DemoNotice error={resource.error}/>} {resource.loading ? <Skeleton className="sk-billing"/> : !billing ? <StatePanel icon="alert" title="Billing unavailable" description={resource.error || 'Billing details could not be loaded.'} action={<Button variant="secondary" icon="refresh" onClick={() => void resource.reload()}>Try again</Button>}/> : <>
    <Card className="plan-card"><div><span className="plan-icon"><Icon name="sparkles"/></span><span><p>Current plan</p><h3>{billing.plan}</h3><Badge tone="green" dot>{billing.status}</Badge></span></div><div className="plan-price"><strong>{currency(billing.amount / 100, billing.currency)}</strong><span>/{billing.interval}</span><p>{billing.renewal_at ? `Renews ${fullDate(billing.renewal_at)}` : 'No renewal date'}</p></div><div className="plan-actions"><Button variant="secondary">Manage plan</Button><Button>Upgrade</Button></div></Card>
    <Card className="settings-card usage-section"><div className="panel-header"><div><h3>Usage this month</h3><p>Usage resets on your billing date.</p></div><span>Aug 1–31</span></div><div className="usage-grid">{billing.usage.map(item => { const limit = item.limit; const unlimited = limit == null || limit <= 0; const percent = unlimited ? 0 : Math.min(100, item.used / limit! * 100); return <div key={item.label}><div><span>{item.label}</span><strong>{item.used.toLocaleString()} <small>{unlimited ? '/ Unlimited' : `/ ${limit!.toLocaleString()}`}</small></strong></div><span className={`usage-bar ${unlimited ? 'usage-bar--unlimited' : ''}`}><i className={percent > 85 ? 'warning' : ''} style={{ width: unlimited ? '100%' : `${percent}%` }}/></span><small>{unlimited ? 'Unlimited' : `${Math.round(percent)}% used`}</small></div>})}</div></Card>
    <div className="billing-grid"><Card className="settings-card"><h3>Payment method</h3><div className="payment-method"><span><Icon name="credit-card"/></span><div><strong>Visa ending in 4242</strong><small>Expires 08/29</small></div><Badge>Default</Badge></div><button className="text-button">Update payment method</button></Card><Card className="settings-card"><h3>Billing contact</h3><div className="billing-contact"><Icon name="mail"/><span><strong>billing@northstar.io</strong><small>Invoices and receipts</small></span></div><button className="text-button">Edit billing details</button></Card></div>
    <Card className="settings-card invoices"><div className="panel-header"><div><h3>Invoices</h3><p>Download receipts for your records.</p></div></div>{['August 1, 2026','July 1, 2026','June 1, 2026'].map(date => <div key={date}><span><Icon name="credit-card" size={15}/><span><strong>{date}</strong><small>{billing.plan} plan · Monthly</small></span></span><strong>{currency(billing.amount / 100, billing.currency)}</strong><Badge tone="green">Paid</Badge><IconButton icon="download" label={`Download invoice for ${date}`}/></div>)}</Card>
  </>}</>
}

function SecuritySettings() {
  return <><SettingsTitle title="Authentication" description="Configure sign-in methods and protect your workspace."/><Card className="settings-card"><h3>Single sign-on</h3><p>Let team members sign in using your organization identity provider.</p><div className="auth-provider"><span className="auth-logo auth-logo--google">G</span><div><strong>Google OAuth</strong><p>Anyone with an @northstar.io account can request access.</p></div><Badge tone="green" dot>Enabled</Badge><Button variant="secondary" size="sm">Configure</Button></div><div className="auth-provider"><span className="auth-logo auth-logo--azure">A</span><div><strong>Microsoft Entra ID</strong><p>Provision members through your Azure organization.</p></div><Badge>Not configured</Badge><Button variant="secondary" size="sm">Set up</Button></div></Card><Card className="settings-card"><h3>Organization provisioning</h3><p>Control what happens when a new team member signs in for the first time.</p><div className="setting-row"><div><strong>Automatic workspace association</strong><p>Match verified email domains to Northstar Labs</p></div><label className="switch"><input type="checkbox" defaultChecked/><span/></label></div><div className="domain-row"><span><Icon name="globe"/><span><strong>northstar.io</strong><small>Verified domain</small></span></span><Badge tone="green"><Icon name="check" size={11}/> Verified</Badge></div><Button variant="secondary" size="sm" icon="plus">Add domain</Button></Card><Card className="settings-card"><h3>Session security</h3><div className="setting-row"><div><strong>Require multi-factor authentication</strong><p>Ask all workspace members for a second sign-in factor</p></div><label className="switch"><input type="checkbox"/><span/></label></div><div className="setting-row"><div><strong>Session timeout</strong><p>Sign members out after a period of inactivity</p></div><select defaultValue="7"><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></div><div className="api-endpoint-note"><Icon name="lock"/><span><strong>API connection</strong><p>{apiBaseUrl}</p></span><Badge tone="green" dot>Configured</Badge></div></Card></>
}
