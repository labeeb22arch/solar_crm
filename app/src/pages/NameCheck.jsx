import {useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import * as api from '../data/api.js';
import {useData,useSession} from '../lib/hooks.jsx';
import {PageHead,Empty} from '../components/ui.jsx';
import LoanNameCheck from '../components/LoanNameCheck.jsx';
const status=r=>!r.verifiedAt?'pending':r.reviewStatus==='change_needed'||(!r.match&&!r.resolution)?'change_needed':'matches';
export default function NameCheck() {
 const session=useSession();const [rows]=useData(()=>api.listNameChecks(),[session.role,session.branch]);const [params,setParams]=useSearchParams();const [filter,setFilter]=useState('all'),[search,setSearch]=useState('');
 const list=(rows||[]).filter(r=>(filter==='all'||status(r)===filter)&&`${r.name} ${r.crn} ${r.discomName} ${r.bankName}`.toLowerCase().includes(search.toLowerCase()));
 const selected=(rows||[]).find(r=>r.pid===params.get('p'))||list[0];
 return <div className="page"><PageHead title="Name check" sub="Compare the electricity bill and bank account names, then confirm the result."/><div className="row" style={{gap:8,flexWrap:'wrap',marginBottom:16}}>{[['all','All customers'],['pending','To check'],['matches','Matches'],['change_needed','Change needed']].map(([key,label])=><button className={'btn '+(filter===key?'primary':'')} key={key} onClick={()=>{setFilter(key);setParams({});}}>{label} · {(rows||[]).filter(r=>key==='all'||status(r)===key).length}</button>)}</div><div className="name-check-layout"><section className="card card-b"><input className="input" aria-label="Search name checks" placeholder="Search customer or name" value={search} onChange={e=>{setSearch(e.target.value);setParams({});}}/>{rows===null?<p>Loading…</p>:!list.length?<Empty>No customers in this view.</Empty>:<div className="name-check-customers">{list.map(r=><button className={'name-check-customer '+(r.pid===selected?.pid?'selected':'')} key={r.pid} onClick={()=>setParams({p:r.pid})}><strong>{r.name}</strong><small>{r.crn} · {status(r)==='pending'?'To check':status(r)==='matches'?'Matches':'Change needed'}</small></button>)}</div>}</section>{selected?<div><div className="card card-b"><strong>{selected.name}</strong><p className="small faint">{selected.crn} · {selected.discom} · {selected.bank}</p></div><LoanNameCheck key={selected.pid} customerId={selected.pid}/></div>:<Empty>Select a customer.</Empty>}</div></div>;
}
