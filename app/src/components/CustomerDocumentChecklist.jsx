import { useState } from 'react';
import * as api from '../data/api.js';
import { fdateY, ftime, useToast } from '../lib/hooks.jsx';
import { CUSTOMER_DOCUMENTS, findDocument } from '../lib/customerDocuments.js';

function ChangeInfo({entry}) {
  return entry?.at ? <small className="faint">Saved by {entry.by || 'Team'} · {fdateY(entry.at)} · {ftime(entry.at)}</small> : null;
}
function SavedHistory({versions}) {
  return versions?.length ? <details className="document-link-history"><summary>Previous links · {versions.length}</summary>{[...versions].reverse().map((entry,i)=><p key={i}><a href={entry.url} target="_blank" rel="noreferrer">Open previous link ↗</a><ChangeInfo entry={entry}/></p>)}</details> : null;
}
function ResourceLink({project,kind,label}) {
  const entry=kind==='folder'?project.driveFolder:project.siteLocation;
  const editable=api.canDo('edit')||api.canDo('link_docs');
  const [editing,setEditing]=useState(false),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const toast=useToast();
  const currentLocation=()=>{
    if(!navigator.geolocation){setError('Location is not available in this browser');return;}
    setBusy(true);setError('');
    navigator.geolocation.getCurrentPosition(position=>{
      setUrl(`https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`);setBusy(false);
    },()=>{setError('Could not get location. Allow location access or paste a Google Maps link.');setBusy(false);},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  return <section className="customer-resource-link"><h3>{label}</h3>
    {entry?.url?<><a className="btn sm" href={entry.url} target="_blank" rel="noreferrer">{kind==='folder'?'Open customer folder':'Open site location'} ↗</a><ChangeInfo entry={entry}/></>:<p className="small faint">{kind==='folder'?'Create the customer’s folder in Drive, then save its link here.':'Save the installation site’s Google Maps link.'}</p>}
    {editable&&!editing&&<button className="btn sm ghost" aria-label={`${entry?.url?'Change':'Add'} ${label.toLowerCase()} link`} onClick={()=>{setUrl(entry?.url||'');setEditing(true);setError('');}}>{entry?.url?'Change link':'Add link'}</button>}
    {editing&&<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api.saveCustomerResource(project.id,kind,url);setEditing(false);toast('Customer link saved');}catch(err){setError(err.message);}finally{setBusy(false);}}}><label className="fld"><span>{label} link</span><input className="input" type="url" required value={url} disabled={busy} onChange={e=>setUrl(e.target.value)} placeholder={kind==='folder'?'https://drive.google.com/drive/folders/…':'Paste a Google Maps link'}/></label>{kind==='location'&&<button className="btn sm" type="button" disabled={busy} onClick={currentLocation}>Use my current location</button>}<button className="btn sm primary" disabled={busy}>{busy?'Working…':'Save link'}</button><button className="btn sm" type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></form>}
    {error&&<p className="form-err" role="alert">{error}</p>}<SavedHistory versions={entry?.versions}/>
  </section>;
}
export default function CustomerDocumentChecklist({project:p}) {
  const [editing,setEditing]=useState(''),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('all');
  const toast=useToast(),editable=api.canDo('edit')||api.canDo('link_docs');
  const loan=['Bank Solar Loan','Personal Loan'].includes(p.paymentMethod);
  const docs=CUSTOMER_DOCUMENTS.filter(d=>!d.loanOnly||loan||findDocument(p,d).url);
  const linked=docs.filter(d=>findDocument(p,d).url).length;
  const save=async(key,patch)=>{setBusy(true);setError('');try{await api.saveCustomerDocument(p.id,key,patch);setEditing('');toast(patch.url?'Document link saved':'Checklist updated');}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <section className="customer-document-checklist">
    <div className="customer-resource-links"><ResourceLink key={p.id+'folder'} project={p} kind="folder" label="Customer Drive folder"/><ResourceLink key={p.id+'location'} project={p} kind="location" label="Google Maps site location"/></div>
    <header className="document-checklist-heading"><div><h2>Customer document checklist</h2><p className="small faint">{linked} of {docs.length} files linked · Tick received documents and save each file’s Drive link.</p></div><select className="select" aria-label="Filter document checklist" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All documents</option><option value="missing">Missing links</option><option value="linked">Linked files</option></select></header>
    {error&&<p className="form-err" role="alert">{error}</p>}
    {[...new Set(docs.map(d=>d.group))].map(group=>{
      const rows=docs.filter(d=>d.group===group&&(filter==='all'||(filter==='linked'?!!findDocument(p,d).url:!findDocument(p,d).url)));
      if(!rows.length)return null;
      return <details className="document-checklist-group card" key={group} open={group==='Customer documents'||filter!=='all'||undefined}><summary><h3>{group}</h3><span className="small faint">{rows.filter(d=>findDocument(p,d).url).length} / {rows.length} linked · ⌄</span></summary>{rows.map(doc=>{
        const entry=findDocument(p,doc);
        return <div className="document-checklist-row" key={doc.key}><label className="document-received"><input type="checkbox" checked={entry.present} disabled={busy||!editable||!!entry.url} onChange={e=>save(doc.key,{checked:e.target.checked})}/><span>{doc.label}<small className={entry.url?'document-linked':'faint'}>{entry.url?'File linked':entry.present?'Received · add file link':'Pending'}</small></span></label><div className="document-checklist-file">{entry.url&&<a className="btn sm" href={entry.url} target="_blank" rel="noreferrer">Open document ↗</a>}<ChangeInfo entry={entry}/>{editable&&editing!==doc.key&&<button className="btn sm ghost" aria-label={`${entry.url?'Update':'Add'} link for ${doc.label}`} disabled={busy} onClick={()=>{setValue(entry.url||'');setEditing(doc.key);setError('');}}>{entry.url?'Update link':'Add link'}</button>}{editing===doc.key&&<form onSubmit={e=>{e.preventDefault();save(doc.key,{url:value});}}><label className="fld"><span>{doc.label} — Drive link</span><input autoFocus type="url" className="input" required disabled={busy} value={value} onChange={e=>setValue(e.target.value)} placeholder="Paste the file’s Google Drive link"/></label><button className="btn sm primary" disabled={busy}>Save link</button><button className="btn sm" type="button" disabled={busy} onClick={()=>setEditing('')}>Cancel</button></form>}<SavedHistory versions={entry.versions}/></div></div>;
      })}</details>;
    })}
    <p className="small faint">Saved by records who added the link in the CRM. File access is controlled in Google Drive.</p>
  </section>;
}
