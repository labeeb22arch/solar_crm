import { IconAlertTriangle,IconX } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import WarrantyHistory from './WarrantyHistory.jsx';
import { useState } from 'react';
import * as api from '../data/api.js';
import { useData, useSession, fdateY } from '../lib/hooks.jsx';
import { PageHead, CustName, Empty, Pill } from '../components/ui.jsx';

const show = (value) => value === '' || value == null ? 'Not recorded' : value;
const date = (value) => value ? fdateY(value) : 'Not recorded';
export default function WarrantyRecords({ customerId, embedded = false, coverageOnly = false }) {
  const [params]=useSearchParams();
  const selected=customerId||params.get('p');
  const [issueCustomer,setIssueCustomer]=useState(null);
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [rows] = useData(() => customerId ? api.getWarranty(customerId).then((record) => [record]) : api.listWarranty(), [customerId, session.role, session.branch, version]);
  const [search, setSearch] = useState('');
  const list = (rows || []).filter((r) => `${r.name} ${r.crn} ${r.invoiceNumber} ${r.moduleSerials.join(' ')} ${r.inverterSerial}`.toLowerCase().includes(search.toLowerCase())&&(!selected||r.pid===selected));
  return <div className={embedded ? "embedded-warranty" : "page"}>
    {!embedded && <PageHead title={selected?"Warranty record":"Completed"} sub={selected?"Installation details, coverage and serial numbers. Record service issues below.":"Finished projects, warranty cover and service history."}>{(api.canDo('edit')||api.canDo('field'))&&<button className="btn warranty-warning" title="Report warranty issue" aria-label="Report warranty issue" disabled={!rows?.length} onClick={()=>setIssueCustomer(selected||rows[0].pid)}><IconAlertTriangle size={22}/>Report issue</button>}</PageHead>}
    {!embedded&&selected&&<Link className="btn" style={{marginBottom:18}} to="/completed">← All completed customers</Link>}
    {!embedded && !selected && <input className="input" style={{ maxWidth: 400, marginBottom: 18 }} aria-label="Search warranty records" placeholder="Search customer, invoice or serial number" value={search} onChange={(e) => setSearch(e.target.value)} />}
    {rows === null ? <div className="card card-b">Loading warranties…</div> : !list.length ? <Empty>No matching completed customers.</Empty> : list.map((r) => <details className={"card warranty-record"+(selected?" full-record":"")} key={r.pid} open={!!selected || embedded || undefined}>
      <summary><div><strong>{r.name}</strong><div className="small faint">{r.crn} · {r.city} · {r.kwp} kWp</div></div><div><span className="small faint">Invoice date</span><div>{date(r.invoiceDate)}</div></div><div><span className="small faint">Installation cover until</span><div>{date(r.terms[0].until)} · {r.workmanshipYears === '' ? 'Years not recorded' : `${r.workmanshipYears} years`}</div></div><button type="button" className="btn icon ghost warranty-warning" title="Report warranty issue" aria-label={`Report warranty issue for ${r.name}`} onClick={e=>{e.preventDefault();e.stopPropagation();setIssueCustomer(r.pid);}}><IconAlertTriangle size={21}/></button><span className="small">{r.issues.filter((i) => i.status !== 'resolved').length} open issues</span><Link className="btn sm" to={`/completed?p=${r.pid}`} onClick={e=>e.stopPropagation()}>View warranty record</Link></summary>
      <div className="card-b">
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}><CustName id={r.pid} name={r.name} crn={r.crn} /><Pill status={r.registered ? 'done' : 'waiting_third'}>{r.registered ? 'Warranty registered' : 'Registration pending'}</Pill></div>
        <>
          <div className="warranty-fields"><section><h3>Invoice & installation</h3><dl className="kv"><dt>Invoice number</dt><dd>{show(r.invoiceNumber)}</dd><dt>Invoice date</dt><dd>{date(r.invoiceDate)}</dd><dt>Warranty starts</dt><dd>{date(r.startDate)}</dd><dt>Installed on</dt><dd>{date(r.installDate)}</dd><dt>Commissioned on</dt><dd>{date(r.commissioningDate)}</dd><dt>Installation team</dt><dd>{show(r.teamName)}</dd><dt>Technician</dt><dd>{show(r.technician)}</dd><dt>Site</dt><dd>{show(r.address)}</dd><dt>Customer phone</dt><dd>{show(r.phone)}</dd></dl></section>
          <section><h3>Warranty coverage</h3><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Coverage</th><th>Years</th><th>Valid until</th></tr></thead><tbody>{r.terms.map((t) => <tr key={t.key}><td>{t.label}</td><td>{show(t.years)}</td><td>{date(t.until)}</td></tr>)}</tbody></table></div></section></div>
          {!coverageOnly&&<>          <div className="warranty-fields"><section><h3>Panels · {r.moduleSerials.length} serials recorded</h3><dl className="kv"><dt>Manufacturer</dt><dd>{show(r.moduleMake)}</dd><dt>Model / technology</dt><dd>{show(r.moduleModel)}</dd><dt>Rating</dt><dd>{r.moduleWp ? `${r.moduleWp} Wp` : 'Not recorded'}</dd></dl><h4>Panel serial numbers</h4>{r.moduleSerials.length ? <ol className="warranty-serials">{r.moduleSerials.map((serial, i) => <li key={i}>{serial}</li>)}</ol> : <p className="small faint">No panel serial numbers recorded.</p>}</section>
          <section><h3>Inverter</h3><dl className="kv"><dt>Manufacturer</dt><dd>{show(r.inverterMake)}</dd><dt>Model</dt><dd>{show(r.inverterModel)}</dd><dt>Capacity</dt><dd>{r.inverterCapacity ? `${r.inverterCapacity} kW` : 'Not recorded'}</dd><dt>Phase / type</dt><dd>{show(r.inverterPhase)}</dd><dt>Serial number</dt><dd className="mono">{show(r.inverterSerial)}</dd></dl><h3>Other equipment</h3><dl className="kv"><dt>Mounting structure</dt><dd>{show(r.structure)}</dd><dt>Earthing / surge protection</dt><dd>{show(r.earthing)}</dd></dl></section></div>
</>}
          <h3>Registration & service</h3><dl className="kv"><dt>Certificate / registration</dt><dd>{show(r.certificateNumber)}</dd><dt>Certificate document</dt><dd>{/^https?:\/\//i.test(r.certificateUrl || '') ? <a href={r.certificateUrl} target="_blank" rel="noopener noreferrer">Open warranty document</a> : 'Not recorded'}</dd><dt>Service contact</dt><dd>{show(r.supportContact)}</dd><dt>Coverage & service notes</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{show(r.notes)}</dd></dl>
        </>
        <WarrantyHistory record={r} onSaved={() => setVersion((v) => v + 1)} />
      </div>
    </details>)}
    {issueCustomer&&<><div className="overlay" onClick={()=>setIssueCustomer(null)}/><section className="side-panel warranty-issue-dialog" role="dialog" aria-modal="true" aria-labelledby="warranty-issue-title"><div className="card-h"><h2 id="warranty-issue-title">Warranty issue</h2><button className="btn icon ghost" aria-label="Close issue form" onClick={()=>setIssueCustomer(null)}><IconX size={20}/></button></div><div className="card-b">{!embedded&&<label className="fld"><span>Customer</span><select className="select" value={issueCustomer} onChange={e=>setIssueCustomer(e.target.value)}>{(rows||[]).map(r=><option key={r.pid} value={r.pid}>{r.name} · {r.crn}</option>)}</select></label>}{rows?.find(r=>r.pid===issueCustomer)&&<WarrantyHistory key={issueCustomer} record={rows.find(r=>r.pid===issueCustomer)} autoOpen editorOnly onCancel={()=>setIssueCustomer(null)} onSaved={()=>{setIssueCustomer(null);setVersion(v=>v+1);}}/>}</div></section></>}
  </div>;
}
