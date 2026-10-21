import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconUser, IconArrowRight, IconBolt, IconSun, IconUserCircle, IconSearch, IconCornerDownLeft, IconX, IconClock } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { SUBPAGES, modulesFor } from '../lib/nav.js';
import { pageAllowed, homeFor } from '../lib/access.js';
import { useSession, MOD } from '../lib/hooks.jsx';

/**
 * Universal search, always visible in the top bar (desktop and phone).
 * Finds customers by name (any order, partial), phone (spaces, +91, leading 0 ignored), CRN, Project ID,
 * DISCOM consumer number, city, channel partner or dealer. Also jumps to pages and runs actions.
 */
const SearchBox = forwardRef(function SearchBox({ onOpenCustomer, toggleTheme }, ref) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState({ total: 0, rows: [] });
  const [recent, setRecent] = useState([]);
  const [idx, setIdx] = useState(0);
  const nav = useNavigate();
  const session = useSession();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  useImperativeHandle(ref, () => ({ focus: () => { inputRef.current?.focus(); setOpen(true); } }));

  useEffect(() => { let alive = true; api.search(q, 8).then((r) => alive && setRes(r.rows ? r : { total: 0, rows: [] })); setIdx(0); return () => { alive = false; }; }, [q, session.role, session.branch]);
  useEffect(() => { if (open) api.listRecent().then(setRecent); }, [open, session.role]);
  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = (t) => !s || t.toLowerCase().includes(s);
    const out = [];
    const role = session.role;
    if (!s) recent.slice(0, 6).forEach((h) => out.push({ group: 'Recently opened', icon: IconClock, label: h.name, meta: `${h.crn} · ${h.city} · ${h.kwp} kWp`, sentence: h.sentence, tone: h.tone, run: () => onOpenCustomer(h.id) }));
    res.rows.forEach((h) => out.push({ group: res.total > res.rows.length ? `Customers · top ${res.rows.length} of ${res.total}` : 'Customers', icon: IconUser, label: h.name, meta: `${h.crn} · ${h.city} · ${h.kwp} kWp`, sentence: h.sentence, tone: h.tone, run: () => onOpenCustomer(h.id) }));
    if (s) {
      if (res.total > res.rows.length && pageAllowed('projects', role)) out.push({ group: 'Customers · top ' + res.rows.length + ' of ' + res.total, icon: IconArrowRight, label: `See all ${res.total} matches in the customer list`, run: () => nav('/projects?q=' + encodeURIComponent(q)) });
      const mods = modulesFor(role);
      mods.filter((m) => match(m.label) || match(m.desc)).forEach((m) => out.push({ group: 'Pages', icon: m.icon, label: m.label, meta: m.desc, run: () => nav(m.to) }));
      SUBPAGES.filter((p) => pageAllowed(p.page, role) && match(p.label) && !mods.some((m) => m.to === p.to)).forEach((p) => out.push({ group: 'Pages', icon: IconArrowRight, label: p.label, run: () => nav(p.to) }));
      const actions = [
        { label: 'Add a new lead', page: 'add_lead', run: () => nav('/add-lead') },
        { label: 'Send payment reminders', page: 'today', run: () => nav('/today?tab=tasks#payment_reminders') },
        { label: 'Fix name mismatches', page: 'name_check', run: () => nav('/name-check') },
        { label: 'Scan serial numbers', page: 'field', run: () => nav('/field') },
        { label: 'Make a new quotation', page: 'quotes', run: () => nav('/quotes') },
        { label: 'Mark agreements signed / stamp paper ready', page: 'stamp', run: () => nav('/stamp') },
        { label: 'Switch light / dark theme', icon: IconSun, run: toggleTheme },
      ];
      actions.filter((a) => (!a.page || pageAllowed(a.page, role)) && match(a.label)).forEach((a) => out.push({ group: 'Actions', icon: a.icon || IconBolt, ...a }));
      api.ROLES.filter((r) => match('switch role ' + r) || (s.length > 2 && match('role ' + r))).forEach((r) => out.push({ group: 'Switch role (demo)', icon: IconUserCircle, label: api.ROLE_INFO[r].long, run: () => { api.setSession({ role: r }); nav(homeFor(r)); } }));
    }
    return out;
  }, [q, res, recent, session.role]); // eslint-disable-line

  const run = (it) => { it.run(); setOpen(false); setQ(''); inputRef.current?.blur(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && items[idx]) { e.preventDefault(); run(items[idx]); }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };
  useEffect(() => { boxRef.current?.querySelector('.search-item.on')?.scrollIntoView({ block: 'nearest' }); }, [idx]);

  let lastGroup = null;
  return (
    <div className="search" ref={boxRef}>
      <div className={'search-input' + (open ? ' focus' : '')}>
        <IconSearch size={16} className="faint" />
        <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder="Find a customer: name, phone, CRN, city, partner…" aria-label="Search customers, pages and actions" />
        {q ? <button className="btn sm icon ghost" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear search"><IconX size={14} /></button>
          : <span className="hide-sm search-kbd"><kbd>{MOD}</kbd><kbd>K</kbd></span>}
      </div>
      {open && (
        <div className="search-pop" role="listbox">
          {items.length === 0 && (
            <div className="zero">{q.trim() ? <>No customer, page or action matches “{q}”.<div className="zero-hint">Try part of the name, the last 4–5 digits of the phone, or the CRN number.</div></> : <>Start typing to find a customer.<div className="zero-hint">Customers you open will be listed here for quick access.</div></>}</div>
          )}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="search-group">{it.group}</div> : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <div key={i}>
                {head}
                <div className={'search-item' + (i === idx ? ' on' : '')} onMouseEnter={() => setIdx(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => run(it)} role="option" aria-selected={i === idx}>
                  <Icon size={17} className="faint" />
                  <span className="si-main">
                    <span className="si-label">{it.label}{it.meta && <span className="si-meta"> {it.meta}</span>}</span>
                    {it.sentence && <span className={'si-sent tone-' + (it.tone || 'none')}>{it.sentence}</span>}
                  </span>
                  {i === idx && <IconCornerDownLeft size={14} className="faint hide-sm" />}
                </div>
              </div>
            );
          })}
          <div className="search-foot hide-sm"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span style={{ marginLeft: 'auto' }}>Tip: type “switch role” to try another role</span></div>
        </div>
      )}
    </div>
  );
});
export default SearchBox;
