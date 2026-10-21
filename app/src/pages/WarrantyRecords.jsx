import { ManagedInput } from '../components/ManagedOptions.jsx';
import WarrantyHistory from './WarrantyHistory.jsx';
import { useState } from 'react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, fdateY } from '../lib/hooks.jsx';
import { PageHead, CustName, Empty, Pill } from '../components/ui.jsx';

const sections = [
  ['Invoice & warranty', [['invoiceNumber', 'Invoice number'], ['invoiceDate', 'Invoice date', 'date'], ['startDate', 'Warranty start date', 'date'], ['workmanshipYears', 'Installation / workmanship (years)', 'number']]],
  ['Panels', [['moduleMake', 'Manufacturer'], ['moduleModel', 'Model / technology'], ['moduleWp', 'Panel rating (Wp)', 'number'], ['moduleProductYears', 'Product warranty (years)', 'number'], ['modulePerformanceYears', 'Performance warranty (years)', 'number']]],
  ['Inverter', [['inverterMake', 'Manufacturer'], ['inverterModel', 'Model'], ['inverterCapacity', 'Capacity (kW)', 'number'], ['inverterPhase', 'Phase / type'], ['inverterYears', 'Warranty (years)', 'number']]],
  ['Other equipment & support', [['structure', 'Mounting structure'], ['structureYears', 'Structure warranty (years)', 'number'], ['earthing', 'Earthing / surge protection'], ['certificateNumber', 'Warranty registration / certificate number'], ['certificateUrl', 'Certificate / document link', 'url'], ['supportContact', 'Service contact'], ['notes', 'Coverage, exclusions & service notes']]],
];
const show = (value) => value === '' || value == null ? 'Not recorded' : value;
const date = (value) => value ? fdateY(value) : 'Not recorded';
export default function WarrantyRecords({ customerId, embedded = false }) {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [rows] = useData(() => customerId ? api.getWarranty(customerId).then((record) => [record]) : api.listWarranty(), [customerId, session.role, session.branch, version]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const save = async (event, id) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.saveWarranty(id, form); setEditing(null); setVersion((v) => v + 1); toast('Warranty details saved'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const list = (rows || []).filter((r) => `${r.name} ${r.crn} ${r.invoiceNumber} ${r.moduleSerials.join(' ')} ${r.inverterSerial}`.toLowerCase().includes(search.toLowerCase()));
  return <div className={embedded ? "embedded-warranty" : "page"}>
    {!embedded && <PageHead title="Warranty" sub="Invoice dates, installation cover, equipment details and recorded serial numbers." />}
    {!embedded && <input className="input" style={{ maxWidth: 400, marginBottom: 18 }} aria-label="Search warranty records" placeholder="Search customer, invoice or serial number" value={search} onChange={(e) => setSearch(e.target.value)} />}
    {rows === null ? <div className="card card-b">Loading warranties…</div> : !list.length ? <Empty>No matching installed customers.</Empty> : list.map((r) => <details className="card warranty-record" key={r.pid} open={embedded || undefined}>
      <summary><div><strong>{r.name}</strong><div className="small faint">{r.crn} · {r.city} · {r.kwp} kWp</div></div><div><span className="small faint">Invoice date</span><div>{date(r.invoiceDate)}</div></div><div><span className="small faint">Installation cover until</span><div>{date(r.terms[0].until)} · {r.workmanshipYears === '' ? 'Years not recorded' : `${r.workmanshipYears} years`}</div></div><span className="small">{r.issues.filter((i) => i.status !== 'resolved').length} open issues · View details</span></summary>
      <div className="card-b">
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}><CustName id={r.pid} name={r.name} crn={r.crn} /><Pill status={r.registered ? 'done' : 'waiting_third'}>{r.registered ? 'Warranty registered' : 'Registration pending'}</Pill>{api.canDo('edit') && <button className="btn" disabled={busy} onClick={() => { setEditing(r.pid); setForm({ ...r }); setError(''); }}>Edit warranty details</button>}</div>
        {editing === r.pid ? <form onSubmit={(e) => save(e, r.pid)}>
          {sections.map(([title, fields]) => <section key={title}><h3>{title}</h3><div className="warranty-fields">{fields.map(([key, label, type = 'text']) => <label className="fld" key={key}><span>{label}</span>{key === 'notes' ? <textarea className="input" value={form[key] ?? ''} disabled={busy} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /> : <ManagedInput className="input" category={({moduleMake:'panel_brands',inverterMake:'inverter_brands',moduleModel:'panel_models',inverterModel:'inverter_models',inverterPhase:'meter_phases',structure:'structures'})[key]} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} value={form[key] ?? ''} disabled={busy} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />}</label>)}</div></section>)}
          {error && <div className="form-err" role="alert">{error}</div>}<div className="row" style={{ gap: 8, marginTop: 16 }}><button className="btn primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save warranty'}</button><button className="btn" disabled={busy} type="button" onClick={() => setEditing(null)}>Cancel</button></div>
        </form> : <>
          <div className="warranty-fields"><section><h3>Invoice & installation</h3><dl className="kv"><dt>Invoice number</dt><dd>{show(r.invoiceNumber)}</dd><dt>Invoice date</dt><dd>{date(r.invoiceDate)}</dd><dt>Warranty starts</dt><dd>{date(r.startDate)}</dd><dt>Installed on</dt><dd>{date(r.installDate)}</dd><dt>Commissioned on</dt><dd>{date(r.commissioningDate)}</dd><dt>Installation team</dt><dd>{show(r.teamName)}</dd><dt>Technician</dt><dd>{show(r.technician)}</dd><dt>Site</dt><dd>{show(r.address)}</dd><dt>Customer phone</dt><dd>{show(r.phone)}</dd></dl></section>
          <section><h3>Warranty coverage</h3><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Coverage</th><th>Years</th><th>Valid until</th></tr></thead><tbody>{r.terms.map((t) => <tr key={t.key}><td>{t.label}</td><td>{show(t.years)}</td><td>{date(t.until)}</td></tr>)}</tbody></table></div></section></div>
          <div className="warranty-fields"><section><h3>Panels · {r.moduleSerials.length} serials recorded</h3><dl className="kv"><dt>Manufacturer</dt><dd>{show(r.moduleMake)}</dd><dt>Model / technology</dt><dd>{show(r.moduleModel)}</dd><dt>Rating</dt><dd>{r.moduleWp ? `${r.moduleWp} Wp` : 'Not recorded'}</dd></dl><h4>Panel serial numbers</h4>{r.moduleSerials.length ? <ol className="warranty-serials">{r.moduleSerials.map((serial, i) => <li key={i}>{serial}</li>)}</ol> : <p className="small faint">No panel serial numbers recorded.</p>}</section>
          <section><h3>Inverter</h3><dl className="kv"><dt>Manufacturer</dt><dd>{show(r.inverterMake)}</dd><dt>Model</dt><dd>{show(r.inverterModel)}</dd><dt>Capacity</dt><dd>{r.inverterCapacity ? `${r.inverterCapacity} kW` : 'Not recorded'}</dd><dt>Phase / type</dt><dd>{show(r.inverterPhase)}</dd><dt>Serial number</dt><dd className="mono">{show(r.inverterSerial)}</dd></dl><h3>Other equipment</h3><dl className="kv"><dt>Mounting structure</dt><dd>{show(r.structure)}</dd><dt>Earthing / surge protection</dt><dd>{show(r.earthing)}</dd></dl></section></div>
          <h3>Registration & service</h3><dl className="kv"><dt>Certificate / registration</dt><dd>{show(r.certificateNumber)}</dd><dt>Certificate document</dt><dd>{/^https?:\/\//i.test(r.certificateUrl || '') ? <a href={r.certificateUrl} target="_blank" rel="noopener noreferrer">Open warranty document</a> : 'Not recorded'}</dd><dt>Service contact</dt><dd>{show(r.supportContact)}</dd><dt>Coverage & service notes</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{show(r.notes)}</dd></dl>
        </>}
        <WarrantyHistory record={r} onSaved={() => setVersion((v) => v + 1)} />
      </div>
    </details>)}
  </div>;
}
