import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  IconSun, IconMoon, IconHome, IconTable, IconSearch, IconScan, IconMenu2, IconX, IconChevronDown, IconCheck, IconRefresh,
  IconLogout, IconUserPlus, IconDownload, IconCoin, IconCalendarEvent, IconStack2, IconLayoutDashboard, IconTruck, IconSelector,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { modulesFor, isModuleActive, NAV_SECTIONS } from '../lib/nav.js';
import { homeFor, isReadOnly, pageAllowed } from '../lib/access.js';
import { UiCtx, useHotkeys, useSession, useTheme, useToast, useData } from '../lib/hooks.jsx';
import { ReadOnlyBanner, SunMark, APP_NAME, Avatar } from './ui.jsx';
import SearchBox from './Search.jsx';

export default function Shell() {
  const [theme, toggleTheme] = useTheme();
  const session = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const mods = modulesFor(session.role, { withSoon: true });
  const searchRef = useRef(null);

  useEffect(() => { document.getElementById('content')?.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // Only one keyboard shortcut is kept: "/" jumps to search (Ctrl/⌘ K is handled above).
  useHotkeys({ '/': (e) => { e.preventDefault(); searchRef.current?.focus(); } }, [], true);

  const ui = { openSearch: () => searchRef.current?.focus(), openCustomer: (id) => nav('/p/' + id) };
  const ro = isReadOnly(session.role);
  const branches = api.branchOptions(session);

  return (
    <UiCtx.Provider value={ui}>
      <div className="app labelled">
        <nav className="rail" aria-label="Main menu">
          <NavLink to={homeFor(session.role)} className="rail-logo-row" aria-label={`${APP_NAME} home`}>
            <span className="brand-mark"><SunMark size={26} /></span>
            <span className="brand-text"><b>{APP_NAME}</b><small>Sunpay Renewable</small></span>
          </NavLink>
          <SideMenu mods={mods} role={session.role} path={loc.pathname} />
          <div style={{ flex: 1 }} />
          <div className="rail-user">
            <RolePicker session={session} placement="up" />
            <button className="btn icon ghost theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>{theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}</button>
          </div>
        </nav>

        <div className="main">
          <header className="topbar">
            <NavLink to={homeFor(session.role)} className="top-logo" aria-label={`${APP_NAME} home`}><span className="brand-mark sm"><SunMark size={22} /></span><b className="top-name">{APP_NAME}</b></NavLink>
            <SearchBox ref={searchRef} onOpenCustomer={(id) => nav('/p/' + id)} toggleTheme={toggleTheme} />
            <div className="top-right">
              {branches.length > 1 && (
                <select className="select hide-sm" value={session.branch} onChange={(e) => api.setSession({ branch: e.target.value })} aria-label="Branch">
                  {branches.map((b) => <option key={b} value={b}>{b === 'All' ? 'All branches' : b}</option>)}
                </select>
              )}
              {pageAllowed('add_lead', session.role) && loc.pathname !== '/projects' && !loc.pathname.startsWith('/p/') && (
                <NavLink to="/add-lead" className="btn primary top-act" aria-label="Add lead"><IconUserPlus size={16} /><span className="hide-sm">Add lead</span></NavLink>
              )}
              {api.canDo('export') && !['/projects'].includes(loc.pathname) && !loc.pathname.startsWith('/p/') && <ExportButton />}
              <CloudDot />
              <span className="show-sm"><RolePicker session={session} compact theme={theme} toggleTheme={toggleTheme} /></span>
            </div>
          </header>
          {ro && <ReadOnlyBanner />}
          <main className="content" id="content">
            <Outlet />
          </main>
        </div>

        <TabBar role={session.role} onSearch={() => searchRef.current?.focus()} />
      </div>

    </UiCtx.Provider>
  );
}

const OFFICE_ROLES = ['Admin', 'Office Staff', 'Finance'];
const NAV_KEY = 'solarcrm.nav.closed';
/** Side menu: items grouped in sections (Operations, Money, Team) with a header that folds the section. Open/closed is remembered. */
function SideMenu({ mods, role, path }) {
  const [closed, setClosed] = useState(() => { try { return JSON.parse(localStorage.getItem(NAV_KEY) || '{}'); } catch { return {}; } });
  const toggle = (k) => setClosed((c) => { const n = { ...c, [k]: !c[k] }; try { localStorage.setItem(NAV_KEY, JSON.stringify(n)); } catch { /* */ } return n; });
  const headed = OFFICE_ROLES.includes(role);
  const item = (m) => (m.soon
    ? <span key={m.key} className="rail-btn soon" aria-disabled="true" title={`${m.label} is coming soon`}>
        <span className={'nav-ico t-' + m.tone}><m.icon size={17} stroke={1.9} /></span>
        <span className="rail-lbl">{m.label}</span><span className="soon-pill">Soon</span>
      </span>
    : <NavLink key={m.key} to={m.to} className={() => 'rail-btn' + (isModuleActive(m, path) ? ' active' : '')} aria-current={isModuleActive(m, path) ? 'page' : undefined}>
        <span className={'nav-ico t-' + m.tone}><m.icon size={17} stroke={1.9} /></span>
        <span className="rail-lbl">{m.label}</span>
      </NavLink>);
  if (!headed) return <div className="nav-group">{mods.map(item)}</div>;
  return NAV_SECTIONS.map((sec) => {
    const list = mods.filter((m) => (m.section || 'main') === sec.key);
    if (!list.length) return null;
    if (!sec.label) return <div key={sec.key} className="nav-group">{list.map(item)}</div>;
    const isClosed = !!closed[sec.key] && !(sec.key==='money' && (path.startsWith('/finance')||path.startsWith('/money/')));
    const hasActive = list.some((m) => isModuleActive(m, path));
    return (
      <div key={sec.key} className={'nav-group' + (isClosed ? ' closed' : '')}>
        <button type="button" className={'nav-sec' + (isClosed && hasActive ? ' has-active' : '')} onClick={() => toggle(sec.key)} aria-expanded={!isClosed} aria-controls={'nav-' + sec.key}>
          <span>{sec.label}</span><IconChevronDown size={14} stroke={2.2} className="nav-chev" />
        </button>
        {!isClosed && <div id={'nav-' + sec.key} className="nav-items">{list.map(item)}</div>}
      </div>
    );
  });
}

function TabBar({ role, onSearch }) {
  const L = ({ to, icon: I, label }) => <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}><span className="tb-ico"><I size={21} stroke={1.8} /></span>{label}</NavLink>;
  let tabs;
  if (role === 'Admin' || role === 'Office Staff') tabs = [<L key="a" to="/today" icon={IconHome} label="Today" />, <L key="b" to="/projects" icon={IconTable} label="Customers" />];
  else if (role === 'Finance') tabs = [<L key="a" to="/overview" icon={IconLayoutDashboard} label="Overview" />, <L key="b" to="/projects" icon={IconTable} label="Customers" />];
  else if (['CPO', 'CP', 'Dealer'].includes(role)) tabs = [<L key="a" to="/partner" icon={IconHome} label="Home" />, <L key="b" to="/add-lead" icon={IconUserPlus} label="Add lead" />];
  else if (role === 'Technician') tabs = [<L key="a" to="/field" icon={IconScan} label="My jobs" />, <L key="b" to="/installs" icon={IconCalendarEvent} label="Calendar" />];
  else if (role === 'Installation Team') tabs = [<L key="a" to="/field" icon={IconScan} label="My jobs" />, <L key="b" to="/supply/tally" icon={IconTruck} label="Truck tally" />];
  else tabs = [<L key="a" to="/stamp" icon={IconStack2} label="Stamp queue" />, <L key="b" to="/more" icon={IconMenu2} label="Pages" />];
  const third = ['CPO', 'CP', 'Dealer'].includes(role) ? <L key="c" to="/my-commission" icon={IconCoin} label="Commission" /> : role === 'Admin' || role === 'Office Staff' ? <L key="c" to="/overview" icon={IconLayoutDashboard} label="Overview" /> : role === 'Finance' ? <L key="c" to="/money/subsidy" icon={IconCoin} label="Subsidy" /> : role === 'Technician' ? <L key="c" to="/feasibility" icon={IconTable} label="Feasibility" /> : role === 'Installation Team' ? <L key="c" to="/installs" icon={IconCalendarEvent} label="Calendar" /> : null;
  return (
    <nav className="tabbar" aria-label="Primary">
      {tabs}
      <button onClick={onSearch}><span className="tb-ico"><IconSearch size={21} stroke={1.8} /></span>Search</button>
      {third}
      {role !== 'Stamp Staff' && <L to="/more" icon={IconMenu2} label="More" />}
    </nav>
  );
}

/** Downloads every customer this role can see as a CSV (opens in Excel / Google Sheets). */
function ExportButton() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const rows = await api.listProjects({ sort: 'crn' });
      const cols = [
        ['CRN', (r) => r.crn], ['Project ID', (r) => r.id], ['Customer', (r) => r.name], ['Phone', (r) => r.phone], ['City', (r) => r.city],
        ['Branch', (r) => r.branch], ['Segment', (r) => r.type], ['kWp', (r) => r.kwp], ['Contract value', (r) => r.value], ['Paid', (r) => r.paid],
        ['Due now', (r) => r.due], ['Payment method', (r) => r.paymentMethod], ['DISCOM', (r) => r.discom], ['Partner', (r) => r.partner],
        ['Status', (r) => r.sentence], ['Next step', (r) => r.next?.text || ''], ['Subsidy', (r) => r.subsidyStatus],
      ];
      const esc = (v) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
      const csv = [cols.map((c) => c[0]).join(','), ...rows.map((r) => cols.map((c) => esc(c[1](r))).join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `customers_${api.meta.TODAY}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Exported ${rows.length} customers`);
    } finally { setBusy(false); }
  };
  return <button className="btn top-act" onClick={run} disabled={busy} aria-label="Export customers to Excel"><IconDownload size={16} /><span className="hide-sm">{busy ? 'Exporting…' : 'Export'}</span></button>;
}

