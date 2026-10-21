import { Link } from 'react-router-dom';
import { fdateY } from '../lib/hooks.jsx';
import { pipelineUrl, pipelineWork, needsAttention, projectNext } from '../lib/projectPipeline.js';
import { Empty } from './ui.jsx';
export default function PipelineCustomers({rows, onMove}) {
  if (!rows.length) return <Empty>No customers match this view.</Empty>;
  return <div className="pipeline-customers">{rows.map(r=>{const next=projectNext(r);return <article className="pipeline-customer" key={r.id}>
    <div className="pipeline-customer-main"><Link className="pipeline-name" to={`/p/${r.id}`}>{r.name}</Link><p className="small faint">{r.crn} · {r.city} · {r.kwp} kWp</p><span className="pipeline-stage-label">{r.stageLabel}</span></div>
    <div className="pipeline-customer-context"><strong>{pipelineWork(r.stage).title}</strong><p className="small">{next ? `Next in this stage: ${next.text}` : r.stage==='completed'?'Completed project':'Review the stage details and confirm when ready'}</p><small className={needsAttention(r)?'late-txt':'faint'}>{next?.overdue?next.dueWords:next?.status==='blocked'?'Blocked':`${r.stageDays ?? 0} days in stage`} · Updated {fdateY(r.updatedAt)}</small></div>
    <div className="pipeline-row-actions"><Link className="btn sm" to={pipelineUrl(r)}>{pipelineWork(r.stage).action}</Link>{onMove&&r.stage!=='completed'&&<button className="btn sm ghost" onClick={()=>onMove(r)}>Move to next stage →</button>}</div>
  </article>})}</div>;
}
