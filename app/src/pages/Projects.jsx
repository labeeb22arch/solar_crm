import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconSearch, IconFilter, IconPlus, IconArrowRight, IconX } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useSession, inr, fdateY, ftime } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import { Empty, Avatar } from '../components/ui.jsx';
import { customerStage, isInstalled, needsAttention } from '../lib/customerView.js';

const TABS = [['attention', 'Needs attention'], ['active', 'Active customers'], ['installed', 'Finished installations']];
const belongs = (r, tab) => tab === 'all' ? true : tab === 'attention' ? needsAttention(r) : tab === 'installed' ? isInstalled(r) : !!r.next || !isInstalled(r);
export default function Projects() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const q = params.get('q') || '';
  const tab = params.get('tab') || (params.get('view') === 'stuck' || params.get('view') === 'late' ? 'attention' : 'active');
  const stage = params.get('stage') || '';
  const payment = params.get('payment') || (params.get('view') === 'due' ? 'due' : '');
  const partner = params.get('partner') || '';
  const board = params.get('board');
  const patch = (values) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([k,v]) => v ? next.set(k,v) : next.delete(k)); setParams(next, { replace: true }); };
  useEffect(() => {
    let alive = true;
    const load = () => { setError(''); api.listProjects({ q, board }).then((r) => { if (alive) setRows(r); }).catch((e) => { if (alive) setError(e.message); }); };
    load(); const unsub = api.subscribe(load);
    return () => { alive = false; unsub(); };
  }, [q, board, session.role, session.branch]);
  useEffect(() => setLimit(20), [q, tab, stage, payment, partner, board]);
  const filtered = useMemo(() => (rows || []).filter((r) => (!stage || r.stage === stage) && (!payment || r.due > 0) && (!partner || r.partner === partner)
    && (params.get('view') !== 'loans' || r.loan) && (params.get('view') !== 'ci' || r.type !== 'Residential')), [rows, stage, payment, partner, params]);
  // Dashboard deep links remain exact; the everyday tabs apply when there is no board filter.
  const visible = filtered.filter((r) => board ? true : belongs(r, tab)).sort((a,b) => (Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||a.id.localeCompare(b.id));
  const stageRows=(rows||[]).filter((r)=>(!payment||r.due>0)&&(!partner||r.partner===partner));
  const partners = [...new Set((rows || []).map((r) => r.partner))].filter(Boolean).sort();
  const count = [stage, payment, partner].filter(Boolean).length;
  return <div className="customer-directory">
    <header className="directory-heading"><div><h1>Customers</h1><p>Know where every customer stands.</p></div>
      {pageAllowed('add_lead', session.role) && <Link className="btn primary" to="/add-lead"><IconPlus size={18}/>Add customer</Link>}
    </header>
    <div className="directory-search"><label className="directory-searchbox"><IconSearch size={20}/><input value={q} onChange={(e) => patch({ q:e.target.value })} placeholder="Search by name, phone, city or customer number…" aria-label="Search customers"/>{q && <button className="btn icon ghost" onClick={() => patch({q:''})} aria-label="Clear search"><IconX size={16}/></button>}</label>
      <button className={'btn' + (count ? ' on' : '')} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="customer-filters"><IconFilter size={18}/>Filter{count ? ` (${count})` : ''}</button>
    </div>
    <div className="customer-tabs" role="tablist" aria-label="Customer views">{TABS.map(([key,label]) => <button key={key} role="tab" aria-selected={!board && tab === key} className={!board && tab === key ? 'selected' : ''} onClick={() => patch({tab:key,board:'',view:''})}>{label}<span>{filtered.filter((r) => belongs(r,key)).length}</span></button>)}</div>
    <nav className="customer-stage-filters" aria-label="Filter customers by stage"><button className={!stage?'selected':''} aria-pressed={!stage} onClick={()=>patch({stage:''})}>All stages <span>{stageRows.length}</span></button>{api.meta.STAGES.map((s)=><button key={s.id} className={stage===s.id?'selected':''} aria-pressed={stage===s.id} onClick={()=>patch({stage:s.id,tab:'all',board:'',view:''})}>{s.label}<span>{stageRows.filter((r)=>r.stage===s.id).length}</span></button>)}</nav>
    {filtersOpen && <div className="directory-filters" id="customer-filters">
      <label>Stage<select className="select" value={stage} onChange={(e) => patch({stage:e.target.value})}><option value="">All stages</option>{api.meta.STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label>Payment<select className="select" value={payment} onChange={(e) => patch({payment:e.target.value})}><option value="">Any payment status</option><option value="due">Payment due</option></select></label>
      <label>Partner<select className="select" value={partner} onChange={(e) => patch({partner:e.target.value})}><option value="">All partners</option>{partners.map((p) => <option key={p}>{p}</option>)}</select></label>
      <button className="btn ghost" onClick={() => patch({stage:'',payment:'',partner:'',view:''})}>Clear filters</button>
    </div>}
    {board && <div className="directory-context">Showing {api.boardLabel(board)}<button className="btn sm ghost" onClick={() => patch({board:''})}>Clear selection <IconX size={14}/></button></div>}
    <p className="directory-count" role="status">{visible.length} {visible.length === 1 ? 'customer' : 'customers'}{count ? ' matching your filters' : ''} · Recently updated first</p>
    {error ? <Empty hint="Refresh the page to try again.">{error}</Empty> : !rows ? <Empty>Loading customers…</Empty> : !visible.length ? <Empty hint="Try another view, clear your filters or search for a customer.">No customers in this view.</Empty> : <div className="customer-cards">{visible.slice(0,limit).map((r) => <article className="customer-summary" key={r.id}>
      <div className="customer-identity"><Avatar name={r.name} size="lg"/><div><Link to={`/p/${r.id}?from=${encodeURIComponent(params.toString())}`} className="customer-name">{r.name}</Link><p>{r.city} · {r.kwp} kWp</p><span className="customer-stage">{customerStage(r)}</span>{r.updatedAt&&<small className="customer-last-updated">Updated {fdateY(r.updatedAt)} · {ftime(r.updatedAt)}</small>}</div></div>
      <div className="customer-next"><span className="detail-label">Next action</span><strong>{r.next?.text || 'All work complete'}</strong><small>{r.next?.owner || 'Ready for handover'}{r.next?.overdue ? ` · ${r.next.dueWords}` : ''}</small></div>
      {api.canDo('internal_money') && <div className="customer-due"><span className="detail-label">Payment due</span><strong>{r.due > 0 ? inr(r.due) : 'Nothing due'}</strong></div>}
      <Link className="customer-open" to={`/p/${r.id}?from=${encodeURIComponent(params.toString())}`}>Open customer <IconArrowRight size={17}/></Link>
    </article>)}</div>}
    {limit < visible.length && <button className="btn directory-more" onClick={() => setLimit(limit+20)}>Show more customers ({visible.length-limit} remaining)</button>}
  </div>;
}