/** Where the data lives right now: saved to Supabase, saving, or only in this browser. */
function CloudDot() {
  const [st, setSt] = useState(api.cloudStatus());
  useEffect(() => api.onCloudStatus(() => setSt(api.cloudStatus())), []);
  const text = { online: 'Saved to cloud', saving: 'Saving…', connecting: 'Connecting…', error: 'Not saved — check connection', local: 'This browser only' }[st.status] || st.status;
  return <span className={'cloud-dot ' + st.status} title={st.error || text} role="status"><i aria-hidden="true" /><span className="hide-sm">{text}</span></span>;
}

function RolePicker({ session, placement = 'down', compact = false, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const set = (patch) => { api.setSession(patch); setOpen(false); nav(homeFor(patch.role || session.role)); };
  const r = session.role;
  const sub = api.identityLabel(session);
  const userName = session.user?.name && session.user.name !== session.user.email ? session.user.name : api.ROLE_INFO[r].long;
  const Opt = ({ on, onClick, children }) => <button className={on ? 'on' : ''} onClick={onClick}>{children}{on && <IconCheck size={14} style={{ marginLeft: 'auto' }} />}</button>;
  return (
    <div className={'role-wrap' + (compact ? ' compact' : '')} ref={ref}>
      <button className="role-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Signed in as ${userName}, ${api.ROLE_INFO[r].long}. Open user menu`}>
        <Avatar name={userName} size="sm" />
        {!compact && <span className="role-txt"><b className="ell">{userName}</b><small className="ell">{api.ROLE_INFO[r].long}{sub && sub !== userName ? ` · ${sub}` : ''}</small></span>}
        {!compact && <IconSelector size={15} className="faint" />}
      </button>
      {open && (
        <div className={'role-menu ' + placement} role="menu">
          {api.canPreviewRoles() && <>
            <div className="h">{session.cloud ? 'Preview the app as… (Admin only)' : 'Try Solar CRM as… (demo, no password)'}</div>
            {api.ROLES.map((x) => <Opt key={x} on={r === x} onClick={() => set({ role: x })}>{api.ROLE_INFO[x].long}</Opt>)}
          </>}
          {api.canPreviewRoles() && <>
          {r === 'Office Staff' && <><div className="h">Office desk</div>{api.meta.OFFICE_USERS.map((u) => <Opt key={u.id} on={session.officeId === u.id} onClick={() => set({ officeId: u.id, branch: u.branches[0] })}>{u.name.replace('Office desk · ', '')}</Opt>)}</>}
          {r === 'CPO' && <><div className="h">Partner office</div>{api.meta.CPOS.map((c) => <Opt key={c.id} on={session.cpoId === c.id} onClick={() => set({ cpoId: c.id })}>{c.name}</Opt>)}</>}
          {r === 'CP' && <><div className="h">Channel partner</div>{api.meta.CHANNEL_PARTNERS.map((c) => <Opt key={c.id} on={session.cpId === c.id} onClick={() => set({ cpId: c.id })}>{c.name}</Opt>)}</>}
          {r === 'Dealer' && <><div className="h">Dealer</div>{api.meta.DEALERS.map((d) => <Opt key={d.id} on={session.dealerId === d.id} onClick={() => set({ dealerId: d.id })}>{d.name}</Opt>)}</>}
          {r === 'Installation Team' && <><div className="h">Crew</div>{api.meta.TEAMS.map((t) => <Opt key={t.id} on={session.teamId === t.id} onClick={() => set({ teamId: t.id })}>{t.name} <span className="faint small">{t.kind}</span></Opt>)}</>}
          {r === 'Technician' && <><div className="h">Technician</div>{api.meta.TECHNICIANS.map((t) => <Opt key={t} on={session.technician === t} onClick={() => set({ technician: t })}>{t}</Opt>)}</>}
          </>}
          {api.branchOptions(session).length > 1 && <div className="show-sm"><div className="h">Branch</div>{api.branchOptions(session).map((b) => <Opt key={b} on={session.branch === b} onClick={() => { api.setSession({ branch: b }); setOpen(false); }}>{b === 'All' ? 'All branches' : b}</Opt>)}</div>}
          {toggleTheme && <><div className="h">Look</div><button onClick={() => { toggleTheme(); setOpen(false); }}>{theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />} {theme === 'dark' ? 'Light theme' : 'Dark theme'}</button></>}
          {!session.cloud && <><div className="h">Demo data</div>
          <button onClick={() => { api.resetDemo(); setOpen(false); }}><IconRefresh size={14} /> Reset demo data</button></>}
          <div className="h">Signed in as {session.user?.name && session.user.name !== session.user.email ? `${session.user.name} · ` : ''}{session.user?.email}</div>
          <button onClick={() => { setOpen(false); api.signOut(); nav('/'); }}><IconLogout size={14} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
