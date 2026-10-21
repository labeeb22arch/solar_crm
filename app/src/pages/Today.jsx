import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../data/api.js';
import { useData, useSession } from '../lib/hooks.jsx';
import { needsAttention, recentProjects } from '../lib/projectPipeline.js';
import { Empty, PageHead } from '../components/ui.jsx';
import PipelineCustomers from '../components/PipelineCustomers.jsx';
const localDay=(value)=>{if(!value)return '';const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function Today() {
 const session=useSession();const [rows]=useData(()=>api.listProjects({}),[session.role,session.branch]);
 const [view,setView]=useState('attention'),[query,setQuery]=useState(''),[limit,setLimit]=useState(12);
 const today=localDay(new Date()),active=(rows||[]).filter(r=>r.stage!=='completed');
 const filters=[['attention','Needs attention',r=>needsAttention(r)],['installs',"Today’s installations",r=>r.installDate?.slice(0,10)===today&&r.installStatus!=='done'],['updated','Updated today',r=>localDay(r.updatedAt)===today],['all','All active',()=>true]];
 const chosen=filters.find(f=>f[0]===view),matching=recentProjects(active.filter(chosen[2]).filter(r=>`${r.name} ${r.crn} ${r.city}`.toLowerCase().includes(query.toLowerCase())));
 return <div className="pipeline-page"><PageHead title="Today" sub="Pick up the projects that need you. Every action continues inside the customer’s journey."><Link className="btn" to="/project-management">Open project pipeline</Link></PageHead>
 <div className="pipeline-metrics">{filters.map(([key,label,test])=><button className={view===key?'selected':''} key={key} onClick={()=>{setView(key);setLimit(12);}}><strong>{rows?active.filter(test).length:'—'}</strong><span>{label}</span></button>)}</div>
 <section className="card"><div className="pipeline-list-heading"><div><h2>{chosen[1]}</h2><p className="small faint">Most recently updated first · Open a project to continue its stage</p></div><input className="input" aria-label="Search today’s projects" placeholder="Find a customer" value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}}/></div>{!rows?<Empty>Loading today’s projects…</Empty>:<PipelineCustomers rows={matching.slice(0,limit)}/>}{matching.length>limit&&<div className="card-b"><button className="btn" onClick={()=>setLimit(limit+12)}>Show more customers</button></div>}</section></div>;
}
