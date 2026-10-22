import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  IconCheck, IconCopy, IconPhone, IconLock, IconClock, IconUser, IconMapPin, IconArrowRight, IconArrowLeft, IconSolarPanel, IconBuildingStore,
  IconUsersGroup, IconCreditCard, IconCurrencyRupee, IconBuildingBank, IconLoader2, IconMoodSmile, IconMapSearch,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useToast, useUi, inr, fdate } from '../lib/hooks.jsx';
import { MODULES, isModuleActive } from '../lib/nav.js';

/* ---------- avatars, icon chips, stage tones (Sunlit look) ---------- */
export const hue = (s) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export const initialsOf = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
/** Round, colour-coded initials for a person or customer. The colour is stable per name. */
export function Avatar({ name, size = 'md', className = '' }) {
  return <span className={`av av-${size} ${className}`} style={{ '--h': hue(name) }} aria-hidden="true">{initialsOf(name)}</span>;
}
/** A tinted rounded square holding an icon. Tones: orange, blue, violet, green, rose, sun, slate. */
export function IconChip({ icon: I, tone = 'orange', size = 'md' }) {
  const px = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  return <span className={`ichip ichip-${size} t-${tone}`} aria-hidden="true"><I size={px} stroke={1.9} /></span>;
}
/** Stage number (1–11) → colour group: sales (violet), build (orange), grid / DISCOM (blue), done (green). */
export const stageTone = (n) => (n >= 11 ? 'done' : n >= 6 ? 'grid' : n >= 4 ? 'build' : 'sales');
const TONE_OF_GROUP = { sales: 'violet', build: 'orange', grid: 'blue', done: 'green' };
export const stageChipTone = (n) => TONE_OF_GROUP[stageTone(n)];
/** Section heading with an icon chip and a one-line description. */
export function SecTitle({ icon, tone = 'orange', title, desc, children }) {
  return (
    <div className="sec-head">
      {icon && <IconChip icon={icon} tone={tone} />}
      <div className="grow" style={{ minWidth: 0 }}>
        <h2 className="sec-title">{title}</h2>
        {desc && <p className="sec-desc">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function Pill({ status, tone, children }) {
  return <span className={'pill ' + (status || tone || '')}>{children || api.STATUS_LABEL[status]}</span>;
}
export function Dot({ status, title }) { return <span className={'dot ' + status} title={title || api.STATUS_LABEL[status]} />; }
export function Kbd({ children }) { return <kbd>{children}</kbd>; }

const RING_COLOR = { done: 'var(--ok)', in_progress: 'var(--violet)', waiting_customer: 'var(--coral)', waiting_third: 'var(--orchid)', blocked: 'var(--red)', not_started: 'var(--text-3)' };
export function Ring({ pct, status, size = 40, stroke = 4, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = pct >= 1 ? 'var(--ok)' : RING_COLOR[status] || 'var(--brand)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * Math.max(pct, 0.001)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.27} fontFamily="JetBrains Mono" fill="var(--text)">{Math.round(pct * 100)}</text>
    </svg>
  );
}

export function Tip({ label, kbd, children, disabled }) {
  const [pos, setPos] = useState(null);
  if (disabled) return children;
  return (
    <span onMouseEnter={(e) => { const el = e.currentTarget.firstElementChild || e.currentTarget; const r = el.getBoundingClientRect(); setPos({ x: r.right + 10, y: r.top + r.height / 2 }); }}
      onMouseLeave={() => setPos(null)} style={{ display: 'contents' }}>
      {children}
      {pos && <span className="tip" style={{ left: pos.x, top: pos.y, transform: 'translateY(-50%)' }}>{label}{kbd && <span style={{ display: 'flex', gap: 2 }}>{kbd.split(' ').map((k, i) => <kbd key={i}>{k}</kbd>)}</span>}</span>}
    </span>
  );
}

/** Page title. The icon chip comes from the menu entry for this address unless one is given. */
export function PageHead({ title, sub, children, icon, tone }) {
  const loc = useLocation();
  const mod = MODULES.find((m) => m.to === loc.pathname) || MODULES.find((m) => isModuleActive(m, loc.pathname));
  const I = icon || mod?.icon;
  return (
    <div className="page-head">
      {I && <IconChip icon={I} tone={tone || mod?.tone || 'orange'} size="lg" />}
      <div className="ph-text"><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
/** Empty state: a friendly icon, what will appear here, and what to do. */
export function Empty({ children, hint, icon }) {
  const loading = typeof children === 'string' && /^Loading/.test(children);
  if (loading) return <div className="zero loading" role="status"><IconLoader2 size={20} className="spin" aria-hidden="true" /><div>{children}</div></div>;
  const I = icon === undefined ? IconMoodSmile : icon;
  return (
    <div className="zero">
      {I && <span className="zero-ico" aria-hidden="true"><I size={22} stroke={1.7} /></span>}
      <div>{children}</div>
      {hint && <div className="zero-hint">{hint}</div>}
    </div>
  );
}
export function ReadOnlyBanner() {
  return <div className="ro-strip"><IconLock size={14} /> You are signed in as <b>Finance</b>: you can look at everything, but nothing can be changed from this account.</div>;
}

/* ---------- status sentence, next step, milestones ---------- */
export function StatusLine({ s, big }) {
  return <div className={'status-line tone-' + (s.tone || 'none') + (big ? ' big' : '')}><span className="sdot" />{s.sentence}</div>;
}
export function NextStep({ next, compact }) {
  if (!next) return <div className="next-step done"><IconCheck size={15} /> Nothing left to do</div>;
  return (
    <div className={'next-step' + (next.overdue ? ' overdue' : '') + (compact ? ' compact' : '')}>
      <span className="ns-lbl">Next step</span>
      <span className="ns-text">{next.text}</span>
      <span className="ns-meta"><IconUser size={13} /> {next.owner}</span>
      <span className="ns-meta"><IconClock size={13} /> {next.overdue ? next.dueWords : 'due ' + next.dueWords.toLowerCase()}</span>
    </div>
  );
}
/** The 11 project stages as a step bar. `s` is a customer summary (stage, stageNo, stageCount, stageAt). */
export function StagePath({ s, compact = false }) {
  const cur = s.stageNo - 1;
  const tone = stageTone(s.stageNo);
  return (
    <div className={'spath tone-' + tone + (compact ? ' compact' : '')}>
      <div className="spath-head"><span className={'cc-pill ' + tone}><i>{s.stageNo}</i>{s.stageLabel}</span><span className="faint small">Stage {s.stageNo} of {s.stageCount}{s.stageAt ? ` · since ${fdate(s.stageAt)}` : ''}</span></div>
      <ol className="spath-steps" aria-label={`Stage ${s.stageNo} of ${s.stageCount}: ${s.stageLabel}`}>
        {api.meta.STAGES.map((st, i) => (
          <li key={st.id} className={(i < cur ? 'ok' : i === cur ? 'now' : '') + ' g-' + stageTone(i + 1)} title={`${i + 1}. ${st.label}`}>
            <span className="sp-dot">{i < cur ? <IconCheck size={compact ? 10 : 13} stroke={3} /> : compact ? '' : <st.icon size={14} stroke={2} />}</span>
            {!compact && <span className="sp-label">{st.label}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
/** Compact stage marker for list rows: number, name and a thin progress bar. */
export function StageChip({ r }) {
  const pct = Math.round((r.stageNo / r.stageCount) * 100);
  return (
    <span className={'stage-chip g-' + stageTone(r.stageNo) + (r.stage === 'completed' ? ' done' : '')} title={`Stage ${r.stageNo} of ${r.stageCount}: ${r.stageLabel}`}>
      <span className="sc-no">{r.stageNo}</span><span className="sc-label">{r.stageLabel}</span>
      <span className="sc-bar" aria-hidden="true"><i style={{ width: pct + '%' }} /></span>
    </span>
  );
}
export function MilestonePath({ ms }) {
  return (
    <ol className="mpath" aria-label="Progress milestones">
      {ms.map((m, i) => {
        const cls = m.na ? 'na' : m.reached ? 'ok' : m.lateBy ? 'late' : (i === 0 || ms[i - 1].reached || ms[i - 1].na) ? 'now' : '';
        return (
          <li key={m.key} className={cls}>
            <span className="mp-dot">{m.reached ? <IconCheck size={12} stroke={3} /> : i + 1}</span>
            <span className="mp-label">{m.label}</span>
            <span className="mp-date">{m.na ? 'not applicable' : m.reached ? fdate(m.date) : m.lateBy ? `${m.lateBy} days late` : 'by ' + fdate(m.expected)}</span>
          </li>
        );
      })}
    </ol>
  );
}
export function MiniPath({ ms }) {
  const cur = ms.findIndex((m) => !m.reached && !m.na);
  const title = ms.map((m) => `${m.label}: ${m.na ? 'n/a' : m.reached ? 'done ' + fdate(m.date) : m.lateBy ? m.lateBy + ' days late' : 'by ' + fdate(m.expected)}`).join('\n');
  return (
    <span className="minipath" title={title} aria-label={cur === -1 ? 'All milestones reached' : `At milestone ${cur + 1} of 6: ${ms[cur].label}`}>
      {ms.map((m, i) => <i key={m.key} className={m.na ? 'na' : m.reached ? 'ok' : m.lateBy ? 'late' : i === cur ? 'now' : ''} />)}
      <b>{cur === -1 ? 'Closed' : ms[cur].label}</b>
    </span>
  );
}
export function CopyPhone({ phone }) {
  const toast = useToast();
  const pretty = phone.replace(/(\d{5})(\d{5})/, '$1 $2');
  return (
    <span className="phone-chip">
      <a href={'tel:+91' + phone} title="Call"><IconPhone size={14} /> <span className="mono">{pretty}</span></a>
      <button type="button" className="btn sm icon ghost" title="Copy number" aria-label="Copy phone number" onClick={() => { try { navigator.clipboard.writeText(phone); } catch { /* */ } toast('Phone number copied'); }}><IconCopy size={13} /></button>
    </span>
  );
}
export function KeyFacts({ s, showMoney = true }) {
  const facts = [
    ['Phone', <CopyPhone phone={s.phone} />, IconPhone, 'blue'],
    ['Address', <span className="addr">{s.address}</span>, IconMapPin, 'rose'],
    ['System', `${s.kwp} kWp · ${s.type}`, IconSolarPanel, 'orange'],
    ['Branch', s.branch, IconBuildingStore, 'violet'],
    ['Partner', s.partner, IconUsersGroup, 'sun'],
    ['Payment', s.paymentMethod + (s.loan ? ` · ${s.loan.bank}` : ''), IconCreditCard, 'blue'],
    ...(showMoney ? [['Amount due', <b className={'num' + (s.due ? ' due' : '')}>{s.due ? inr(s.due) : 'Nothing due'}</b>, IconCurrencyRupee, s.due ? 'rose' : 'green']] : []),
    ['Subsidy', s.subsidyStatus, IconBuildingBank, 'green'],
  ];
  return <dl className="keyfacts">{facts.map(([k, v, I, t]) => <div key={k}><IconChip icon={I} tone={t} size="sm" /><span className="kf-text"><dt>{k}</dt><dd>{v}</dd></span></div>)}</dl>;
}

/* ---------- customer row used in boards / lists ---------- */
export function CustomerLine({ r, note, right }) {
  const ui = useUi();
  return (
    <button type="button" className="cline" onClick={() => ui.openCustomer(r.id)}>
      <Avatar name={r.name} />
      <span className="cl-main">
        <span className="cl-name">{r.name}</span>
        <span className="cl-meta">{r.crn} · {r.city} · {r.kwp} kWp</span>
      </span>
      <span className="cl-status">
        {note && <span className="cl-note">{note}</span>}
        <StatusLine s={r} />
      </span>
      {right}
    </button>
  );
}
export function RecentStrip({ rows }) {
  const ui = useUi();
  if (!rows || rows.length === 0) return null;
  return (
    <div className="recent">
      <span className="recent-h">Recently opened</span>
      {rows.slice(0, 6).map((r) => <button key={r.id} className="chip recent-chip" onClick={() => ui.openCustomer(r.id)}><Avatar name={r.name} size="xs" />{r.name}<span className="faint"> · {r.city}</span></button>)}
    </div>
  );
}

/* ---------- friendly blocked page ---------- */
export function NotAllowed({ what = 'This page', role }) {
  return (
    <div className="page">
      <div className="card blocked-card">
        <span className="zero-ico big" aria-hidden="true"><IconLock size={28} /></span>
        <h2>{what} is not available for your role</h2>
        <p className="muted">You are using Solar CRM as <b>{api.ROLE_INFO[role]?.long || role}</b>. This role sees: {(api.ROLE_INFO[role]?.sees || '').toLowerCase()}. If you need this page, ask an Admin to change your access.</p>
        <Link className="btn primary" to={api.ROLE_INFO[role]?.home || '/'}>Go to my home <IconArrowRight size={15} /></Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page">
      <div className="card blocked-card">
        <span className="zero-ico big" aria-hidden="true"><IconMapSearch size={28} /></span>
        <h2>Page not found</h2>
        <p className="muted">This address does not exist (it may have been removed). Use the menu or the search box at the top.</p>
        <Link className="btn primary" to="/">Go to my home <IconArrowRight size={15} /></Link>
      </div>
    </div>
  );
}

/** App identity: a plain sun mark plus the product name. Customer documents keep the company letterhead (DocBrand). */
export const APP_NAME = 'Solar CRM';
export function SunMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="7" fill="#EE7A2B" />
      <g stroke="#F2A03A" strokeWidth="2.6" strokeLinecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" /></g>
    </svg>
  );
}
export function AppBrand({ size = 22, big = false }) {
  return <span className={'app-brand' + (big ? ' big' : '')}><SunMark size={size} /><span className="app-brand-name">{APP_NAME}</span></span>;
}

/** Letterhead used on quotation, invoice, challan and report previews: sun mark plus company details as text. */
export function DocBrand({ sub }) {
  const c = api.meta.COMPANY;
  return (
    <div className="brand">
      <SunMark size={40} />
      <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.45 }}>
        <div style={{ fontWeight: 700, color: '#1f3fb4', fontSize: 13 }}>{c.name}</div>
        <div>{c.address}</div>
        <div>{[c.web,c.phone,c.email].filter(Boolean).join(' · ')}</div>
        {sub && <div>{sub}</div>}
      </div>
    </div>
  );
}

/**
 * A customer's name (and CRN) that opens the quick look from anywhere. Use it wherever a customer is listed,
 * so staff never have to go to the Customers page to see someone's details.
 */
export function CustName({ id, name, crn, meta, strong = true, block = true }) {
  const ui = useUi();
  const sub = [crn, meta].filter(Boolean).join(' · ');
  if (!id) return <span>{name}</span>;
  return (
    <button type="button" className={'cust-link' + (block ? ' block' : '') + (strong ? ' strong' : '')}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); ui.openCustomer(id); }} title={`Quick look: ${name}`}>
      <span className="cn-name ell">{name}</span>{sub && <span className="id">{sub}</span>}
    </button>
  );
}
/** Turns any CRN written in text (chat, timeline, notes) into a link that opens that customer's quick look. */
export function LinkCRNs({ text }) {
  const ui = useUi();
  const parts = String(text || '').split(/(CRN-\d{4}-\d{3,})/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (/^CRN-\d{4}-\d{3,}$/.test(part)
    ? <button key={i} type="button" className="crn-inline" onClick={(e) => { e.stopPropagation(); ui.openCustomer(part.replace('CRN-', 'PRJ-')); }}>{part}</button>
    : part));
}

/** On a document page opened for one customer: back to that customer's Documents. */
export function BackToDocs({ pid }) {
  if (!pid) return null;
  return <Link className="btn sm" to={`/p/${pid}?tab=documents`}><IconArrowLeft size={14} /> Documents</Link>;
}
