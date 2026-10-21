import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../data/api.js';
import { useData,useToast } from '../lib/hooks.jsx';
import { documentTaskState } from '../lib/documentTask.js';
import { downloadCustomerDocument } from '../lib/downloadCustomerDocument.jsx';
export default function DocumentTask({customerId,docKey}) {
  const nav=useNavigate();const toast=useToast();const [version,setVersion]=useState(0);
  const [p]=useData(()=>api.getProject(customerId),[customerId,version]);
  const [busy,setBusy]=useState(false);const [copied,setCopied]=useState(false);const [fileUrl,setFileUrl]=useState('');const [error,setError]=useState('');
  if(!p||p.notFound||p.forbidden)return null;
  const kind=docKey==='quote'?'proposal':docKey;
  const request=docKey==='quote'?p.proposalRequest:docKey==='agreement'?p.signRequest:null;
  const state=documentTaskState(p,docKey);
  const route=docKey==='name'?`/name-check?p=${p.id}`:docKey==='quote'?`/proposal?p=${p.id}`:docKey==='feas'?`/feasibility?p=${p.id}`:`/grid/docs?a=${p.id}`;
  const url=request?`${location.origin}${location.pathname}#/sign/${request.token}`:'';
  const labels={prepare:docKey==='quote'?'Prepare quotation':['feas','name'].includes(docKey)?'Download report':'Get signing link',share:copied?'Mark as sent':'Copy customer link',waiting:'Copy link again',download:'Download signed PDF',upload:'Save uploaded file',saved:'Open saved file'};
  const subtitles={prepare:'Ready to prepare',share:'Ready to share with customer',waiting:'Waiting for customer',download:'Customer completed · signed PDF ready',upload:'Downloaded · upload the PDF and paste its link',saved:'Done · file saved to customer'};
  const act=async(e)=>{e?.preventDefault();if(busy)return;setBusy(true);setError('');try{
    if(state==='saved')window.open((p.docLinks[kind]||(docKey==='quote'?p.docLinks.quote:null)).url,'_blank','noopener,noreferrer');
    else if(state==='prepare'&&docKey==='quote')nav(route);
    else if(state==='prepare'&&docKey==='agreement'){const link=await api.createSignLink(p.id);await navigator.clipboard.writeText(link.url);setCopied(true);toast('Signing link copied');}
    else if(state==='share'&&copied){await api.recordDocumentSent(p.id,kind,request.token);toast('Marked as sent');}
    else if(state==='share'||state==='waiting'){await navigator.clipboard.writeText(url);setCopied(true);toast('Link copied');}
    else if(state==='upload'){if(['feas','name'].includes(docKey))await api.setDocLink(p.id,docKey,fileUrl);else if(request?.token)await api.saveReturnedDocument(p.id,kind,request.token,fileUrl);else await api.setDocLink(p.id,kind,fileUrl);toast('Saved to customer');}
    else {const assets=await api.getCompanyAssets();await downloadCustomerDocument(p,docKey,assets);await api.recordDocumentDownload(p.id,docKey,request?.token);toast('Downloaded · save the uploaded file link here');}
    setVersion((v)=>v+1);
  }catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="simple-document-task"><p className="simple-document-status">{subtitles[state]}</p>
    <ol className="document-steps compact" aria-label="Document progress">{(['feas','name'].includes(docKey)?['Prepare','Download PDF','Save uploaded file']:['Prepare','Copy link','Mark sent','Signed PDF','Save uploaded file']).map((label,index)=>{const stage=['feas','name'].includes(docKey)?({prepare:0,upload:2,saved:3}[state]??0):({prepare:0,share:copied?2:1,waiting:3,download:3,upload:4,saved:5}[state]??0);return <li className={index<stage?'done':index===stage?'current':''} key={label}><b>{index<stage?'✓':index+1}</b><span>{label}</span></li>;})}</ol>
    {state==='upload'?<form onSubmit={act}><label className="fld"><span>Uploaded PDF link</span><input className="input" type="url" required value={fileUrl} disabled={busy} onChange={(e)=>setFileUrl(e.target.value)} placeholder="Paste the file link"/></label><button className="btn primary" disabled={busy||!api.canDo('edit')}>{busy?'Saving…':labels[state]}</button><a className="small" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Open Drive to upload</a></form>:<button className="btn primary" disabled={busy||(!api.canDo('edit')&&['prepare','share'].includes(state))} onClick={act}>{busy?'Working…':labels[state]}</button>}
    {error&&<div className="form-err" role="alert">{error}</div>}
    <details className="simple-document-more"><summary>Details & history</summary><button className="btn sm" onClick={()=>nav(route)}>Preview / edit details</button>{url&&<a className="btn sm" href={url} target="_blank" rel="noreferrer">View customer link</a>}{state==='upload'&&<button className="btn sm" disabled={busy} onClick={()=>{setBusy(true);api.getCompanyAssets().then((assets)=>downloadCustomerDocument(p,docKey,assets)).catch((e)=>setError(e.message)).finally(()=>setBusy(false));}}>Download again</button>}<p className="small faint">{p.documentDelivery?.[request?.token]?.by?`Sent by ${p.documentDelivery[request.token].by}`:''}{p.documentDownloads?.[docKey==='feas'?'feas':request?.token]?.by?` · Downloaded by ${p.documentDownloads[docKey==='feas'?'feas':request.token].by}`:''}</p></details>
  </div>;
}
