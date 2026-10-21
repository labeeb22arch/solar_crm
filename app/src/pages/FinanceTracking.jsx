import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../data/api.js';
import { TRACKING_STATUSES, LOAN_DOCS } from '../lib/financeTracking.js';
import { useData, useSession, useToast, fdateY, inr } from '../lib/hooks.jsx';
import { PageHead, CustName, Empty } from '../components/ui.jsx';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const label = (kind, status) => TRACKING_STATUSES[kind].find(([key]) => key === status)?.[1] || status;
export default function FinanceTracking({ kind }) {
  const session = useSession();
  const [params,setParams] = useSearchParams();
  const [version,setVersion] = useState(0);
  const [rows] = useData(() => api.listFinanceTracking(kind), [kind, session.role, session.branch, version]);
  const [query,setQuery] = useState('');
  const status = params.get('status') || 'all';
  const list = (rows || []).filter((r) => (status==='all' || r.tracking.status===status) && `${r.name} ${r.crn} ${r.bank} ${r.city}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page">
    <PageHead title={kind==='subsidy'?'Subsidy tracking':'Loan tracking'} sub={kind==='subsidy'?'Applications, rejections, reapplications and subsidy receipts.':'Bank applications and the papers submitted for each customer.'}/>
    <div className="row" style={{gap:8, flexWrap:'wrap',marginBottom:18}}>{[['all','All customers'],...TRACKING_STATUSES[kind]].map(([key,title])=><button className={'btn '+(status===key?'primary':'')} key={key} onClick={()=>setParams(key==='all'?{}:{status:key})}>{title} · {(rows||[]).filter((r)=>key==='all'||r.tracking.status===key).length}</button>)}</div>
    <input className="input" style={{maxWidth:400, marginBottom:18}} placeholder="Search customer, bank or reference" aria-label="Search tracking customers" value={query} onChange={(e)=>setQuery(e.target.value)}/>
    {rows===null?<p>Loading customers…</p>:!list.length?<Empty>No customers in this view.</Empty>:list.map((r)=><TrackingCustomer key={kind+r.id} row={r} kind={kind} refresh={()=>setVersion((v)=>v+1)}/>)}
  </div>;
}
function TrackingCustomer({row:r,kind,refresh}) {
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({status:r.tracking.status,date:today(),reference:'',note:'',amount:''});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const toast=useToast();
  const save=async(e)=>{e.preventDefault();setBusy(true);setError('');try{await api.updateFinanceTracking(r.id,kind,form);setEditing(false);refresh();toast('Tracking history saved');}catch(e){setError(e.message);}finally{setBusy(false);}};
  const history=r.tracking.history || [];
  return <details className="card" style={{marginBottom:14}}><summary className="warranty-issue-summary"><strong>{r.name}</strong><span>{r.crn} · {r.city}</span><b>{label(kind,r.tracking.status)}</b><span>{kind==='loan'?r.bank||'Bank not recorded':'PM Surya Ghar / subsidy file'}</span></summary><div className="card-b">
    <div className="row" style={{gap:10,flexWrap:'wrap',marginBottom:18}}><CustName id={r.id} name={r.name} crn={r.crn}/><Link className="btn sm" to={`/documents?p=${r.id}`}>Open customer documents</Link>{api.canDo('money_edit')&&<button className="btn primary sm" onClick={()=>{setForm({status:r.tracking.status,date:today(),reference:'',note:'',amount:''});setEditing(!editing);setError('');}}>Record status update</button>}</div>
    {editing&&<form onSubmit={save}><div className="warranty-fields"><label className="fld"><span>Status</span><select className="select" value={form.status} disabled={busy} onChange={(e)=>setForm({...form,status:e.target.value})}>{TRACKING_STATUSES[kind].map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><label className="fld"><span>Application / event date</span><input className="input" type="date" required max={today()} value={form.date} disabled={busy} onChange={(e)=>setForm({...form,date:e.target.value})}/></label><label className="fld"><span>Application / bank reference</span><input className="input" value={form.reference} disabled={busy} onChange={(e)=>setForm({...form,reference:e.target.value})}/></label><label className="fld"><span>Amount (optional)</span><input className="input" type="number" min="0" step="0.01" value={form.amount} disabled={busy} onChange={(e)=>setForm({...form,amount:e.target.value})}/></label></div><label className="fld"><span>{form.status==='rejected'?'Rejection reason':'Update / follow-up note'}</span><textarea className="input" required={form.status==='rejected'} value={form.note} disabled={busy} onChange={(e)=>setForm({...form,note:e.target.value})}/></label>{error&&<div className="form-err" role="alert">{error}</div>}<div className="row" style={{gap:8,margin:'14px 0'}}><button className="btn primary" disabled={busy}>Save update</button><button className="btn" type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></div></form>}
    {kind==='loan'&&<><h3>Loan document submissions</h3><p className="small faint">Record when each paper was handed to the bank or uploaded to its portal.</p>{LOAN_DOCS.filter(([key])=>key!=='pm_surya_ghar'||r.scheme==='pm_surya_ghar').map(([key,title])=><LoanDocument key={key} row={r} docKey={key} title={title} refresh={refresh}/>)}</>}
    <h3>Application history</h3>{!history.length&&!r.legacyHistory.length?<p className="small faint">No status updates recorded yet.</p>:<ol className="warranty-events">{history.slice().reverse().map((event)=><li key={event.id}><b>{label(kind,event.status)} · {fdateY(event.date)}</b><div className="small faint">Recorded {fdateY(event.at)} by {event.by}</div>{event.reference&&<p>Reference: {event.reference}</p>}{event.amount!==null&&event.amount!==undefined&&<p>Amount: {inr(event.amount)}</p>}{event.note&&<p style={{whiteSpace:'pre-wrap'}}>{event.note}</p>}</li>)}{r.legacyHistory.map((event,i)=><li key={'old'+i}>{event.status} · {fdateY(event.at)}</li>)}</ol>}
  </div></details>;
}
function LoanDocument({row:r,docKey,title,refresh}) {
  const current=r.tracking.documents?.[docKey];
  const [editing,setEditing]=useState(false);
  const [status,setStatus]=useState(current?.status||'pending');
  const [date,setDate]=useState(today());
  const [reference,setReference]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const key={quotation:'quote',feasibility:'feas',pm_surya_ghar:'agreement'}[docKey];
  const linked=key&&(r.documentLinks[key] || (docKey==='quotation' ? r.documentLinks.proposal : null));
  const save=async(e)=>{e.preventDefault();setBusy(true);setError('');try{await api.updateLoanDocument(r.id,docKey,status,date,reference);setEditing(false);refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="loan-document-row"><div className="row" style={{gap:12,flexWrap:'wrap',justifyContent:'space-between'}}><strong>{title}</strong><span>{current?.status==='submitted'?'Submitted '+fdateY(current.date):current?.status==='ready'?'Ready':'Submission pending'}</span>{linked&&<a href={linked.url} className="btn sm" target="_blank" rel="noreferrer">Open paper</a>}{api.canDo('money_edit')&&<button className="btn sm" onClick={()=>{setStatus(current?.status||'pending');setDate(current?.date||today());setEditing(!editing);}}>Record paperwork</button>}</div>{editing&&<form className="document-setup-form" onSubmit={save}><label className="fld"><span>Paper status</span><select className="select" value={status} disabled={busy} onChange={(e)=>setStatus(e.target.value)}><option value="pending">Pending</option><option value="ready">Ready</option><option value="submitted">Submitted to bank</option></select></label><label className="fld"><span>Date</span><input className="input" type="date" max={today()} required value={date} disabled={busy} onChange={(e)=>setDate(e.target.value)}/></label><label className="fld"><span>Receipt / submission reference</span><input className="input" value={reference} disabled={busy} onChange={(e)=>setReference(e.target.value)}/></label><button className="btn primary" disabled={busy}>Save</button>{error&&<div className="form-err" role="alert">{error}</div>}</form>}{!!current?.history?.length&&<details><summary className="small" style={{cursor:'pointer',marginTop:8}}>Submission history</summary>{current.history.slice().reverse().map((event,i)=><p className="small" key={i}>{event.status} · {fdateY(event.date)} · {event.by}{event.reference?' · '+event.reference:''}</p>)}</details>}</div>;
}
