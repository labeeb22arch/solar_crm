import {useModalFocus} from '../lib/useModalFocus.js';
import TrashCustomerDialog from '../components/TrashCustomerDialog.jsx';
import StageMoveDialog from '../components/StageMoveDialog.jsx';
import { useEffect,useRef,useState } from 'react';
import { Link,useParams,useSearchParams } from 'react-router-dom';
import { IconArrowLeft,IconArrowRight,IconCheck,IconPhone,IconX } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData,useSession,useToast,fdateY,ftime } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import { nextStage } from '../lib/stageProgress.js';
import { Avatar,Empty,LinkCRNs } from '../components/ui.jsx';
import CustomerOverview from '../components/CustomerOverview.jsx';
import CustomerFinance from '../components/CustomerFinance.jsx';
import Documents from './Documents.jsx';
import WarrantyRecords from './WarrantyRecords.jsx';
const TABS=[['overview','Overview'],['finance','Finance'],['documents','Documents'],['history','History'],['warranty','Warranty']];
const aliases={work:'overview',details:'overview',technical:'overview',payments:'finance',updates:'history'};
export default function Record(){
 const {id}=useParams();const [params,setParams]=useSearchParams();const session=useSession();const [p,loading]=useData(()=>api.getProject(id),[id]);const toast=useToast();
 const [moveOpen,setMoveOpen]=useState(false);const [trashing,setTrashing]=useState(false);const [panel,setPanel]=useState(false);const [busy,setBusy]=useState(false);const [note,setNote]=useState('');const [historyType,setHistoryType]=useState('all');const progress=useRef(null);
 const requested=aliases[params.get('tab')]||params.get('tab')||'overview';
 const tabs=TABS.filter(([key])=>(key!=='finance'||api.canDo('internal_money'))&&(key!=='documents'||pageAllowed('documents',session.role)));
 const tab=tabs.some(([key])=>key===requested)?requested:'overview';
 const changeTab=(key)=>setParams((old)=>{const value=new URLSearchParams(old);value.set('tab',key);return value;},{replace:true});
 useEffect(()=>{setNote('');setPanel(false);},[id]);
 useEffect(()=>{if(p?.id)api.markOpened(id);},[id,p?.id]);
 useEffect(()=>{const node=progress.current?.querySelector('[aria-current="step"]');if(node)progress.current.scrollLeft=Math.max(0,node.offsetLeft-progress.current.offsetLeft-progress.current.clientWidth/2+node.offsetWidth/2);},[p?.summary?.stage]);
 const act=async(fn,message)=>{if(busy)return;setBusy(true);try{await fn();if(message)toast(message);}catch(e){toast(e.message);}finally{setBusy(false);}};
 if(loading||!p)return <div className="page"><Empty>Loading customer…</Empty></div>;
 if(p.notFound||p.forbidden)return <div className="page"><Empty>This customer is unavailable.</Empty><Link to="/projects">Back to customers</Link></div>;
 const s=p.summary;const index=api.meta.STAGES.findIndex((stage)=>stage.id===s.stage);const following=nextStage(api.meta.STAGES,s.stage);
 return <div className="customer-workspace"><Link className="back-customers" to={s.stage==='completed'?'/completed':params.get('from')?`/projects?${params.get('from')}`:'/projects'}><IconArrowLeft size={17}/>{s.stage==='completed'?'Back to Completed':'Back to customers'}</Link>
 <header className="workspace-heading"><Avatar name={p.name} size="xl"/><div className="workspace-title"><h1>{p.name}</h1><p>{p.city} · {p.kwp} kWp · {p.crn}</p></div><span className="workspace-status">{s.stageLabel}</span><div className="workspace-actions"><button className="btn" aria-expanded={panel} onClick={()=>setPanel(!panel)}>{panel?'Hide stage panel':'Current stage'}</button>{following&&api.canDo('edit')&&<button className="btn primary" onClick={()=>setMoveOpen(true)}>Move to next stage</button>}<a className="btn icon" aria-label={`Call ${p.name}`} href={`tel:+91${p.phone}`}><IconPhone size={16}/></a>{['Admin','Office Staff'].includes(session.role)&&<details className="record-more-actions"><summary className="btn">More</summary><button className="btn" onClick={()=>setTrashing(true)}>Move to Trash</button></details>}</div></header>
 <nav ref={progress} className="customer-stage-progress" aria-label="Customer stage progress"><ol>{api.meta.STAGES.map((stage,i)=><li key={stage.id} className={i<index?'passed':i===index?'current':''} aria-current={i===index?'step':undefined}><span className="stage-progress-dot">{i<index?<IconCheck size={12}/>:i+1}</span><span>{stage.id==='leads'?'Lead':stage.label}</span></li>)}</ol></nav>
 <div className="workspace-tabs" role="tablist" aria-label="Customer workspace">{tabs.map(([key,label])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'selected':''} onClick={()=>changeTab(key)}>{label}</button>)}</div>
 <div className="customer-record-layout panel-hidden"><div className="customer-record-content" role="tabpanel" aria-label={tabs.find(([key])=>key===tab)?.[1]}>
 {tab==='overview'&&<CustomerOverview key={p.id} project={p}/>}
 {tab==='finance'&&<CustomerFinance key={p.id} project={p}/>}
 {tab==='documents'&&<Documents customerId={p.id} embedded/>}
 {tab==='warranty'&&<WarrantyRecords customerId={p.id} embedded coverageOnly/>}
 {tab==='history'&&<section className="card card-b"><div className="row" style={{justifyContent:'space-between',gap:12}}><h2>Customer history</h2><select className="select" value={historyType} onChange={(e)=>setHistoryType(e.target.value)} aria-label="History type">{[['all','All updates'],['note','Notes'],['payment','Payments'],['document','Documents'],['status','Stage & task changes']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>{(api.canDo('note')||api.canDo('edit'))&&<form className="update-composer" onSubmit={(e)=>{e.preventDefault();act(async()=>{await api.addNote(id,'note',note.trim());setNote('');},'Note saved');}}><textarea className="input" rows={3} aria-label="Customer note" placeholder="Add a note for the team" value={note} onChange={(e)=>setNote(e.target.value)}/><button className="btn primary" disabled={busy||!note.trim()}>Save note</button></form>}<div className="updates-feed">{[...(p.timeline||[])].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).filter((event)=>historyType==='all'||event.type===historyType).map((event,i)=><article key={i}><div><p><strong>{event.by||'Team'}</strong><time>{fdateY(event.at)} · {ftime(event.at)}</time></p><div><LinkCRNs text={event.text}/></div></div></article>)}</div></section>}
 </div>{panel&&<><div className="overlay" onClick={()=>setPanel(false)}/><StagePanel key={p.id+s.stage} project={p} busy={busy} act={act} onClose={()=>setPanel(false)} changeTab={changeTab} following={following}/></>}</div>
 {moveOpen&&<StageMoveDialog project={p} onClose={()=>setMoveOpen(false)}/>}
 {trashing&&<TrashCustomerDialog project={p} onClose={()=>setTrashing(false)}/>}
 </div>;
}
function StagePanel({project:p,busy,act,onClose,changeTab,following}){
 const [confirmMove,setConfirmMove]=useState(false);const s=p.summary;const next=s.next;const [assigning,setAssigning]=useState(false);const loan=['Bank Solar Loan','Personal Loan'].includes(p.paymentMethod);
 const drawer=useRef(null);useModalFocus(drawer,onClose,busy,!confirmMove);
 const needed=s.stage==='leads'?[['Phone',p.phone],['City',p.city]]:s.stage==='pending_loans'?[['Payment arrangement',p.paymentMethod],...(loan?[['Bank name',p.bank]]:[])]:s.stage==='material_procurement'?[['Customer BOM',p.bomVersions?.length]]:s.stage==='pending_installation'?[['Installation team',p.team],['Installation date',p.installDate]]:s.stage==='post_installation_docs'?[['Panel serials',p.serials?.modules?.length],['Inverter serial',p.serials?.inverter]]:s.stage==='discom_submissions'?[['Consumer number',p.consumerNo],...(p.scheme==='pm_surya_ghar'?[['Portal ID',p.portalId],['Customer signature',p.signature?.png]]:[])]:[];
 const primary=s.stage==='leads'?['Prepare quotation',()=>changeTab('documents')]:s.stage==='pending_loans'?['Review finance',()=>changeTab('finance')]:s.stage==='material_procurement'?['Open customer BOM',null,`/supply/bom?p=${p.id}`]:s.stage==='pending_installation'?['Assign team / date',()=>setAssigning(!assigning)]:['post_installation_docs','discom_submissions'].includes(s.stage)?['Open documents',()=>changeTab('documents')]:['Review customer information',()=>changeTab('overview')];
 return <aside ref={drawer} role="dialog" aria-modal="true" aria-labelledby="stage-panel-title" className="customer-stage-panel"><div className="row" style={{justifyContent:'space-between'}}><span className="detail-label">Current stage</span><button className="btn icon ghost sm" aria-label="Close stage panel" onClick={onClose}><IconX size={15}/></button></div><h2 id="stage-panel-title">{s.stageLabel}</h2><p className="small faint">{s.stageDays} days in this stage</p>
 {next&&<div className="current-stage-next"><span className="detail-label">Next action</span><h3>{next.text}</h3><p className="small">Responsible: {next.owner}</p><p className={'small '+(next.overdue?'late-txt':'faint')}>{next.overdue?next.dueWords:`Due ${fdateY(next.due)}`}</p></div>}
 {!!needed.length&&<section className="stage-needed"><h3>Information needed</h3>{needed.map(([label,value])=><p className={value?'complete':'missing'} key={label}><span>{value?'✓':'○'}</span>{label}<small>{value?'Recorded':'Missing'}</small></p>)}</section>}
 {['pending_installation','post_installation_docs'].includes(s.stage)&&<section className="stage-needed"><h3>Stage checklist</h3><label className="customer-verification"><input type="checkbox" checked={!!p.verification?.geo_photo?.checked} disabled={busy||!api.canDo('edit')} onChange={(e)=>act(()=>api.saveCustomerVerification(p.id,'geo_photo',e.target.checked),'Stage checklist updated')}/><span>Geo photo taken</span></label></section>}
 {primary[2]?<Link className="btn primary" to={primary[2]}>{primary[0]}<IconArrowRight size={14}/></Link>:<button className="btn primary" onClick={primary[1]}>{primary[0]}<IconArrowRight size={14}/></button>}
 {assigning&&api.canDo('edit')&&<form className="stage-assignment" onSubmit={(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);act(async()=>{await api.rescheduleInstallation(p.id,form.get('date'),'',form.get('team'));setAssigning(false);},'Installation assignment saved');}}><label className="fld"><span>Team</span><select className="select" name="team" defaultValue={p.team||''} required><option value="">Choose team</option>{api.meta.TEAMS.map((team)=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="fld"><span>Installation date</span><input className="input" type="date" name="date" required defaultValue={p.installDate||''}/></label><button className="btn" disabled={busy}>Save assignment</button></form>}
 {next&&api.canEditTrackItem(next.track,next.key)&&<details className="stage-task-update"><summary>Update current task</summary><select className="select" aria-label="Current task status" value={p.tracks[next.track]?.find((task)=>task.key===next.key)?.status||'not_started'} disabled={busy} onChange={(e)=>act(()=>api.updateTrackItem(p.id,next.track,next.key,e.target.value),'Current task updated')}>{Object.entries(api.STATUS_LABEL).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></details>}
 {following&&api.canDo('edit')&&<button className="btn stage-advance" disabled={busy} onClick={()=>setConfirmMove(true)}>Move to next stage <IconArrowRight size={14}/></button>}
 {confirmMove&&<StageMoveDialog project={p} onClose={()=>setConfirmMove(false)}/>}
 </aside>;
}
