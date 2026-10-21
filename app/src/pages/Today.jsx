import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IconChevronDown, IconChevronRight, IconCircleCheck, IconX, IconLayoutGrid, IconListCheck, IconStairs, IconSun } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useHotkeys, useSession, useToast, useUi, inrK, MOD } from '../lib/hooks.jsx';
import { Empty, RecentStrip, Avatar, SecTitle } from '../components/ui.jsx';
import { Greeting, KpiRow, StageChips } from '../components/Dash.jsx';
import Board from '../components/Board.jsx';

const NAV_ACTIONS = { fix_name: (id) => '/name-check?p=' + id, revise_quote: (id) => '/quotes?p=' + id, scan_serials: (id) => '/field?p=' + id };
const PAGE = 8;

export default function Today() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'tasks' ? 'tasks' : 'board';
  const [recent] = useData(() => api.listRecent(), [session.role, session.branch]);
  const [inbox] = useData(() => api.getInbox(), [session.role, session.branch]);
  const total = inbox ? inbox.queues.reduce((s, q) => s + q.rows.length, 0) : 0;
  return (
    <div className="page home">
      <Greeting sub={`Here is ${session.branch === 'All' ? 'all branches' : session.branch} today: what happened and what is coming up. Click any customer for a quick look.`} />
      <KpiRow />
      <SecTitle icon={IconStairs} tone="violet" title="Customers by stage" desc="Where everyone is right now, stage 1 to 11. Click a stage to see those customers." />
      <StageChips />
      <RecentStrip rows={recent} />
      <SecTitle icon={IconSun} tone="orange" title="Today at Sunpay" desc="New clients, installations, DISCOM, payments and subsidy — and the tasks waiting for you.">
        <div className="seg tabs-seg" role="tablist">
          <button role="tab" aria-selected={tab === 'board'} className={tab === 'board' ? 'on' : ''} onClick={() => setParams({})}><IconLayoutGrid size={15} />Today</button>
          <button role="tab" aria-selected={tab === 'tasks'} className={tab === 'tasks' ? 'on' : ''} onClick={() => setParams({ tab: 'tasks' })}><IconListCheck size={15} />My tasks{total > 0 && <span className="count-badge">{total}</span>}</button>
        </div>
      </SecTitle>
      {tab === 'board' ? <Board kind="office" /> : <Tasks />}
    </div>
  );
}

