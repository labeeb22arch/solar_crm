import CustomerDocumentPreview from './CustomerDocumentPreview.jsx';
import QuickDocument from './QuickDocument.jsx';
import Proposal from '../pages/Proposal.jsx';
import Feasibility from '../pages/Feasibility.jsx';
import {DiscomDocs} from '../pages/Ops.jsx';
import {SignLinkDialog} from './SignLink.jsx';
import {getMissingFeasibilityFields,mapFeasibilityReport} from '../docs/feasibility.js';
import { useEffect, useRef, useState } from 'react';
import * as api from '../data/api.js';
import { useData,useToast } from '../lib/hooks.jsx';
import { documentTaskState } from '../lib/documentTask.js';
import { downloadCustomerDocument } from '../lib/downloadCustomerDocument.jsx';
export default function DocumentTask({customerId,docKey,openEditor=false}) {
  const [preview,setPreview]=useState('');const previewFrame=useRef(null);
  useEffect(()=>{const receive=(event)=>{if(event.origin!==location.origin||event.source!==previewFrame.current?.contentWindow||event.data?.type!=='solarcrm-signing-complete')return;setPreview('');setVersion(v=>v+1);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  const toast=useToast();const [version,setVersion]=useState(0);
  const [p]=useData(()=>api.getProject(customerId),[customerId,version]);
  const [preparing,setPreparing]=useState(false); const [editor,setEditor]=useState(openEditor),[sharing,setSharing]=useState(false);
  const [busy,setBusy]=useState(false);const [copied,setCopied]=useState(false);const [fileUrl,setFileUrl]=useState('');const [error,setError]=useState('');
  if(!p||p.notFound||p.forbidden)return null;
  const kind=docKey==='quote'?'proposal':docKey;
  const request=docKey==='quote'?p.proposalRequest:docKey==='agreement'?p.signRequest:null;
  const state=documentTaskState(p,docKey);
  const url=request&&!request.demoOnly?`${location.origin}${location.pathname}#/sign/${request.token}`:'';
  const labels={prepare:docKey==='quote'?'Open quotation maker':docKey==='feas'?'Open feasibility report':docKey==='name'?'Download PDF':'Open DISCOM agreement',share:'Copy customer link',waiting:'Copy link again',download:'Download signed PDF',upload:'Save uploaded file',saved:'Open saved file'};
  const subtitles={prepare:'Ready to prepare',share:'Ready to share with customer',waiting:'Waiting for customer',download:'Customer completed · signed PDF ready',upload:'Downloaded · upload the PDF and paste its link',saved:'Done · file saved to customer'};
  const act=async(e)=>{e?.preventDefault();if(busy)return;setBusy(true);setError('');try{
    if(request?.demoOnly&&['share','waiting'].includes(state))setPreview('stored-document');
    else if(state==='saved')setPreview((p.docLinks[kind]||(docKey==='quote'?p.docLinks.quote:null)).url);
    else if(state==='prepare'&&docKey==='quote')setEditor(true);
    else if(state==='prepare'&&docKey==='feas')setEditor(true);
    else if(state==='prepare'&&docKey==='agreement')setEditor(true);
    else if(state==='share'||state==='waiting'){await navigator.clipboard.writeText(url);setCopied(true);toast('Link copied');}
    else if(state==='upload'){if(['feas','name'].includes(docKey))await api.setDocLink(p.id,docKey,fileUrl);else if(request?.token)await api.saveReturnedDocument(p.id,kind,request.token,fileUrl);else await api.setDocLink(p.id,kind,fileUrl);toast('Saved to customer');}
    else {const assets=await api.getCompanyAssets();await downloadCustomerDocument(p,docKey,assets);await api.recordDocumentDownload(p.id,docKey,request?.token);toast('Downloaded · save the uploaded file link here');}
    setVersion((v)=>v+1);
  }catch(e){setError(e.message);}finally{setBusy(false);}};
  if(preview==='stored-document')return <CustomerDocumentPreview customerId={p.id} docKey={docKey} onClose={()=>setPreview('')}/>;
  if(preview)return <section className="inline-document-editor"><button type="button" className="btn" onClick={()=>setPreview('')}>Close document · back to customer</button><iframe ref={previewFrame} title="Customer document preview" src={preview} style={{width:'100%',height:'75vh',border:0}}/><p className="small faint">If the file provider blocks previews, <a href={preview} target="_blank" rel="noreferrer">open the original file</a>.</p></section>;
  if(editor)return <section className="inline-document-editor"><button type="button" className="btn" onClick={()=>setEditor(false)}>Close editor · back to document actions</button>{docKey==='quote'?<Proposal customerId={p.id} embedded/>:docKey==='feas'?<Feasibility customerId={p.id} embedded/>:<DiscomDocs customerId={p.id} onClose={()=>setEditor(false)}/>}</section>;
  return <div className="simple-document-task"><p className="simple-document-status">{subtitles[state]}</p>
    {preparing&&<QuickDocument project={p} kind={docKey} onCancel={()=>setPreparing(false)} onDone={()=>{setPreparing(false);setVersion(v=>v+1);toast(docKey==='quote'?'Quotation link ready':'PDF downloaded');}}/>}
    {!preparing&&['quote','agreement'].includes(docKey)&&(p.proposal||p.signRequest)&&<button type="button" className="btn" onClick={()=>setPreview('stored-document')}>{(docKey==='quote'?p.proposal?.accepted:p.signature)?.png?'View received document':'View prepared document'}</button>}
    {!preparing&&url&&request?.status!=='signed'&&<button type="button" className="btn" onClick={()=>setPreview(url)}>Preview customer document here</button>}
    {!preparing&&(state==='upload'?<form onSubmit={act}><label className="fld"><span>Uploaded PDF link</span><input className="input" type="url" required value={fileUrl} disabled={busy} onChange={(e)=>setFileUrl(e.target.value)} placeholder="Paste the file link"/></label><button className="btn primary" disabled={busy||!api.canDo('edit')}>{busy?'Saving…':labels[state]}</button><a className="small" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Open Drive to upload</a></form>:<button className="btn primary" disabled={busy||(!api.canDo('edit')&&['prepare','share'].includes(state))} onClick={act}>{busy?'Working…':request?.demoOnly&&['share','waiting'].includes(state)?'View demo document':labels[state]}</button>)}
    {state==='share'&&!request?.demoOnly&&api.canDo('edit')&&<button className="btn" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{await api.recordDocumentSent(p.id,kind,request.token);setVersion(v=>v+1);toast('Marked as sent');}catch(e){setError(e.message);}finally{setBusy(false);}}}>Mark sent</button>}
    {url&&<button type="button" className="btn" onClick={()=>setSharing(true)}>Share customer link · WhatsApp</button>}{sharing&&<SignLinkDialog link={{customerId:p.id,name:p.name,phone:p.phone,kwp:p.kwp,url,kind:docKey==='quote'?'proposal':'agreement',number:p.proposal?.number,expiresAt:request.expiresAt}} onClose={()=>setSharing(false)}/>}
    {copied&&state==='share'&&<p className="small faint">Link copied. Share it with the customer, then mark it sent.</p>}
    {state==='waiting'&&!request?.demoOnly&&<p className="small faint">The customer can review and edit their signature before sending it back.</p>}
    {error&&<div className="form-err" role="alert">{error}</div>}
    {state!=='prepare'&&<button type="button" className="btn sm" onClick={()=>setEditor(true)}>Open {docKey==='quote'?'quotation maker':docKey==='feas'?'feasibility report':'DISCOM agreement'} here</button>}<details className="simple-document-more"><summary>File history</summary>{url&&<button type="button" className="btn sm" onClick={()=>setPreview(url)}>View customer document here</button>}{state==='upload'&&<button className="btn sm" disabled={busy} onClick={()=>{setBusy(true);api.getCompanyAssets().then((assets)=>downloadCustomerDocument(p,docKey,assets)).catch((e)=>setError(e.message)).finally(()=>setBusy(false));}}>Download again</button>}<p className="small faint">{p.documentDelivery?.[request?.token]?.by?`Sent by ${p.documentDelivery[request.token].by}`:''}{p.documentDownloads?.[docKey==='feas'?'feas':request?.token]?.by?` · Downloaded by ${p.documentDownloads[docKey==='feas'?'feas':request.token].by}`:''}</p></details>
  </div>;
}
