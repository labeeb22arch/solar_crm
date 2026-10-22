import { useState } from 'react';
import * as api from '../data/api.js';
import { useToast } from '../lib/hooks.jsx';
export default function DemoDataTools() {
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState('');
 const toast=useToast();
 return <details className="card card-b" style={{marginTop:24}}><summary style={{cursor:'pointer',fontWeight:600}}>Demo data</summary><p className="small faint" style={{margin:'12px 0'}}>Add 44 synthetic customers across all 11 stages, with payments, finance tracking, equipment and warranty examples. Existing customers are retained.</p><button className="btn" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{const saved=await api.addDemoCustomers();const text=saved.added?`${saved.added} demo customers added`:'This demo pack is already present';setResult(text);toast(text);}catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'Adding demo customers…':'Add demo customers'}</button>{result&&<p role="status" className="small">{result}</p>}{error&&<p role="alert" className="form-err">{error}</p>}</details>;
}
