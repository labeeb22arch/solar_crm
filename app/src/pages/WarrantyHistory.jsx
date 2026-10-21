import { useState } from 'react';
import * as api from '../data/api.js';
import { fdateY, useToast } from '../lib/hooks.jsx';
const statusLabel = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const fieldLabel = (v) => v.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
const timestamp = (value) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export default function WarrantyHistory({ record, onSaved }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const start = (issue) => {
    setEditing(issue?.id || 'new');
    setForm(issue ? { ...issue, note: '' } : { title: '', description: '', equipment: 'Installation', serial: '', reportedBy: '', raisedDate: today(), status: 'open', assignedTo: '', resolvedDate: '', resolution: '', note: '' });
    setError('');
  };
  const save = async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.saveWarrantyIssue(record.pid, editing === 'new' ? null : editing, form); setEditing(null); onSaved(); toast('Warranty issue history saved'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const input = (key, label, type = 'text', required = false) => <label className="fld"><span>{label}</span><input className="input" type={type} required={required} value={form[key] || ''} max={type === 'date' ? today() : undefined} disabled={busy} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}/></label>;
  return <section className="warranty-history">
    <div className="row" style={{ justifyContent: 'space-between', marginTop: 24, gap: 12 }}><h3>Warranty issues & service history</h3>{api.canDo('edit') && <button className="btn primary" disabled={busy} onClick={() => start(null)}>Raise issue / Add past issue</button>}</div>
    <p className="small faint">{record.issues.length} issues · {record.issues.filter((i) => i.status !== 'resolved').length} open · {record.issues.filter((i) => i.status === 'resolved').length} resolved</p>
    {editing && <form className="card card-b" onSubmit={save} style={{ marginBottom: 18 }}>
      <h3>{editing === 'new' ? 'Record warranty issue' : 'Update issue'}</h3>
      {editing === 'new' && <><div className="warranty-fields">{input('title', 'Issue title', 'text', true)}{input('raisedDate', 'Date raised', 'date', true)}{input('reportedBy', 'Reported by')}<label className="fld"><span>Affected equipment</span><select className="select" value={form.equipment} disabled={busy} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}>{['Panels', 'Inverter', 'Installation', 'Structure', 'Earthing / wiring', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="fld"><span>Related serial number</span><input className="input" list={'warranty-serial-options-' + record.pid} value={form.serial} disabled={busy} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))}/><datalist id={'warranty-serial-options-' + record.pid}>{[...record.moduleSerials, record.inverterSerial].filter(Boolean).map((serial, index) => <option value={serial} key={index}/>)}</datalist></label></div><label className="fld"><span>Issue details</span><textarea className="input" required disabled={busy} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}/></label></>}
      <div className="warranty-fields"><label className="fld"><span>Status</span><select className="select" disabled={busy} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value, resolvedDate: e.target.value === 'resolved' ? f.resolvedDate || today() : '', resolution: e.target.value === 'resolved' ? f.resolution || '' : '' }))}>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{input('assignedTo', 'Assigned team / technician')}
      {form.status === 'resolved' && <>{input('resolvedDate', 'Date resolved', 'date', true)}<label className="fld"><span>Resolution / work completed</span><textarea className="input" required disabled={busy} value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))}/></label></>}</div>
      <label className="fld"><span>Service update / note</span><textarea className="input" disabled={busy} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}/></label>
      {error && <div className="form-err" role="alert">{error}</div>}<div className="row" style={{ gap: 8, marginTop: 14 }}><button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save issue update'}</button><button type="button" className="btn" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    {!record.issues.length && <p className="small faint">No warranty issues recorded yet.</p>}
    {record.issues.map((issue) => <details className="card" style={{ marginBottom: 12 }} key={issue.id}>
      <summary className="warranty-issue-summary"><strong>{issue.title}</strong><span>{statusLabel[issue.status]}</span><span>Raised {fdateY(issue.raisedDate)}</span><span>{issue.resolvedDate ? 'Resolved ' + fdateY(issue.resolvedDate) : 'Awaiting resolution'}</span></summary>
      <div className="card-b"><dl className="kv"><dt>Equipment</dt><dd>{issue.equipment}</dd><dt>Serial number</dt><dd>{issue.serial || 'Not specified'}</dd><dt>Reported by</dt><dd>{issue.reportedBy || 'Not recorded'}</dd><dt>Assigned to</dt><dd>{issue.assignedTo || 'Unassigned'}</dd><dt>Issue details</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{issue.description}</dd>{issue.resolution && <><dt>Resolution</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{issue.resolution}</dd></>}</dl>
        {api.canDo('edit') && <button className="btn" disabled={busy} onClick={() => start(issue)}>Add update / Change status</button>}
        <h4>Full issue history</h4><ol className="warranty-events">{issue.history.map((event, index) => <li key={event.id || index}><b>{event.kind === 'raised' ? 'Issue recorded' : event.previousStatus === 'resolved' && event.status !== 'resolved' ? 'Issue reopened' : 'Issue updated'} · {statusLabel[event.status]}</b><div className="small faint">{timestamp(event.at)} · {event.by}</div><p className="small">{event.kind === 'raised' ? 'Raised ' + fdateY(issue.raisedDate) + ' · ' : ''}Assigned to: {event.assignedTo || 'Unassigned'}{event.resolvedDate ? ' · Resolved ' + fdateY(event.resolvedDate) : ''}</p>{event.resolution && <p style={{ whiteSpace: 'pre-wrap' }}>Resolution: {event.resolution}</p>}{event.note && <p style={{ whiteSpace: 'pre-wrap' }}>{event.note}</p>}</li>)}</ol>
      </div>
    </details>)}
    {!!record.warrantyHistory.length && <details><summary className="btn">Warranty details change history · {record.warrantyHistory.length}</summary><ol className="warranty-events">{record.warrantyHistory.slice().reverse().map((event) => <li key={event.id}><b>Warranty details saved</b><div className="small faint">{timestamp(event.at)} · {event.by}</div>{event.changes.length ? event.changes.map((change) => <div className="small" key={change.field}>{fieldLabel(change.field)}: {String(change.before) || 'Not recorded'} → {String(change.after) || 'Not recorded'}</div>) : <div className="small">Details confirmed without changes.</div>}</li>)}</ol></details>}
  </section>;
}
