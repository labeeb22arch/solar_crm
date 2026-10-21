import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../data/api.js';
import { useData, useSession, useToast } from '../lib/hooks.jsx';
import { pipelineWork, needsAttention, recentProjects } from '../lib/projectPipeline.js';
import { PageHead, Empty } from '../components/ui.jsx';
import PipelineCustomers from '../components/PipelineCustomers.jsx';
import StageMoveDialog from '../components/StageMoveDialog.jsx';
export default function ProjectManagement() {
 const session=useSession(),toast=useToast();
 const [rows]=useData(()=>api.listProjects({}),[session.role,session.branch]);
 const [params]=useSearchParams();
 const stage=api.meta.STAGES.find(s=>s.id===params.get('stage'))||api.meta.STAGES[0];
 const [query,setQuery]=useState(''),[attention,setAttention]=useState(false),[moving,setMoving]=useState(null);
 const matching=recentProjects((rows||[]).filter(r=>`${r.name} ${r.crn} ${r.city}`.toLowerCase().includes(query.toLowerCase())&&(!attention||needsAttention(r))));
 const work=pipelineWork(stage.id);
 return <div className="project-management pipeline-page"><PageHead title={stage.label} sub={work.description}/>
 <div className="pipeline-toolbar"><input className="input" aria-label="Search projects" placeholder="Search customer, CRN or city" value={query} onChange={e=>setQuery(e.target.value)}/><label className="row small"><input type="checkbox" checked={attention} onChange={e=>setAttention(e.target.checked)}/>Needs attention</label></div>
 <section className="pipeline-stage-content" aria-label={stage.label}><header className="pipeline-stage-heading"><span className="detail-label">Stage {api.meta.STAGES.indexOf(stage)+1} of {api.meta.STAGES.length}</span><small className="faint">{matching.filter(r=>r.stage===stage.id).length} customers · Most recently updated first</small></header>{!rows?<Empty>Loading projects…</Empty>:<PipelineCustomers rows={matching.filter(r=>r.stage===stage.id)} onMove={api.canDo('edit')?setMoving:undefined}/>}</section>
 {moving&&<StageMoveDialog project={moving} onClose={()=>setMoving(null)} onMoved={()=>toast('Project stage updated')}/>}
 </div>;
}
