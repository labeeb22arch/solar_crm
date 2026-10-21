import * as api from '../data/api.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCopy, IconDownload, IconExternalLink } from '@tabler/icons-react';
import { useToast, fdateY } from '../lib/hooks.jsx';
import { Empty } from './ui.jsx';

/** Show only real request/signature state; never infer delivery from a WhatsApp click. */
export default function DocumentFlow({p,children}) {
  const [tab,setTab]=useState('create');
  const toast=useToast();
  const requests=[['agreement','Agreement',p.signRequest],['proposal','Quotation acceptance',p.proposalRequest]].filter(([, ,r])=>r?.token);
  const signatures=[['agreement','Agreement signature',p.signature],['proposal','Proposal acceptance',p.proposal?.accepted]].filter(([, ,s])=>s?.png);
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  const url=(r)=>`${location.origin}${location.pathname}#/sign/${r.token}`;
  return <section className="document-flow">
    {!!requests.length && <div className="document-journeys">{requests.map(([kind,label,r])=><DocumentJourney key={r.token} p={p} kind={kind} label={label} request={r}/>)}</div>}
    <div className="document-flow-tabs" role="tablist" aria-label="Document workflow">{[['create','Create & send'],['sent','Links sent'],['received','Received documents']].map(([k,l])=><button role="tab" aria-selected={tab===k} className={tab===k?'selected':''} key={k} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {tab==='create' && children}
    {tab==='sent' && <div className="document-flow-panel"><h2>Links sent</h2><p className="muted">Signing links prepared for this customer. Delivery is not confirmed by the CRM.</p>{local && <p className="document-local-note">Local preview: these links open on this computer. A public website is needed for customers to open them on their phones.</p>}
      {!requests.length?<Empty hint="Create a proposal or agreement, then prepare its signing link.">No signing links yet.</Empty>:requests.map(([kind,label,r])=><article className="document-flow-row" key={kind}><div><h3>{label}</h3><p>{r.status==='signed'||r.usedAt?'Signed':new Date(r.expiresAt)<new Date()?'Expired':'Awaiting signature'} · Prepared {fdateY(r.createdAt)}</p><small>Expires {fdateY(r.expiresAt)}</small></div><div className="document-flow-actions"><a className="btn sm" href={url(r)} target="_blank" rel="noreferrer">View link<IconExternalLink size={14}/></a><button className="btn sm" onClick={async()=>{try{await navigator.clipboard.writeText(url(r));toast('Link copied');}catch{toast('Clipboard unavailable');}}}><IconCopy size={14}/>Copy link</button></div></article>)}
    </div>}
    {tab==='received' && <div className="document-flow-panel"><h2>Received documents</h2><p className="muted">Signatures returned by the customer. Download the signature, or open the document generator to prepare the signed PDF.</p>
      {!signatures.length?<Empty hint="Customer signatures appear here after submission through a valid link.">No signed documents received yet.</Empty>:signatures.map(([kind,label,s])=><article className="document-flow-row" key={kind}><div><h3>{label}</h3><p>Received {fdateY(s.at)}</p><details><summary>View signature</summary><img className="received-signature" src={s.png} alt={`${p.name}'s returned signature`}/></details></div><div className="document-flow-actions"><a className="btn sm" href={s.png} download={`${p.crn}-${kind}-signature.png`}><IconDownload size={14}/>Download signature</a><Link className="btn sm" to={kind==='proposal'?`/proposal?p=${p.id}`:`/grid/docs?a=${p.id}`}>Open document<IconExternalLink size={14}/></Link></div></article>)}
      <div className="document-drive-note"><strong>Save the signed document in Drive</strong><p>Download the PDF from its document page, upload it to the customer’s Google Drive folder, then save its Drive link under Create.</p><a className="btn sm" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Open Google Drive<IconExternalLink size={14}/></a></div>
    </div>}
  </section>;
}

function DocumentJourney({p,kind,label,request}) {
  const [value,setValue]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const toast=useToast();
  const returned=kind==='proposal'?p.proposal?.accepted:p.signature;
  const sent=p.documentDelivery?.[request.token];
  const file=p.docLinks?.[kind]?.requestToken===request.token?p.docLinks[kind]:null;
  const url=`${location.origin}${location.pathname}#/sign/${request.token}`;
  const run=async(fn,message)=>{setBusy(true);setError('');try{await fn();toast(message);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <article className="card card-b" style={{marginBottom:16}}><h3>{label}</h3><ol className="document-steps">{[['Link ready',true],['Link sent',!!sent],['Customer completed',!!returned?.png],['Returned file',!!returned?.png],['Saved to customer',!!file]].map(([title,done],i)=><li key={title} className={done?'done':''}><b>{done?'✓':i+1}</b><span>{title}</span></li>)}</ol>
    <div className="row" style={{gap:8,flexWrap:'wrap'}}><button className="btn sm" onClick={()=>run(()=>navigator.clipboard.writeText(url),'Link copied')}>Get / copy link</button>{api.canDo('edit')&&!sent&&<button className="btn sm" disabled={busy} onClick={()=>run(()=>api.recordDocumentSent(p.id,kind,request.token),'Link marked sent')}>Mark link sent</button>}{returned?.png&&<><a className="btn sm" href={returned.png} download={`${p.crn}-${kind}-signature.png`}>Download returned signature</a><Link className="btn sm" to={kind==='proposal'?`/proposal?p=${p.id}`:`/grid/docs?a=${p.id}`}>Open signed PDF maker</Link></>}{file&&<a className="btn primary sm" href={file.url} target="_blank" rel="noreferrer">Open saved customer file</a>}</div>
    {sent&&<p className="small faint">Marked sent by {sent.by} · {fdateY(sent.at)}</p>}
    {returned?.png&&!file&&<div className="document-drive-note"><strong>Customer completed · save the returned document</strong><p>Download the signed PDF, upload it to the customer folder, and save its file link here.</p><a className="btn sm" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Open Drive to upload</a>{api.canDo('edit')&&<form className="document-setup-form" onSubmit={(e)=>{e.preventDefault();run(()=>api.saveReturnedDocument(p.id,kind,request.token,value),'File saved to the customer record');}}><label className="fld"><span>Uploaded signed PDF link</span><input type="url" className="input" required value={value} disabled={busy} onChange={(e)=>setValue(e.target.value)}/></label><button className="btn primary" disabled={busy}>Save to customer card</button></form>}</div>}
    {error&&<div className="form-err" role="alert">{error}</div>}
  </article>;
}
