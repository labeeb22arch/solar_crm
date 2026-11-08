import InlineFilePreview from '../components/InlineFilePreview.jsx';
import { useRef, useState } from 'react';
import { useModalFocus } from '../lib/useModalFocus.js';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../data/api.js';
import { TRACKING_STATUSES, LOAN_DOCS, trackingStatus, eligibleTracking, trackingLabel } from '../lib/financeTracking.js';
import { useData, useSession, useToast, fdateY, ftime, inr } from '../lib/hooks.jsx';
import { PageHead, CustName, Empty } from '../components/ui.jsx';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const label = trackingLabel;
export default function FinanceTracking({ kind }) {
  const session = useSession();
  const [params,setParams] = useSearchParams();
  const [version,setVersion] = useState(0);
  const [rows] = useData(() => api.listFinanceTracking(kind), [kind, session.role, session.branch, version]);
  const [query,setQuery] = useState('');
  const status = params.get('status') || 'all';
  const list = (rows || []).filter((r) => (status==='all' || r.tracking.status===status) && `${r.name} ${r.crn} ${r.bank} ${r.city}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page">
    <PageHead title={kind==='subsidy'?'Subsidy tracking':'Loan tracking'} sub={kind==='subsidy'?'Customer subsidy tags, application dates and response history.':'Customer loan tags, bank references and payment-release history.'}/>
    <div className="row" style={{gap:8, flexWrap:'wrap',marginBottom:18}}>{[['all','All customers'],...TRACKING_STATUSES[kind]].map(([key,title])=><button className={'btn '+(status===key?'primary':'')} key={key} onClick={()=>setParams(key==='all'?{}:{status:key})}>{title} · {(rows||[]).filter((r)=>key==='all'||r.tracking.status===key).length}</button>)}</div>
    <input className="input" style={{maxWidth:400, marginBottom:18}} placeholder="Search customer, bank or reference" aria-label="Search tracking customers" value={query} onChange={(e)=>setQuery(e.target.value)}/>
    {rows===null?<p>Loading customers…</p>:!list.length?<Empty>No customers in this view.</Empty>:list.map((r)=><TrackingCustomer key={kind+r.id} row={r} kind={kind} refresh={()=>setVersion((v)=>v+1)}/>)}
  </div>;
}
export function TrackingDetails({project:p,kind,compact=false}) {
 const r={...p,...p.summary,tracking:{...p.financeTracking?.[kind],status:trackingStatus(p,kind)},legacyHistory:kind==='subsidy'?(p.subsidy||[]).filter(e=>!e.trackingId):[],documentLinks:p.docLinks||{}};
 return eligibleTracking(p,kind)?<TrackingBody row={r} kind={kind} compact={compact} refresh={()=>{}}/>:null;
}
function TrackingCustomer({row:r,kind,refresh}) {
 const [open,setOpen]=useState(false); const [params]=useSearchParams(); const origin=`/money/${kind==='loan'?'loans':'subsidy'}?${params}`;
 return <article className="card card-b tracking-customer"><div className="row" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><Link className="customer-name" to={`/p/${r.id}?tab=finance&returnTo=${encodeURIComponent(origin)}`}>{r.name}</Link><p className="small faint">{r.crn} · {r.city} · {r.bank||''}</p></div><button className="btn" aria-expanded={open} onClick={()=>setOpen(!open)}>{label(kind,r.tracking.status)} · {open?'Close':'View status / history'}</button></div>{open&&<TrackingBody row={r} kind={kind} refresh={refresh}/>}</article>;
}
function TrackingBody({row:r,kind,refresh}) {
  const [pendingStatus,setPendingStatus]=useState(null);
  const history=r.tracking.history || [];
  return <section className="tracking-details">
    <h3>{kind==='loan'?'Loan':'Subsidy'}</h3><div className="tracking-mini-tags" aria-label={`${kind} status tags`}>{TRACKING_STATUSES[kind].map(([key,title])=><button type="button" key={key} className={'btn sm '+(r.tracking.status===key?'primary':'')} aria-pressed={r.tracking.status===key} disabled={!api.canDo('money_edit')||r.tracking.status===key} onClick={()=>setPendingStatus(key)}>{title}</button>)}</div>
    {pendingStatus&&<TrackingTagConfirmation project={r} kind={kind} status={pendingStatus} onClose={()=>setPendingStatus(null)} onSaved={refresh}/>}

    <h3 className="tracking-history-title">{kind==='loan'?'Loan history':'Subsidy history'}</h3>{!history.length&&!(r.legacyHistory||[]).length?<p className="small faint">No status updates recorded yet.</p>:<ol className="warranty-events">{history.slice().reverse().map((event)=><li key={event.id}><b>{label(kind,event.status)} · {fdateY(event.date)}</b><div className="small faint">Recorded {fdateY(event.at)} · {ftime(event.at)} by {event.by}</div>{event.reference&&<p>Reference: {event.reference}</p>}{event.amount!==null&&event.amount!==undefined&&<p>Amount: {inr(event.amount)}</p>}{event.note&&<p style={{whiteSpace:'pre-wrap'}}>{event.note}</p>}</li>)}{(r.legacyHistory||[]).map((event,i)=><li key={'old'+i}>{event.status} · {fdateY(event.at)}</li>)}</ol>}
    {kind==='loan'&&<details><summary>Loan documents · 3 checks</summary><h3>Loan document submissions</h3><p className="small faint">Record when each paper was handed to the bank or uploaded to its portal.</p>{LOAN_DOCS.filter(([key])=>key!=='pm_surya_ghar'||r.scheme==='pm_surya_ghar').map(([key,title])=><LoanDocument key={key} row={r} docKey={key} title={title} refresh={refresh}/>)}</details>}
  </section>;
}
function TrackingTagConfirmation({project,kind,status,onClose,onSaved}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reason,setReason]=useState('');
 const dialog=useRef(null);useModalFocus(dialog,onClose,busy);
 const [fromStatus]=useState(project.tracking.status);
 const toast=useToast();
 const title=kind==='loan'?'Loan':'Subsidy';
 return <><div className="overlay" onClick={()=>{if(!busy)onClose();}}/><form ref={dialog} className="decision-dialog card card-b" role="dialog" aria-modal="true" aria-labelledby="tracking-confirm-title" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api.updateFinanceTracking(project.id,kind,{status,date:today(),expectedStatus:fromStatus,note:reason,reference:'',amount:''});onSaved();toast(title+' status added to history');onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}}><h2 id="tracking-confirm-title">Confirm {kind} status?</h2><p><strong>{project.name}</strong></p><p>{label(kind,fromStatus)} → <strong>{label(kind,status)}</strong></p><p className="small faint">This records {title.toLowerCase()} history for {fdateY(today())}. Customer payments remain unchanged.</p>{status==='rejected'&&<label className="fld"><span>Rejection reason</span><textarea className="input" required value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>}{error&&<p className="form-err" role="alert">{error}</p>}<div className="row" style={{gap:10,marginTop:18}}><button type="button" className="btn" disabled={busy} onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy?'Saving…':'Confirm status'}</button></div></form></>;
}
function LoanDocument({row:r,docKey,title,refresh}) {
  const [paper,setPaper]=useState('');
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
  if(paper)return <InlineFilePreview url={paper} title={title} onClose={()=>setPaper('')}/>;
  return <div className="loan-document-row"><div className="row" style={{gap:12,flexWrap:'wrap',justifyContent:'space-between'}}><strong>{title}</strong><span>{current?.status==='submitted'?'Submitted '+fdateY(current.date):current?.status==='ready'?'Ready':'Submission pending'}</span>{linked&&<button type="button" className="btn sm" onClick={()=>setPaper(linked.url)}>View paper</button>}{api.canDo('money_edit')&&<button className="btn sm" onClick={()=>{setStatus(current?.status||'pending');setDate(current?.date||today());setEditing(!editing);}}>Record paperwork</button>}</div>{editing&&<form className="document-setup-form" onSubmit={save}><label className="fld"><span>Paper status</span><select className="select" value={status} disabled={busy} onChange={(e)=>setStatus(e.target.value)}><option value="pending">Pending</option><option value="ready">Ready</option><option value="submitted">Submitted to bank</option></select></label><label className="fld"><span>Date</span><input className="input" type="date" max={today()} required value={date} disabled={busy} onChange={(e)=>setDate(e.target.value)}/></label><label className="fld"><span>Receipt / submission reference</span><input className="input" value={reference} disabled={busy} onChange={(e)=>setReference(e.target.value)}/></label><button className="btn primary" disabled={busy}>Save</button><button className="btn" type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button>{error&&<div className="form-err" role="alert">{error}</div>}</form>}{!!current?.history?.length&&<details><summary className="small" style={{cursor:'pointer',marginTop:8}}>Submission history</summary>{current.history.slice().reverse().map((event,i)=><p className="small" key={i}>{event.status} · {fdateY(event.date)} · {event.by}{event.reference?' · '+event.reference:''}</p>)}</details>}</div>;
}
