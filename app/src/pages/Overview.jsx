import { pageAllowed } from '../lib/access.js';
import { Link } from 'react-router-dom';
import * as api from '../data/api.js';
import { useData, useSession } from '../lib/hooks.jsx';
import { needsAttention, pipelineWork } from '../lib/projectPipeline.js';
import { Empty, PageHead } from '../components/ui.jsx';
export default function Overview() {
 const session=useSession();const canPipeline=pageAllowed('project_management',session.role);const StageRow=canPipeline?Link:'div';const [rows]=useData(()=>api.listProjects({}),[session.role,session.branch]);
 if(!rows)return <Empty>Loading project overview…</Empty>;
 const active=rows.filter(r=>r.stage!=='completed');
 const metrics=[['Active projects',active.length],['Needs attention',active.filter(needsAttention).length],['Completed',rows.length-active.length],['Active capacity',`${Math.round(active.reduce((n,r)=>n+Number(r.kwp||0),0)).toLocaleString('en-IN')} kWp`]];
 return <div className="pipeline-page"><PageHead title="Overview" sub="See where projects are moving and where follow-up is needed.">{pageAllowed('today',session.role)&&<Link className="btn" to="/today">View today’s work</Link>}</PageHead>
 <div className="pipeline-metrics overview-metrics">{metrics.map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
 <section className="card pipeline-overview"><header className="card-b"><h2>End-to-end project pipeline</h2><p className="small faint">Current stage, customers needing attention and time in stage. {canPipeline?'Select a stage to work on its projects.':'Your scoped projects, grouped by current stage.'}</p></header>{api.meta.STAGES.map((s,i)=>{
 const group=rows.filter(r=>r.stage===s.id),attention=group.filter(needsAttention).length,average=group.length?Math.round(group.reduce((n,r)=>n+(r.stageDays||0),0)/group.length):0;
 return <StageRow className="pipeline-overview-stage" key={s.id} {...(canPipeline?{to:`/project-management?stage=${s.id}`}:{})}><span className="pipeline-step-number">{i+1}</span><div><strong>{s.label}</strong><p className="small faint">{pipelineWork(s.id).description}</p></div><div className="pipeline-overview-count"><b>{group.length}</b><small>customers</small></div><div className="pipeline-overview-health"><span className={attention?'late-txt':'faint'}>{s.id==='completed'?'Handover & warranty':`${attention} need attention`}</span><small className="faint">{group.length&&s.id!=='completed'?`${average} days in stage on average`:' '}</small></div><span aria-hidden="true">→</span></StageRow>;
 })}</section></div>;
}
