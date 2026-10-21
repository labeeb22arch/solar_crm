import Procurement from './Procurement.jsx';
import WarrantyRecords from './WarrantyRecords.jsx';
import DeliveryBatches from './DeliveryBatches.jsx';
import { useEffect, useState } from 'react';
import { NavLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { IconPrinter, IconFileText, IconArrowLeft, IconCheck, IconUpload, IconFileSpreadsheet, IconTruck, IconChevronRight, IconCircleCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, useUi, inr, inrK, fdate, fdateY } from '../lib/hooks.jsx';
import { PageHead, Pill, Dot, Empty, DocBrand, CustName, LinkCRNs } from '../components/ui.jsx';
import { CustomerPicker } from './Quotes.jsx';
import { MODULES, SUBPAGES, modulesFor, subpagesFor } from '../lib/nav.js';
import { ROLE_INFO } from '../lib/access.js';
import { SignLinkButton, signLabel } from '../components/SignLink.jsx';
import { AgreementPreview } from '../docs/agreement/AgreementPreview.jsx';
import { agreementData, todayDdMmYyyy } from '../docs/agreement/data.js';

export function SubNav({ parent }) {
  const session = useSession();
  const subs = subpagesFor(session.role, parent);
  if (subs.length < 2) return null;
  return <nav className="subnav">{subs.map((s) => <NavLink key={s.to} to={s.to}>{s.label}</NavLink>)}</nav>;
}

/* ---------------- Supply ---------------- */
export function Inventory() {
  const [rows] = useData(() => api.listInventory(), []);
  return (
    <div className="page">
      <PageHead title="Stock & dispatch" sub="Inventory: what is in the main warehouse (Deesa), what is already reserved for customers, and what needs re-ordering." />
      <SubNav parent="supply" />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>SKU</th><th>Item</th><th className="r">In stock</th><th className="r">Reserved</th><th className="r">Free</th><th style={{ width: 160 }} className="hide-sm">Reserved share</th><th /></tr></thead>
          <tbody>
            {(rows || []).map((r) => {
              const free = r.stock - r.reserved;
              const low = free < r.reorder * 0.5 && r.reorder > 0;
              return (
                <tr key={r.sku}>
                  <td className="id">{r.sku}</td><td>{r.name}</td>
                  <td className="r num">{r.stock.toLocaleString('en-IN')} <span className="faint small">{r.unit}</span></td>
                  <td className="r num">{r.reserved.toLocaleString('en-IN')}</td>
                  <td className="r num" style={low ? { color: 'var(--coral)' } : null}>{free.toLocaleString('en-IN')}</td>
                  <td className="hide-sm"><div className={'bar' + (low ? ' warn' : '')}><i style={{ width: (r.stock ? r.reserved / r.stock * 100 : 0) + '%' }} /></div></td>
                  <td>{low ? <Pill tone="coral">Reorder</Pill> : r.stock === 0 ? <Pill>DISCOM-supplied</Pill> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BOM() { return <Procurement />; }

export function Dispatch({ kind }) { return <DeliveryBatches kind={kind} />; }

/* ---------------- Installs ---------------- */
export function Installs() {
  const session = useSession();
  const [refresh, setRefresh] = useState(0);
  const [rows] = useData(() => api.listInstalls(), [session.role, session.branch, session.teamId, session.technician, refresh]);
  const ui = useUi();
  const toast = useToast();
  const [team, setTeam] = useState('');
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [week, setWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(api.meta.TODAY);
  const [assignedTeam, setAssignedTeam] = useState('');
  const [editing, setEditing] = useState(null);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const teams = (rows || []).filter((r) => !team || r.team === team);
  const list = teams.filter((r) => (view === 'all' || (view === 'today' ? r.installDate === api.meta.TODAY && r.installationView !== 'completed' : view === 'current' ? r.installationView !== 'completed' : r.installationView === view)) && `${r.name} ${r.crn} ${r.city}`.toLowerCase().includes(query.toLowerCase()));
  const tabs = [['all', 'All installations'], ['today', 'Today'], ['current', 'Scheduled'], ['rescheduled', 'Rescheduled'], ['completed', 'Completed']];
  const count = (key) => teams.filter((r) => key === 'all' || (key === 'today' ? r.installDate === api.meta.TODAY && r.installationView !== 'completed' : key === 'current' ? r.installationView !== 'completed' : r.installationView === key)).length;
  const start = new Date(api.meta.TODAY + 'T00:00:00');
  start.setDate(start.getDate() - 1 + week * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const shown = list.filter((r) => selectedDay === null || (selectedDay === 'unscheduled' ? !r.installDate && r.installationView !== 'completed' : r.installDate === selectedDay));
  const chooseJob = (job) => { setEditing(job); setDate(job.installDate || (selectedDay && selectedDay !== 'unscheduled' ? selectedDay : '')); setAssignedTeam(job.team || ''); setReason(''); setError(''); };
  const navigateWeek = (value) => { setWeek(value); const first = new Date(api.meta.TODAY+'T00:00:00'); first.setDate(first.getDate()-1+value*7); setSelectedDay(`${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(first.getDate()).padStart(2,'0')}`); if (view === 'today') setView('all'); };
  const save = async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.rescheduleInstallation(editing.id, date, reason, assignedTeam); setEditing(null); setSelectedDay(date); setWeek(Math.floor(((new Date(date+'T00:00:00') - new Date(api.meta.TODAY+'T00:00:00')) / 86400000 + 1) / 7)); setRefresh((n) => n + 1); toast('Installation date saved'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="page">
    <PageHead title="Installations" sub="Choose a day to see its customers, teams and installation progress.">
      <select className="select" aria-label="Installation team" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">All teams</option>{api.meta.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}</select>
    </PageHead>
    <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {tabs.map(([key, label]) => <button key={key} className={'btn ' + (view === key ? 'primary' : '')} aria-pressed={view === key} onClick={() => { setView(key); setSelectedDay(key === 'today' ? api.meta.TODAY : null); if (key === 'today') setWeek(0); }}>{label} · {count(key)}</button>)}
      <input className="input" style={{ maxWidth: 280 }} aria-label="Search installations" placeholder="Search customer, reference or city" value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>
    <section className="installation-planner">
      <div className="installation-calendar-heading"><h2>Installation schedule</h2><div className="row" style={{ gap: 8 }}><button className="btn sm" onClick={() => navigateWeek(week - 1)} aria-label="Previous week">←</button><button className="btn sm" onClick={() => { navigateWeek(0); setSelectedDay(api.meta.TODAY); }}>This week</button><button className="btn sm" onClick={() => navigateWeek(week + 1)} aria-label="Next week">→</button></div></div>
      <div className="installation-week" aria-label="Choose installation date">{days.map((d) => { const jobs = list.filter((r) => r.installDate === d); const dd = new Date(d + 'T00:00:00'); const done = jobs.filter((r) => r.installationView === 'completed').length; return <button type="button" key={d} className={'installation-day' + (selectedDay === d ? ' selected' : '') + (d === api.meta.TODAY ? ' is-today' : '')} aria-pressed={selectedDay === d} onClick={() => { setSelectedDay(d); if (view === 'today') setView('all'); }}>
        <span>{d === api.meta.TODAY ? 'Today' : dd.toLocaleDateString('en-IN', { weekday: 'short' })}</span><strong>{dd.getDate()}</strong><small>{dd.toLocaleDateString('en-IN', { month: 'short' })}</small><b>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</b>{done > 0 && <small>{done} installed</small>}
      </button>; })}</div>
      <div className="installation-results-heading"><div><h2>{selectedDay === null ? 'All installation customers' : selectedDay === 'unscheduled' ? 'Waiting for a date' : selectedDay === api.meta.TODAY ? 'Today’s installations' : `Installations · ${fdateY(selectedDay)}`}</h2><span className="small faint">{shown.length} customers{team ? ` · ${api.meta.TEAMS.find((t) => t.id === team)?.name}` : ''}</span></div><div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><button className={'btn sm' + (selectedDay === null ? ' primary' : '')} onClick={() => { setSelectedDay(null); if (view === 'today') setView('all'); }}>All dates</button><button className={'btn sm' + (selectedDay === 'unscheduled' ? ' primary' : '')} onClick={() => { setSelectedDay('unscheduled'); setView('all'); }}>Unscheduled · {teams.filter((r) => !r.installDate && r.installationView !== 'completed').length}</button></div></div>
      <div className="installation-customers">
        {rows === null ? <div className="card-b">Loading installations…</div> : !shown.length ? <Empty hint="Choose another day or All dates to see more customers.">No installations in this view.</Empty> : shown.map((r) => <article className="installation-customer" key={r.id}>
          <div className="installation-customer-identity"><CustName id={r.id} name={r.name} crn={r.crn}/><span className="small faint">{r.city} · {r.kwp} kWp</span></div>
          <div className="installation-customer-progress"><Pill status={r.installationView === 'completed' ? 'done' : 'in_progress'}>{r.installationView === 'completed' ? 'Installed' : r.installationView === 'rescheduled' ? 'Rescheduled' : !r.installDate ? 'Needs a date' : r.installDate === api.meta.TODAY ? 'Today’s installation' : 'Scheduled'}</Pill><span className="small">{r.teamInfo?.name || 'Team not assigned'}</span><span className="small faint">{r.installDate ? fdateY(r.installDate) : 'Not scheduled'}</span>{r.previousInstallDate && <small className="faint">Moved from {fdateY(r.previousInstallDate)}{r.rescheduleReason ? ` · ${r.rescheduleReason}` : ''}</small>}</div>
          <div className="installation-customer-actions"><button className="btn sm" onClick={() => ui.openCustomer(r.id)}>Open customer <IconChevronRight size={14}/></button>{r.installationView !== 'completed' && api.canDo('edit') && <button className="btn sm" onClick={() => chooseJob(r)}>{r.installDate ? 'Team / Reschedule' : 'Schedule & assign team'}</button>}</div>
        </article>)}
      </div>
    </section>
    {editing && <><div className="overlay" onClick={() => { if (!busy) setEditing(null); }} /><form className="side-panel user-form" role="dialog" aria-modal="true" aria-labelledby="install-date-title" onSubmit={save}>
      <div className="card-h" id="install-date-title">{editing.installDate ? 'Reschedule installation' : 'Schedule installation'}</div><div className="user-form-body"><b>{editing.name}</b>{editing.installDate && <p>Current date: {fdateY(editing.installDate)}</p>}<label className="fld"><span>New date</span><input autoFocus className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} /></label><label className="fld"><span>Installation team</span><select className="select" value={assignedTeam} required onChange={(e) => setAssignedTeam(e.target.value)} disabled={busy}><option value="">Choose installation team</option>{api.meta.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}</select></label><label className="fld"><span>Reason (optional)</span><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} /></label>{error && <div className="form-err" role="alert">{error}</div>}</div>
      <div className="user-form-foot"><button type="button" className="btn" disabled={busy} onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save date'}</button></div>
    </form></>}
  </div>;
}

/* ---------------- Grid ---------------- */
export function DiscomDocs() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const open = params.get('a');
  const [rows] = useData(() => api.listDiscomDocs(), [session.role, session.branch]);
  const ui = useUi();
  if (open) return <AgreementScreen pid={open} onBack={() => setParams({})} />;
  return (
    <div className="page">
      <PageHead title="Electricity board (DISCOM)" sub="Documents for the DISCOM file, per customer. A file is ready to submit when every column is ticked. Open the agreement to print it or download the PDF, and send the customer a link to sign it on their phone." />
      <div className="doc-preview" style={{ padding: '14px 18px', marginBottom: 14, boxShadow: 'none', border: '1px solid var(--line-soft)' }}><DocBrand sub="Applicant / installer for DISCOM rooftop solar submissions" /></div>
      <SubNav parent="grid" />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>DISCOM</th>{(rows?.[0]?.docs || []).map((d) => <th key={d.k} className="hide-sm" style={{ textAlign: 'center' }} title={d.k}>{d.k.split(' ')[0]}</th>)}<th className="r">Ready</th><th>Submission</th><th>Customer signature</th><th>Agreement</th></tr></thead>
          <tbody>{(rows || []).map((r) => { const ok = r.docs.filter((d) => d.ok).length; return (
            <tr key={r.pid} className="click" onClick={() => ui.openCustomer(r.pid)}>
              <td><CustName id={r.pid} name={r.name} crn={r.crn} /></td><td>{r.discom}</td>
              {r.docs.map((d) => <td key={d.k} className="hide-sm" style={{ textAlign: 'center' }}>{d.ok ? <IconCheck size={15} style={{ color: 'var(--accent-text)' }} /> : <span className="dot not_started" style={{ display: 'inline-block' }} />}</td>)}
              <td className="r num">{ok}/{r.docs.length}</td><td><Pill status={r.submission} /></td>
              <td><span className={'sign-state ' + r.sign.state}>{signLabel(r.sign)}</span></td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => setParams({ a: r.pid })}><IconFileText size={14} /> Open agreement</button>
                  {r.sign.state !== 'signed' && <SignLinkButton pid={r.pid} small label="Send signing link" />}
                </div>
              </td>
            </tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}

function AgreementScreen({ pid, onBack }) {
  const [p] = useData(() => api.getProject(pid), [pid]);
  const [assets] = useData(() => api.getCompanyAssets(), []);
  const [opts, setOpts] = useState({ executionDate: todayDdMmYyyy(), showHighlights: true });
  if (!p || !assets) return <div className="page"><Empty>Loading…</Empty></div>;
  if (p.notFound || p.forbidden) return <div className="page"><Empty>This customer is not in your list.</Empty><button className="btn" onClick={onBack}>Back to the list</button></div>;
  const data = agreementData(p, assets, opts);
  const sign = p.signature?.png ? `Customer signed ${fdate(p.signature.at)}` : p.signRequest?.status === 'sent' ? (new Date(p.signRequest.expiresAt) < new Date() ? 'Signing link expired' : 'Signing link sent') : 'Not signed';
  return (
    <div className="page ag-screen">
      <div className="slide-bar" style={{ paddingLeft: 0 }}><button className="btn sm ghost" onClick={onBack}><IconArrowLeft size={15} /> DISCOM documents</button></div>
      <PageHead title={`Agreement for ${p.name}`} sub="The PM Surya Ghar model agreement (4 pages) filled in for this customer. Yellow marks show the customer's details; they are left out of the PDF and the printout." />
      <div className="ag-fields card card-b">
        <label className="stack" style={{ gap: 4 }}><span className="faint small">Agreement date</span><input className="input" value={opts.executionDate} onChange={(e) => setOpts({ ...opts, executionDate: e.target.value })} placeholder="dd-mm-yyyy" /></label>
        <div className="stack" style={{ gap: 6 }}>
          <span className="faint small">Customer signature</span>
          <span className={'sign-state ' + (p.signature?.png ? 'signed' : p.signRequest?.status === 'sent' ? 'sent' : 'none')}>{sign}</span>
          {!p.signature?.png && <SignLinkButton pid={p.id} small />}
        </div>
        {/* Company sign and stamp setup is disabled. */}
      </div>
      <AgreementPreview data={data} onChange={(d) => setOpts({ ...opts, showHighlights: d.showHighlights })} />
    </div>
  );
}

export function Invoices() {
  const session = useSession();
  const [rows] = useData(() => api.listInvoices(), [session.role, session.branch]);
  const [sel, setSel] = useState(null);
  const [params] = useSearchParams();
  const want = params.get('p');   // opened from Documents for one customer
  const cur = rows && (rows.find((r) => r.no === sel) || (want && rows.find((r) => r.pid === want)) || rows[0]);
  return (
    <div className="page">
      <PageHead title="Money" sub="Bills and invoices for customers who have paid or are connected to the grid." />
      <SubNav parent="money" />
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card tbl-wrap" style={{ maxHeight: '72vh' }}>
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Customer</th><th className="r">Total</th><th className="r hide-sm">Paid</th></tr></thead>
            <tbody>{(rows || []).map((r) => (
              <tr key={r.no} className="click" onClick={() => setSel(r.no)} style={cur && cur.no === r.no ? { background: 'var(--surface-2)' } : null}>
                <td className="id">{r.no}</td><td><CustName id={r.pid} name={r.name} strong={false} /></td><td className="r num">{inrK(r.value)}</td><td className="r num hide-sm">{Math.round(r.paid / r.value * 100)}%</td>
              </tr>))}</tbody>
          </table>
        </div>
        {cur && (
          <div className="doc-preview">
            <div className="row" style={{ alignItems: 'flex-start' }}><DocBrand sub={'GSTIN ' + api.meta.COMPANY.gstin} />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}><h2>Tax invoice</h2><div className="mono" style={{ fontSize: 12 }}>{cur.no}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{fdateY(cur.date)}</div></div></div>
            <div style={{ marginTop: 14, fontSize: 12.5 }}>Bill to <b><CustName id={cur.pid || cur.id} name={cur.name} block={false} /></b>, {cur.city} · <span className="mono">{cur.crn}</span></div>
            <table><thead><tr><th>Description</th><th className="r">Amount</th></tr></thead>
              <tbody>
                <tr><td>Supply of {cur.kwp} kWp solar PV system (HSN 8541)</td><td className="r mono">{inr(cur.base * 0.7)}</td></tr>
                <tr><td>Installation & commissioning services (SAC 9954)</td><td className="r mono">{inr(cur.base * 0.3)}</td></tr>
                <tr><td>GST (70% @12%, 30% @18%)</td><td className="r mono">{inr(cur.gst)}</td></tr>
                <tr><td><b>Total</b></td><td className="r mono"><b>{inr(cur.value)}</b></td></tr>
                <tr><td>Received</td><td className="r mono">{inr(cur.paid)}</td></tr>
                <tr><td><b>Balance</b></td><td className="r mono"><b>{inr(cur.value - cur.paid)}</b></td></tr>
              </tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}

const COMM = { cp: 'Channel partner commission', install: 'Installation commission', vendor: 'Vendor commission' };
export function Commissions({ kind }) {
  const session = useSession();
  const [rows] = useData(() => api.listCommissions(kind), [kind, session.role, session.branch, session.cpId]);
  const toast = useToast();
  const key = kind === 'cp' ? 'cp_comm' : kind === 'install' ? 'inst_comm' : 'vendor_comm';
  const due = (rows || []).filter((r) => r.status !== 'done' && r.eligible).reduce((s, r) => s + r.amount, 0);
  const paidSum = (rows || []).filter((r) => r.status === 'done').reduce((s, r) => s + r.amount, 0);
  return (
    <div className="page">
      <PageHead title="Money" sub={COMM[kind]}>
        <div className="stat"><div className="v num" style={{ fontSize: 15 }}>{inrK(due)}</div><div className="l">payable now</div></div>
        <div className="stat"><div className="v num" style={{ fontSize: 15 }}>{inrK(paidSum)}</div><div className="l">paid</div></div>
      </PageHead>
      <SubNav parent="money" />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Payee</th><th className="hide-sm">Basis</th><th className="r">Amount</th><th>Status</th><th /></tr></thead>
          <tbody>{(rows || []).map((r, i) => (
            <tr key={r.pid + i}>
              <td><CustName id={r.pid} name={r.name} crn={r.crn} strong={false} /></td><td className="small">{r.party}</td><td className="small muted hide-sm">{r.basis}</td>
              <td className="r num">{inr(r.amount)}</td>
              <td>{r.status === 'done' ? <Pill status="done">Paid</Pill> : r.eligible ? <Pill status="in_progress">Payable</Pill> : <Pill>Awaiting commissioning</Pill>}</td>
              <td className="r">{r.status !== 'done' && r.eligible && api.canDo('money_edit') && <button className="btn sm" onClick={async () => { await api.setClosureItem(r.pid, r.key || key, 'done'); toast('Marked paid · ' + r.crn); }}>Mark paid</button>}</td>
            </tr>))}</tbody>
        </table>
        {rows && rows.length === 0 && <Empty hint="Lines appear once a customer with a partner, crew or vendor reaches the right step.">No commission lines.</Empty>}
      </div>
    </div>
  );
}

/* ---------------- Warranty ---------------- */
export function Warranty() { return <WarrantyRecords />; }

/* ---------------- Team ---------------- */
export function Attendance() {
  const [rows] = useData(() => api.listAttendance(), []);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(api.meta.TODAY + 'T00:00:00'); d.setDate(d.getDate() - 13 + i); return d; });
  return (
    <div className="page">
      <PageHead title="Team" sub="Attendance of field staff for the last 14 days (GPS check-in, demo data)." />
      <SubNav parent="team" />
      <div className="card card-b" style={{ overflowX: 'auto' }}>
        <div className="att" style={{ minWidth: 560 }}>
          <span />{days.map((d, i) => <span key={i} className="faint mono" style={{ fontSize: 10, textAlign: 'center' }}>{d.getDate()}</span>)}
          {(rows || []).map((r) => (
            <div key={r.name} style={{ display: 'contents' }}>
              <span className="ell"><b style={{ fontWeight: 550 }}>{r.name}</b><div className="faint" style={{ fontSize: 11 }}>{r.role} · in {r.checkIn} · {r.site}</div></span>
              {r.days.map((d, i) => <span key={i} className={'c ' + d} title={d} />)}
            </div>
          ))}
        </div>
        <div className="row small faint" style={{ marginTop: 12, gap: 14 }}><span className="row"><span className="c present" style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)' }} /> present</span><span className="row"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--violet)' }} /> half day</span><span className="row"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--coral)' }} /> absent</span></div>
      </div>
    </div>
  );
}
/* ---------------- Activity ---------------- */
export function Activity() {
  const [rows] = useData(() => api.listActivity(150), []);
  const ui = useUi();
  return (
    <div className="page">
      <PageHead title="Activity log" sub="Every change, message and payment for the customers you can see, newest first." />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>When</th><th>Customer</th><th>Event</th><th className="hide-sm">By</th></tr></thead>
          <tbody>{(rows || []).map((e, i) => (
            <tr key={i} className="click" onClick={() => ui.openCustomer(e.pid)}>
              <td className="num small" style={{ whiteSpace: 'nowrap' }}>{fdate(e.at)}</td><td><div className="ell" style={{ maxWidth: 180 }}>{e.customer}</div><div className="id">{e.crn}</div></td>
              <td className="small"><span className="pill" style={{ marginRight: 6 }}>{e.type}</span><LinkCRNs text={e.text} /></td><td className="small muted hide-sm">{e.by}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- More (phone) ---------------- */
export function More() {
  const session = useSession();
  const nav = useNavigate();
  const mods = modulesFor(session.role);
  return (
    <div className="page">
      <PageHead title="All pages" sub={`Everything you can open as ${ROLE_INFO[session.role].long}.`} />
      <div className="card">
        {mods.map((m) => (
          <div key={m.key} className="oi" style={{ alignItems: 'center', cursor: 'pointer', padding: '12px 14px' }} onClick={() => nav(m.to)}>
            <m.icon size={19} className="faint" /><span className="grow"><span style={{ fontWeight: 600, display: 'block' }}>{m.label}</span><span className="small muted">{m.desc}</span></span><IconChevronRight size={16} className="faint" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModuleIndex({ to }) { return <Navigate to={to} replace />; }
export { MODULES };
