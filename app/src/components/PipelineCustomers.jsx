import { Link } from 'react-router-dom';
import {useEffect,useState} from 'react';
import { fdateY,ftime } from '../lib/hooks.jsx';
import {relativeTime} from '../lib/relativeTime.js';
import { pipelineUrl, pipelineWork, needsAttention, projectNext } from '../lib/projectPipeline.js';
import { Empty } from './ui.jsx';
export default function PipelineCustomers({rows, onMove,twoColumns=false}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  if (!rows.length) return <Empty>No customers match this view.</Empty>;
  return <div className={'pipeline-customers'+(twoColumns?' two-columns':'')}>{rows.map(r=>{const next=projectNext(r);return <article className="pipeline-customer" key={r.id}>
    {twoColumns?<><div className="pipeline-card-identity"><Link className="pipeline-name" to={`/p/${r.id}`}>{r.name}</Link><span className="pipeline-card-crn">{r.crn}</span></div><div className="pipeline-card-stage"><span className="pipeline-stage-label">{r.stageLabel}</span>{onMove&&r.stage!=='completed'&&<button type="button" className="btn sm pipeline-move-button" onClick={()=>onMove(r)}>Move to next stage →</button>}</div><footer className="pipeline-card-audit"><small>Updated by {r.updatedBy||'Not recorded'}</small><time dateTime={r.updatedAt||undefined} title={r.updatedAt?`${fdateY(r.updatedAt)} · ${ftime(r.updatedAt)}`:'Update time not recorded'}>Updated {relativeTime(r.updatedAt,now)}</time></footer></>:<>
    <time className="pipeline-card-updated" dateTime={r.updatedAt||undefined} title={r.updatedAt?`${fdateY(r.updatedAt)} · ${ftime(r.updatedAt)}`:'Update time not recorded'}>Last updated {relativeTime(r.updatedAt,now)}</time>
    <div className="pipeline-customer-main"><Link className="pipeline-name" to={`/p/${r.id}`}>{r.name}</Link><p className="small faint">{r.crn}{!twoColumns&&<> · {r.city} · {r.kwp} kWp</>}</p><span className="pipeline-stage-label">{r.stageLabel}</span></div>
    {!twoColumns&&<div className="pipeline-customer-context"><strong>{pipelineWork(r.stage).title}</strong><p className="small">{next ? `Next in this stage: ${next.text}` : r.stage==='completed'?'Completed project':'Review the stage details and confirm when ready'}</p><small className={needsAttention(r)?'late-txt':'faint'}>{next?.overdue?next.dueWords:next?.status==='blocked'?'Blocked':`${r.stageDays ?? 0} ${r.stageDays===1?'day':'days'} in stage`}</small></div>}
    <div className="pipeline-row-actions">{!twoColumns&&<Link className="btn sm" to={pipelineUrl(r)}>{pipelineWork(r.stage).action}</Link>}{onMove&&r.stage!=='completed'&&<button className="btn sm ghost" onClick={()=>onMove(r)}>Move to next stage →</button>}</div>
  </>}</article>})}</div>;
}
