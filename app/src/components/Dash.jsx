import { Link } from 'react-router-dom';
import {
  IconTool, IconCurrencyRupee, IconFileInvoice, IconAlertTriangle, IconTrophy, IconUserPlus, IconArrowUpRight,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, inrK } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import { IconChip, stageChipTone } from './ui.jsx';

const DAY = 86400000;
const dayKey = (v) => (v ? String(v).slice(0, 10) : '');
const addDays = (key, n) => new Date(new Date(key + 'T10:00:00').getTime() + n * DAY).toISOString().slice(0, 10);

/** "Good afternoon, Asha" with today's date. */
export function Greeting({ sub, children }) {
  const session = useSession();
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const full = session.user?.name && session.user.name !== session.user.email ? session.user.name : api.ROLE_INFO[session.role]?.long || '';
  const first = full.split(/\s+/)[0];
  const day = new Date(api.meta.TODAY + 'T10:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="hello">
      <div className="hello-sun" aria-hidden="true" />
      <div className="hello-text">
        <div className="hello-date">{day}</div>
        <h1>Good {part}, {first}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="hello-actions">{children}</div>}
    </div>
  );
}

/** Small inline line chart. `values` is a list of numbers, oldest first. */
export function Sparkline({ values, w = 120, h = 36 }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 8)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="none">
      <path d={`${line} L ${w} ${h} L 0 ${h} Z`} className="spark-fill" />
      <path d={line} className="spark-line" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" className="spark-dot" />}
    </svg>
  );
}
/** Small bar chart; `hot` marks bars to draw in the warning colour. */
export function MiniBars({ values, hot = [], labels = [] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="minibars" aria-hidden="true">
      {values.map((v, i) => <i key={i} className={hot.includes(i) ? 'hot' : ''} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} title={labels[i] ? `${labels[i]}: ${v}` : String(v)} />)}
    </span>
  );
}
/** Progress ring, 0–1. */
export function RingMini({ pct, size = 44, label }) {
  const r = (size - 6) / 2; const c = 2 * Math.PI * r;
  return (
    <svg className="ringmini" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="rm-track" strokeWidth="6" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} className="rm-val" strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={`${c * Math.max(0.001, Math.min(1, pct))} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="rm-txt">{label ?? Math.round(pct * 100) + '%'}</text>
    </svg>
  );
}

function Kpi({ to, icon, tone, value, label, sub, chart }) {
  const body = (
    <>
      <div className="kpi-top"><IconChip icon={icon} tone={tone} />{to && <IconArrowUpRight size={16} className="kpi-go" aria-hidden="true" />}</div>
      <div className="kpi-mid">
        <div className="kpi-fig"><b className="kpi-val">{value}</b><span className="kpi-lbl">{label}</span></div>
        {chart && <div className="kpi-chart">{chart}</div>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </>
  );
  return to ? <Link to={to} className={'kpi t-' + tone}>{body}</Link> : <div className={'kpi t-' + tone}>{body}</div>;
}

/**
 * The big colourful tiles at the top of Today / Overview. Every figure comes from the existing api
 * (customer list, Today board, task queues) for the customers this person can see.
 */
export function KpiRow() {
  const session = useSession();
  const deps = [session.role, session.branch, session.cpoId];
  const [rows] = useData(() => api.listProjects({}), deps);
  const [board] = useData(() => api.getBoard('office', 0), deps);
  const [inbox] = useData(() => api.getInbox(), deps);
  if (!rows || !board || !inbox) return <div className="kpis loading" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="kpi skel" />)}</div>;
  const part = (k) => board.flatMap((s) => s.parts).find((p) => p.key === k)?.count || 0;
  const T = api.meta.TODAY;
  const canList = pageAllowed('projects', session.role);
  const go = (q) => (canList ? '/projects?' + q : null);
  const money = api.canDo('internal_money');

  // Installations booked for each of the next 7 days (not yet done).
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(T, i));
  const inst = days7.map((d) => rows.filter((r) => r.installDate === d && r.installStatus !== 'done').length);
  const dayLbl = days7.map((d) => new Date(d + 'T10:00:00').toLocaleDateString('en-IN', { weekday: 'short' }));

  // Customers added per week, last 8 weeks (oldest first).
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(T, -7 * (7 - i)); const start = addDays(end, -6);
    return rows.filter((r) => { const k = dayKey(r.createdAt); return k >= start && k <= end; }).length;
  });
  const newMonth = rows.filter((r) => dayKey(r.createdAt).slice(0, 7) === T.slice(0, 7)).length;

  // How long open steps have been waiting.
  const buckets = [[0, 7], [8, 14], [15, 30], [31, 60], [61, 1e9]];
  const wait = buckets.map(([a, b]) => rows.filter((r) => r.tone !== 'done' && r.stuckDays >= a && r.stuckDays <= b).length);
  const stuck30 = rows.filter((r) => r.tone !== 'done' && r.stuckDays > 30).length;

  const quote = inbox.queues.find((q) => q.key === 'quote_approval');
  const qAge = quote ? [[0, 2], [3, 7], [8, 14], [15, 1e9]].map(([a, b]) => quote.rows.filter((r) => r.age >= a && r.age <= b).length) : null;

  const value = rows.reduce((s, r) => s + r.value, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const due = rows.reduce((s, r) => s + r.due, 0);
  const completed = rows.filter((r) => r.stage === 'completed').length;

  return (
    <div className="kpis">
      <Kpi to={go('board=inst_today')} icon={IconTool} tone="orange" value={part('inst_today')} label="installations today"
        sub={`${part('inst_tomorrow')} tomorrow · ${inst.reduce((a, b) => a + b, 0)} in the next 7 days`} chart={<MiniBars values={inst} hot={[0]} labels={dayLbl} />} />
      {money && <Kpi to={go('board=pay_due')} icon={IconCurrencyRupee} tone="green" value={inrK(due)} label="money due now"
        sub={`${part('pay_today')} payment${part('pay_today') === 1 ? '' : 's'} received today · ${inrK(paid)} collected`} chart={<RingMini pct={value ? paid / value : 0} />} />}
      {quote && <Kpi to="/today?tab=tasks#quote_approval" icon={IconFileInvoice} tone="violet" value={quote.rows.length} label="quotations awaiting approval"
        sub="by days waiting: 0–2 · 3–7 · 8–14 · 15+" chart={<MiniBars values={qAge} hot={[3]} />} />}
      <Kpi to={go('view=stuck')} icon={IconAlertTriangle} tone="rose" value={stuck30} label="customers waiting over 30 days"
        sub="days waiting: ≤7 · 8–14 · 15–30 · 31–60 · 60+" chart={<MiniBars values={wait} hot={[3, 4]} />} />
      <Kpi to={go('board=closed_month')} icon={IconTrophy} tone="blue" value={part('closed_month')} label="fully completed this month"
        sub={`${completed} of ${rows.length} customers at “Completed”`} chart={<RingMini pct={rows.length ? completed / rows.length : 0} />} />
      <Kpi to={go('board=new_leads')} icon={IconUserPlus} tone="sun" value={newMonth} label="new customers this month"
        sub="added per week, last 8 weeks" chart={<Sparkline values={weeks} />} />
    </div>
  );
}

/** Colourful stage chips with counts; a click opens the customer list for that stage. */
export function StageChips() {
  const session = useSession();
  const [counts] = useData(() => api.stageCounts(), [session.role, session.branch, session.cpoId]);
  if (!counts) return null;
  const canList = pageAllowed('projects', session.role);
  return (
    <div className="stage-chips" role="list" aria-label="Customers per stage">
      {counts.map((c, i) => {
        const st = api.meta.STAGES[i];
        const inner = <><span className="sc-ico"><st.icon size={15} stroke={2} /></span><span className="sc-name">{c.label}</span><b>{c.count}</b></>;
        return canList
          ? <Link role="listitem" key={c.id} to={`/projects?stage=${c.id}`} className={'schip t-' + stageChipTone(i + 1) + (c.count ? '' : ' empty')} title={`Stage ${i + 1}: ${c.label}`}>{inner}</Link>
          : <span role="listitem" key={c.id} className={'schip t-' + stageChipTone(i + 1) + (c.count ? '' : ' empty')}>{inner}</span>;
      })}
    </div>
  );
}
