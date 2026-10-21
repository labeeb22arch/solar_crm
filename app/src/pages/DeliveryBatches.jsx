import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../data/api.js';
import { combineBOM } from '../lib/delivery.js';
import { useData, useToast, fdateY } from '../lib/hooks.jsx';
import { PageHead, CustName, Empty, Pill } from '../components/ui.jsx';

export default function DeliveryBatches({ kind }) {
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [batches] = useData(() => api.listDeliveryBatches().catch((e) => { setLoadError(e.message); return []; }), [revision]);
  const [candidates] = useData(() => api.deliveryCandidates().catch((e) => { setLoadError(e.message); return []; }), [revision]);
  const [inventory] = useData(() => api.listInventory().catch((e) => { setLoadError(e.message); return []; }), [revision]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(!!params.get('p'));
  const [ids, setIds] = useState(params.get('p') ? [params.get('p')] : []);
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [team, setTeam] = useState('');
  const [date, setDate] = useState(api.meta.TODAY);
  const [filter, setFilter] = useState('all');
  const [ticks, setTicks] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const editable = api.canDo('edit');
  const batch = batches?.find((b) => b.id === selected) || batches?.[0];
  useEffect(() => { setTicks({}); setError(''); }, [batch?.id, batch?.status]);
  const assigned = new Set((batches || []).filter((b) => b.status !== 'cancelled').flatMap((b) => b.customers.map((c) => c.id)));
  const available = (candidates || []).filter((p) => !assigned.has(p.id));
  const chosen = available.filter((p) => ids.includes(p.id));
  const lines = combineBOM(chosen);
  const action = async (type, payload) => {
    if (busy) return; setBusy(true); setError('');
    try {
      await api.deliveryBatchAction(type, payload);
      setRevision((n) => n + 1);
      if (type === 'create') { setCreating(false); setIds([]); setParams({}); }
      toast(type === 'loaded' ? 'Truck loaded · store stock deducted' : type === 'create' ? 'Batch created · materials reserved' : type === 'cancelled' ? 'Batch cancelled · reservation released' : 'Delivery completed');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="page">
    <PageHead title={kind === 'tally' ? 'Truck loading' : 'Delivery batches'} sub="One truck, its customers and their materials. Stock leaves the store when loading is confirmed.">
      {editable && <button className="btn primary" onClick={() => { setCreating(true); setError(''); }}>Add delivery batch</button>}
    </PageHead>
    <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{['all', 'planned', 'loaded', 'delivered', 'cancelled'].map((status) => <button className={'btn ' + (filter === status ? 'primary' : '')} key={status} onClick={() => setFilter(status)} aria-pressed={filter === status}>{status[0].toUpperCase() + status.slice(1)} · {(batches || []).filter((b) => status === 'all' || b.status === status).length}</button>)}<button className="btn" disabled={busy} onClick={() => { setLoadError(''); setRevision((n) => n + 1); }}>Refresh</button></div>
    {(error || loadError) && <div className="form-err" role="alert">{error || loadError}</div>}
    <div className="grid2" style={{ alignItems: 'start' }}>
      <div className="card">{!batches ? <div className="card-b">Loading batches…</div> : !batches.filter((b) => filter === 'all' || b.status === filter).length ? <Empty>No delivery batches in this view.</Empty> : batches.filter((b) => filter === 'all' || b.status === filter).map((b) => <button key={b.id} className={'btn delivery-batch-row' + (batch?.id === b.id ? ' primary' : '')} onClick={() => setSelected(b.id)}><b>{b.vehicle}</b><span>{fdateY(b.date)} · {b.customers.length} customers · {b.status}</span></button>)}</div>
      {batch && <div className="card"><div className="card-h">Truck {batch.vehicle}<Pill status={batch.status === 'delivered' ? 'done' : 'in_progress'}>{batch.status}</Pill></div><div className="card-b">
        <div className="kv"><span>Batch</span><span>{batch.id.slice(0, 8).toUpperCase()}</span><span>Delivery date</span><span>{fdateY(batch.date)}</span><span>Driver</span><span>{batch.driver || 'Not assigned'}</span><span>Team</span><span>{api.meta.TEAMS.find((t) => t.id === batch.team)?.name || 'Not assigned'}</span></div>
        <h3>Customers</h3>{batch.customers.map((c) => <div key={c.id}><CustName id={c.id} name={c.name} crn={c.crn} /></div>)}
      </div><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Loaded</th><th>BOM material</th><th>Quantity</th></tr></thead><tbody>{batch.lines.map((line) => <tr key={line.sku}><td><input type="checkbox" aria-label={`Loaded ${line.name}`} disabled={busy || !editable || batch.status !== 'planned'} checked={batch.status === 'loaded' || batch.status === 'delivered' || !!ticks[line.sku]} onChange={(e) => setTicks((t) => ({ ...t, [line.sku]: e.target.checked }))} /></td><td>{line.name}</td><td>{line.qty} {line.unit}</td></tr>)}</tbody></table></div>
        <div className="card-b"><p className="small faint">{batch.status === 'planned' ? 'Reserved in store. Check every material before confirming loading.' : batch.status === 'cancelled' ? 'Reservation released. No stock was deducted.' : `Stock deducted at loading: ${fdateY(batch.loadedAt)}`}</p><div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {editable && batch.status === 'planned' && <><button className="btn primary" disabled={busy || batch.lines.some((l) => !ticks[l.sku])} onClick={() => action('loaded', { id: batch.id, checked: Object.keys(ticks).filter((k) => ticks[k]) })}>Confirm truck loaded</button><button className="btn" disabled={busy} onClick={() => action('cancelled', { id: batch.id })}>Cancel batch</button></>}
          {editable && batch.status === 'loaded' && <button className="btn primary" disabled={busy} onClick={() => action('delivered', { id: batch.id })}>Mark delivered</button>}
        </div></div>
      </div>}
    </div>
    {creating && editable && <><div className="overlay" onClick={() => { if (!busy) setCreating(false); }} /><form className="side-panel user-form" role="dialog" aria-modal="true" aria-labelledby="batch-heading" onSubmit={(e) => { e.preventDefault(); action('create', { customerIds: chosen.map((p) => p.id), vehicle, driver, team, date }); }}>
      <div className="card-h" id="batch-heading">Add delivery batch</div><div className="user-form-body">
        <label className="fld"><span>Truck registration</span><input autoFocus className="input" required value={vehicle} disabled={busy} onChange={(e) => setVehicle(e.target.value)} /></label>
        <label className="fld"><span>Driver</span><input className="input" value={driver} disabled={busy} onChange={(e) => setDriver(e.target.value)} /></label>
        <label className="fld"><span>Delivery date</span><input className="input" type="date" required value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="fld"><span>Installation team</span><select className="select" required value={team} disabled={busy} onChange={(e) => setTeam(e.target.value)}><option value="">Choose team</option>{api.meta.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <fieldset disabled={busy}><legend>Customers · {chosen.length} selected</legend><div style={{ maxHeight: 220, overflow: 'auto' }}>{available.map((p) => <label key={p.id} style={{ display: 'block', padding: '6px 0' }}><input type="checkbox" checked={ids.includes(p.id)} onChange={(e) => setIds((v) => e.target.checked ? [...v, p.id] : v.filter((id) => id !== p.id))} /> {p.name} · {p.crn} · {p.city}</label>)}</div></fieldset>
        {!!lines.length && <><h3>Combined BOM</h3>{lines.map((l) => { const i = inventory?.find((x) => x.sku === l.sku); const free = i ? i.stock - i.reserved : 0; return <div className="small" key={l.sku} style={{ color: free < l.qty ? 'var(--coral)' : undefined }}>{l.name}: {l.qty} {l.unit} · {free} free</div>; })}</>}
        {error && <div className="form-err" role="alert">{error}</div>}
      </div><div className="user-form-foot"><button className="btn" type="button" disabled={busy} onClick={() => setCreating(false)}>Cancel</button><button className="btn primary" type="submit" disabled={busy || !chosen.length}>{busy ? 'Saving…' : 'Create & reserve materials'}</button></div>
    </form></>}
  </div>;
}
