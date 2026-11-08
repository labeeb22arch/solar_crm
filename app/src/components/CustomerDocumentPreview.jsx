import {useState} from 'react';
import * as api from '../data/api.js';
import {useData,fdateY} from '../lib/hooks.jsx';
import {ProposalViewer} from '../docs/proposal/ProposalViewer.jsx';
import {AgreementPreview} from '../docs/agreement/AgreementPreview.jsx';
import {agreementData,todayDdMmYyyy} from '../docs/agreement/data.js';

/** Read-only document view: no new link, changed version or navigation. */
export default function CustomerDocumentPreview({customerId,docKey,onClose,closeLabel='Close document · back to customer'}) {
 const [highlights,setHighlights]=useState(false);
 const [p]=useData(()=>api.getProject(customerId),[customerId]);
 const [assets]=useData(()=>api.getCompanyAssets(),[]);
 if(!p)return <section className="card card-b"><button className="btn" onClick={onClose}>Close document</button><p>Loading document…</p></section>;
 if(p.notFound||p.forbidden)return <section className="card card-b"><button className="btn" onClick={onClose}>Close document</button><p>This document is not available in your customer list.</p></section>;
 const quote=docKey==='quote',request=quote?p.proposalRequest:p.signRequest,returned=quote?p.proposal?.accepted:p.signature;
 const title=quote?'Quotation / accepted proposal':'DISCOM agreement';
 const date=returned?.at||request?.createdAt;
 return <section className="customer-document-preview card card-b">
  <button type="button" className="btn" onClick={onClose}>{closeLabel}</button>
  <h2>{title}</h2><p><strong>{p.name}</strong> · {p.crn}</p>
  <p className="small faint">{returned?.png?'Received':'Prepared'}{date?' '+fdateY(date):''}{quote&&p.proposal?.number?' · '+p.proposal.number:''}</p>
  {p.demoOnly&&<p className="document-local-note">DEMO SAMPLE · Synthetic document and return image for walkthroughs. No customer signed this example.</p>}
  {quote?(p.proposal?.inputs?<ProposalViewer snap={p.proposal} accepted={p.proposal.accepted} assets={assets||{}} title={title}/>:<p>No saved proposal snapshot is available.</p>):<><p className="small faint">{returned?.png?'Agreement generated from the customer details with the received signature.':'Prepared agreement from the customer details; no signature received yet.'} The original uploaded file, when saved, remains in this customer’s document links.</p><AgreementPreview data={agreementData(p,assets||{},{showHighlights:highlights,executionDate:date?todayDdMmYyyy(new Date(date)):undefined})} onChange={data=>setHighlights(data.showHighlights)}/></>}
 </section>;
}
