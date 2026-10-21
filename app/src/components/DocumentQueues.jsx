import DocumentTask from './DocumentTask.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../data/api.js';
import { DOCUMENT_TASKS } from '../lib/documentTask.js';
import { useData, useSession } from '../lib/hooks.jsx';
import { CustName, Empty } from './ui.jsx';
const FLOWS=[['all','All documents'],['prepare','To prepare'],['share','Ready to share'],['waiting','Waiting for customer'],['download','Returned · download'],['upload','Upload pending'],['saved','Saved']];
export default function DocumentQueues() {
  const session=useSession();const [params,setParams]=useSearchParams();
  const flow=FLOWS.some(([key])=>key===params.get('flow'))?params.get('flow'):'all';
  const type=DOCUMENT_TASKS.some(([key])=>key===params.get('queue'))?params.get('queue'):'';
  const [rows]=useData(()=>api.documentQueueCustomers(),[session.role,session.branch]);
  const [query,setQuery]=useState('');const [limit,setLimit]=useState(24);
  useEffect(()=>setLimit(24),[flow,type,query]);
  const patch=(key,value)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);setParams(next);};
  const documents=(rows||[]).flatMap((row)=>(row.documents||[]).map((doc)=>({...row,doc}))).filter((row)=>(!type||row.doc.key===type)&&`${row.name} ${row.crn} ${row.city}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
  const matches=documents.filter((row)=>flow==='all'||row.doc.state===flow);
  return <section><div className="row" style={{gap:8,flexWrap:'wrap',marginBottom:16}}>{FLOWS.map(([key,title])=><button className={'btn '+(flow===key?'primary':'')} aria-pressed={flow===key} key={key} onClick={()=>patch('flow',key==='all'?'':key)}>{title} · {documents.filter((r)=>key==='all'||r.doc.state===key).length}</button>)}</div>
    <div className="row" style={{gap:12,flexWrap:'wrap',marginBottom:18}}><input className="input" style={{maxWidth:400}} aria-label="Search document customers" placeholder="Search across client documents" value={query} onChange={(e)=>setQuery(e.target.value)}/><select className="select" aria-label="Document type" value={type} onChange={(e)=>patch('queue',e.target.value)}><option value="">All document types</option>{DOCUMENT_TASKS.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></div>
    {rows===null?<p>Loading document customers…</p>:!matches.length?<Empty>No documents in this view.</Empty>:<div className="procurement-customers">{matches.slice(0,limit).map((r)=><article className="card card-b" key={r.id+r.doc.key}><span className="detail-label">{r.doc.title}</span><CustName id={r.id} name={r.name} crn={r.crn}/><p className="small faint">{r.city} · {r.kwp} kWp · {r.stageLabel}</p><DocumentTask customerId={r.id} docKey={r.doc.key}/></article>)}</div>}
    {matches.length>limit&&<button className="btn" style={{marginTop:18}} onClick={()=>setLimit((n)=>n+24)}>Show more documents</button>}
  </section>;
}
