import { useState } from 'react';
import * as api from '../data/api.js';
import { useToast } from '../lib/hooks.jsx';
import { ManagedSelect } from './ManagedOptions.jsx';
export default function CustomerRouting({project:p}) {
 const [editing,setEditing]=useState(false);const [form,setForm]=useState({});const [busy,setBusy]=useState(false);const [error,setError]=useState('');const toast=useToast();
 if(!api.canDo('edit'))return null;
 return !editing?<button className="btn" onClick={()=>{setForm({city:p.city||'',discom:p.discom||'',bank:p.bank||'',paymentMethod:p.paymentMethod||'',registrationStatus:p.registrationStatus||''});setEditing(true);}}>Edit location & payment details</button>:<form className="card card-b" onSubmit={async(e)=>{e.preventDefault();setBusy(true);setError('');try{await api.updateProject(p.id,form);setEditing(false);toast('Customer details saved');}catch(e){setError(e.message);}finally{setBusy(false);}}}><div className="warranty-fields">{[['city','City / area','cities'],['discom','DISCOM','discoms'],['bank','Bank','banks'],['registrationStatus','Registration status','registration_statuses'],['paymentMethod','Payment method','payment_methods']].map(([key,label,category])=><label className="fld" key={key}><span>{label}</span><ManagedSelect category={category} placeholder={`Choose ${label.toLowerCase()}`} className="select" disabled={busy} value={form[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})}/></label>)}</div>{error&&<p className="form-err" role="alert">{error}</p>}<div className="row" style={{gap:8}}><button className="btn primary" disabled={busy}>Save details</button><button className="btn" disabled={busy} type="button" onClick={()=>setEditing(false)}>Cancel</button></div></form>;
}