function Tasks() {
  const session = useSession();
  const [inbox] = useData(() => api.getInbox(), [session.role, session.branch]);
  const [projects] = useData(() => api.listProjects({}), [session.role, session.branch]);
  const [sel, setSel] = useState({ q: null, ids: new Set() });
  const [focus, setFocus] = useState(-1);
  const [collapsed, setCollapsed] = useState({});
  const [expanded, setExpanded] = useState({});
  const [active, setActive] = useState(null);
  const toast = useToast();
  const ui = useUi();
  const nav = useNavigate();
  const loc = useLocation();
  const ro = !api.canWrite(session.role);

  useEffect(() => {
    const h = loc.hash.slice(1);
    if (h && inbox) setTimeout(() => document.getElementById('q-' + h)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [loc.hash, inbox]);
  useEffect(() => { setSel({ q: null, ids: new Set() }); setFocus(-1); }, [session.role, session.branch]);

  const flat = useMemo(() => {
    if (!inbox) return [];
    const out = [];
    for (const q of inbox.queues) {
      if (collapsed[q.key]) continue;
      const rows = expanded[q.key] ? q.rows : q.rows.slice(0, PAGE);
      rows.forEach((r) => out.push({ q, r }));
    }
    return out;
  }, [inbox, collapsed, expanded]);

  const run = async (q, actionId, pids) => {
    if (actionId === 'open') return ui.openCustomer(pids[0]);
    if (NAV_ACTIONS[actionId]) return nav(NAV_ACTIONS[actionId](pids[0]));
    if (ro || !api.canAction(actionId)) return toast('Not available for your role');
    await api.runAction(actionId, pids);
    toast(`${api.ACTION_LABELS[actionId]} · ${pids.length} customer${pids.length > 1 ? 's' : ''}`);
    setSel({ q: null, ids: new Set() });
  };
  const toggle = (qk, pid) => setSel((s) => {
    const ids = new Set(s.q === qk ? s.ids : []);
    ids.has(pid) ? ids.delete(pid) : ids.add(pid);
    return { q: ids.size ? qk : null, ids };
  });
  const toggleAll = (q) => setSel((s) => {
    const all = s.q === q.key && s.ids.size === q.rows.length;
    return all ? { q: null, ids: new Set() } : { q: q.key, ids: new Set(q.rows.map((r) => r.pid)) };
  });

  useHotkeys({
    j: () => setFocus((f) => Math.min(flat.length - 1, f + 1)),
    k: () => setFocus((f) => Math.max(0, f - 1)),
    x: () => { const it = flat[focus]; if (it) toggle(it.q.key, it.r.pid); },
    e: () => { const it = flat[focus]; if (it) run(it.q, it.q.primary.id, [it.r.pid]); },
    Enter: () => { const it = flat[focus]; if (it) ui.openCustomer(it.r.pid); },
  }, [flat, focus, ro]);
  useEffect(() => { document.querySelector('.qrow.focus')?.scrollIntoView({ block: 'nearest' }); }, [focus]);

  if (!inbox) return <Empty>Loading…</Empty>;
  const total = inbox.queues.reduce((s, q) => s + q.rows.length, 0);
  const overdue = projects ? projects.reduce((s, p) => s + p.due, 0) : 0;
  const installs = inbox.queues.find((q) => q.key === 'installs_today');
  const selQ = sel.q && inbox.queues.find((q) => q.key === sel.q);
  let flatIdx = -1;

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="v">{total}</div><div className="l">tasks waiting</div></div>
        <div className="stat"><div className="v" style={{ color: 'var(--accent-text)' }}>{inbox.doneToday}</div><div className="l">done today</div></div>
        {installs && <div className="stat"><div className="v">{installs.rows.length}</div><div className="l">installations today</div></div>}
        <div className="stat"><div className="v" style={{ color: 'var(--coral)' }}>{inrK(overdue)}</div><div className="l">payments due</div></div>
      </div>
      <div className="today-grid">
        <aside className="qnav">
          {inbox.queues.map((q) => (
            <button key={q.key} className={active === q.key ? 'on' : ''} onClick={() => { setActive(q.key); document.getElementById('q-' + q.key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              <span className="ell">{q.title}</span><span className={'n' + (q.tone === 'coral' && q.rows.length ? ' hot' : '')}>{q.rows.length}</span>
            </button>
          ))}
          <div className="faint small hide-sm" style={{ padding: '14px 9px', lineHeight: 1.9 }}>
            <kbd>J</kbd> <kbd>K</kbd> move · <kbd>X</kbd> select<br /><kbd>E</kbd> primary action · <kbd>↵</kbd> open<br /><kbd>{MOD}</kbd> <kbd>K</kbd> jump anywhere
          </div>
        </aside>

        <div>
          {total === 0 && <div className="card"><Empty icon={IconCircleCheck} hint="New tasks appear here when a customer needs a reminder, a signature, a payment follow-up or a fix.">All tasks done. Nothing needs you right now.</Empty></div>}
          {inbox.queues.filter((q) => q.rows.length > 0).map((q) => {
            const isCol = collapsed[q.key];
            const rows = expanded[q.key] ? q.rows : q.rows.slice(0, PAGE);
            const allSel = sel.q === q.key && sel.ids.size === q.rows.length;
            return (
              <div className="card queue" key={q.key} id={'q-' + q.key} style={{ scrollMarginTop: 12 }}>
                <div className="queue-h" onClick={() => setCollapsed((c) => ({ ...c, [q.key]: !c[q.key] }))}>
                  {q.bulk && !ro ? <input type="checkbox" className="chk" checked={allSel} onClick={(e) => e.stopPropagation()} onChange={() => toggleAll(q)} aria-label="Select all" /> : <span style={{ width: 16 }} />}
                  <h3>{q.title}</h3>
                  <span className={'count ' + q.tone}>{q.rows.length}</span>
                  <span style={{ marginLeft: 'auto' }} className="faint">{isCol ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}</span>
                </div>
                {!isCol && rows.map((r) => {
                  flatIdx++;
                  const fi = flatIdx;
                  const checked = sel.q === q.key && sel.ids.has(r.pid);
                  return (
                    <div key={r.pid} className={'qrow' + (focus === fi ? ' focus' : '') + (checked ? ' sel' : '')} onMouseEnter={() => setFocus(fi)}>
                      {q.bulk && !ro ? <input type="checkbox" className="chk" checked={checked} onChange={() => toggle(q.key, r.pid)} aria-label={'Select ' + r.name} /> : <span />}
                      <div className="who" onClick={() => ui.openCustomer(r.pid)}><Avatar name={r.name} size="sm" /><span className="who-t"><b>{r.name}</b><span className="id">{r.crn} · {r.city} · {r.kwp} kWp</span></span></div>
                      <div className="why" title={r.reason}>{r.reason}</div>
                      <div className={'age' + (r.age > 14 ? ' old' : '')} title={`Waiting ${r.age} days`}>{r.age === 0 ? 'today' : r.age + ' days'}</div>
                      <div className="acts">
                        {q.secondary && <button className="btn sm ghost secondary" disabled={ro} onClick={() => run(q, q.secondary.id, [r.pid])}>{q.secondary.label}</button>}
                        <button className="btn sm" disabled={ro && !NAV_ACTIONS[q.primary.id] && q.primary.id !== 'open'} onClick={() => run(q, q.primary.id, [r.pid])}>{q.primary.label}{focus === fi && <kbd className="hide-sm">E</kbd>}</button>
                      </div>
                    </div>
                  );
                })}
                {!isCol && q.rows.length > PAGE && (
                  <div className="qrow" style={{ display: 'block', textAlign: 'center', minHeight: 0 }}>
                    <button className="btn sm ghost" onClick={() => setExpanded((x) => ({ ...x, [q.key]: !x[q.key] }))}>{expanded[q.key] ? 'Show less' : `Show all ${q.rows.length}`}</button>
                  </div>
                )}
              </div>
            );
          })}
          {selQ && (
            <div className="bulkbar">
              <b>{sel.ids.size} selected</b><span style={{ opacity: .6 }} className="hide-sm">in {selQ.title.toLowerCase()}</span>
              {selQ.bulk.map((a, i) => <button key={a} className={'btn sm' + (i === 0 ? ' primary' : '')} onClick={() => run(selQ, a, [...sel.ids])}>{api.ACTION_LABELS[a]} ({sel.ids.size})</button>)}
              <button className="btn sm icon" onClick={() => setSel({ q: null, ids: new Set() })} aria-label="Clear selection"><IconX size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
