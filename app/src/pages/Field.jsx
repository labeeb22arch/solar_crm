import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconCamera, IconKeyboard, IconFileSpreadsheet, IconPhone, IconMapPin, IconTrash, IconCheck, IconArrowLeft, IconChevronRight, IconBarcode, IconCpu,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, fdate } from '../lib/hooks.jsx';
import { Pill, Empty, StatusLine, CustName, Avatar, IconChip } from '../components/ui.jsx';
import { IconAlertTriangle, IconPhoto, IconTool, IconCalendarEvent, IconBarcode as IconBarcode2, IconListCheck, IconCalendar } from '@tabler/icons-react';

const CHECKS = ['Arrived on site, photo of roof', 'Structure fixed & levelled', 'Modules mounted', 'DC wiring + MC4 crimped', 'Earthing & lightning arrestor', 'Inverter + ACDB/DCDB mounted', 'Customer walkthrough done'];

export default function Field() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [jobs] = useData(() => api.listFieldJobs(), [session.role, session.technician, session.teamId, session.branch]);
  const pid = params.get('p');
  if (pid) return <Job pid={pid} onBack={() => setParams({})} />;
  const today = (jobs || []).filter((j) => j.installDate === api.meta.TODAY);
  const upcoming = (jobs || []).filter((j) => j.installDate > api.meta.TODAY && j.installStatus !== 'done');
  const needSerials = (jobs || []).filter((j) => j.installStatus === 'done' && j.serialCount === 0);
  const Section = ({ title, list, empty, icon, tone }) => (
    <>
      <h2 className="field-h"><IconChip icon={icon} tone={tone} size="sm" /><b className="num">{list.length}</b> {title}</h2>
      {list.length === 0 ? <div className="card"><Empty icon={icon} >{empty}</Empty></div> : <div className="job-list">
        {list.slice(0, 15).map((j) => (
          <button type="button" key={j.id} className="job-row" onClick={() => setParams({ p: j.id })}>
            <Avatar name={j.name} size="md" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="t ell">{j.name}</div>
              <div className="m"><span className="mono">{j.crn}</span>·<span>{j.city}</span>·<span>{j.kwp} kWp</span>·<span>{api.when(j.installDate)}</span></div>
              <div className="m">{j.address} · {j.teamName}</div>
              <StatusLine s={j} />
            </div>
            <span className={'serial-pill' + (j.serialCount >= j.expected ? ' ok' : '')} title="Serial numbers scanned"><IconBarcode2 size={13} />{j.serialCount}/{j.expected}</span>
            <IconChevronRight size={16} className="faint" />
          </button>
        ))}
      </div>}
    </>
  );
  return (
    <div className="field">
      <div className="field-hero">
        <div className="hello-date">{session.role === 'Technician' ? session.technician : session.role === 'Installation Team' ? api.meta.TEAMS.find((t) => t.id === session.teamId)?.name : 'All teams'} · {new Date(api.meta.TODAY).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        <h1>My jobs</h1>
        <p>Your installation visits. Tap a job for the address, checklist, photos and serial scanning.</p>
        <div className="field-stats">
          <span><b>{today.length}</b>today</span><span><b>{upcoming.length}</b>upcoming</span><span><b>{needSerials.length}</b>serials due</span>
        </div>
      </div>
      <Section icon={IconTool} tone="orange" title={today.length === 1 ? 'installation today' : 'installations today'} list={today} empty="No installation booked for today. New jobs appear here when the office books a date." />
      <Section icon={IconCalendarEvent} tone="blue" title={upcoming.length === 1 ? 'upcoming installation' : 'upcoming installations'} list={upcoming} empty="Nothing booked after today yet." />
      <Section icon={IconBarcode2} tone="violet" title={needSerials.length === 1 ? 'job waiting for serial numbers' : 'jobs waiting for serial numbers'} list={needSerials} empty="All installed jobs have their serial numbers. Well done." />
    </div>
  );
}

function Job({ pid, onBack }) {
  const [p] = useData(() => api.getProject(pid), [pid]);
  const session = useSession();
  const toast = useToast();
  const [mode, setMode] = useState('camera');
  const [mods, setMods] = useState([]);
  const [inv, setInv] = useState('');
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [checks, setChecks] = useState({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (p && p.serials && !loaded) { setMods(p.serials.modules); setInv(p.serials.inverter); setLoaded(true); } }, [p, loaded]);
  if (!p) return <div className="field"><Empty>Loading…</Empty></div>;
  if (p.forbidden || p.notFound) return <div className="field"><button className="btn sm ghost" onClick={onBack}><IconArrowLeft size={15} /> My jobs</button><Empty hint="You can only open jobs assigned to you.">This job is not in your list.</Empty></div>;
  const expected = Math.ceil(p.kwp * 1000 / 540);
  const ro = !api.canDo('field');
  const issue = async () => {
    const t = window.prompt('What is the problem on site? (e.g. roof access locked, material short)');
    if (t && t.trim()) { await api.reportIssue(p.id, t.trim()); toast('Issue reported to the office'); }
  };
  const photos = async () => { await api.addPhotos(p.id, 4); toast('4 photos added to the Drive folder (demo)'); };
  const add = (s) => {
    const v = s.trim().toUpperCase();
    if (!v) return;
    if (mods.includes(v)) { toast('Duplicate serial ignored: ' + v); return; }
    setMods((m) => [v, ...m]);
  };
  const scan = () => {
    setScanning(true);
    setTimeout(() => { add('HM540' + (2700000 + Math.floor(Math.random() * 99999))); setScanning(false); if (navigator.vibrate) navigator.vibrate(30); }, 650);
  };
  const importXls = () => {
    const base = 2800000 + Math.floor(Math.random() * 9000) * 10;
    const list = Array.from({ length: expected }, (_, i) => 'HM540' + (base + i));
    setMods((m) => [...new Set([...list, ...m])]);
    if (!inv) setInv('INV' + (900000 + Math.floor(Math.random() * 9999)));
    toast(`Imported ${list.length} serials from Packing_List_${p.crn}.xlsx (mock)`);
  };
  const save = async () => { await api.saveSerials(p.id, { modules: mods, inverter: inv }); toast('Serials saved to ' + p.crn); };
  const installed = p.tracks.supply.find((x) => x.key === 'installation').status === 'done';

  return (
    <div className="field">
      <button className="btn sm ghost" onClick={onBack} style={{ marginBottom: 8 }}><IconArrowLeft size={15} /> Jobs</button>
      <div className="card job">
        <div className="row"><Avatar name={p.name} size="lg" /><div className="grow" style={{ minWidth: 0 }}><div style={{ fontSize: 17 }}><CustName id={p.id} name={p.name} crn={p.crn} meta={`${p.kwp} kWp · ${p.discom}`} /></div></div><Pill status={installed ? 'done' : 'in_progress'}>{installed ? 'Installed' : 'Install ' + fdate(p.installDate)}</Pill></div>
        <StatusLine s={p.summary} />
        <div className="small muted">{p.address}</div>
        <div className="row">
          <a className="btn grow" style={{ justifyContent: 'center' }} href={'tel:+91' + p.phone}><IconPhone size={16} /> Call</a>
          <button className="btn grow" style={{ justifyContent: 'center' }} onClick={() => toast('Mock: open maps for ' + p.city)}><IconMapPin size={16} /> Navigate</button>
        </div>
      </div>

      <h2 className="field-h"><IconChip icon={IconListCheck} tone="green" size="sm" />Checklist</h2>
      <div className="card">
        {CHECKS.map((c) => (
          <label key={c} className="oi" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" className="chk" checked={!!checks[c] || installed} onChange={() => setChecks((x) => ({ ...x, [c]: !x[c] }))} />
            <span className="t" style={{ fontWeight: 450 }}>{c}</span>
          </label>
        ))}
      </div>

      <div className="row" style={{ margin: '16px 2px 8px' }}>
        <h2 className="field-h" style={{ margin: 0 }}><IconChip icon={IconBarcode2} tone="violet" size="sm" />Serial numbers</h2>
        <span className="mono small" style={{ marginLeft: 'auto', color: mods.length >= expected ? 'var(--accent-text)' : 'var(--text-2)' }}>{mods.length}/{expected} modules</span>
      </div>
      <div className="bar" style={{ marginBottom: 10 }}><i style={{ width: Math.min(100, mods.length / expected * 100) + '%' }} /></div>
      <div className="seg" style={{ width: '100%', marginBottom: 10 }}>
        <button className={mode === 'camera' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('camera')}><IconCamera size={15} /> Scan</button>
        <button className={mode === 'manual' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('manual')}><IconKeyboard size={15} /> Type</button>
        <button className={mode === 'excel' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('excel')}><IconFileSpreadsheet size={15} /> Excel</button>
      </div>
      {mode === 'camera' && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="scanner"><div className="frame"><div className="laser" /></div><div className="lbl">{scanning ? 'Reading barcode…' : 'Point at the module label barcode (simulated)'}</div></div>
          <button className="btn primary big-btn" onClick={scan} disabled={scanning || ro}><IconBarcode size={18} /> {scanning ? 'Scanning…' : 'Tap to scan'}</button>
        </div>
      )}
      {mode === 'manual' && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); add(manual); setManual(''); }}>
          <input className="input grow mono" style={{ height: 44 }} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. HM5402712345" autoCapitalize="characters" />
          <button className="btn primary" style={{ height: 44 }} disabled={ro}>Add</button>
        </form>
      )}
      {mode === 'excel' && (
        <div className="drop">
          <IconFileSpreadsheet size={26} />
          <div style={{ margin: '6px 0 10px' }}>Import the supplier packing list (.xlsx) — column “Serial No.”</div>
          <button className="btn primary" onClick={importXls} disabled={ro}>Use sample Packing_List_{p.crn}.xlsx</button>
        </div>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <IconCpu size={16} className="faint" />
        <input className="input grow mono" style={{ height: 40 }} value={inv} onChange={(e) => setInv(e.target.value.toUpperCase())} placeholder="Inverter serial" />
      </div>
      <div className="card serial-list" style={{ marginTop: 10, padding: '0 10px' }}>
        {mods.length === 0 && <Empty icon={IconBarcode2} hint="Scan, type or import the packing list above.">No module serials yet.</Empty>}
        {mods.map((s, i) => (
          <div key={s}><span className="mono faint" style={{ width: 28 }}>{mods.length - i}</span><span className="mono grow">{s}</span><button className="btn sm icon ghost" onClick={() => setMods((m) => m.filter((x) => x !== s))} aria-label="Remove"><IconTrash size={14} /></button></div>
        ))}
      </div>
      <div className="stack" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn primary big-btn" onClick={save} disabled={ro || mods.length === 0}><IconCheck size={18} /> Save {mods.length} serials</button>
        <div className="row">
          <button className="btn big-btn grow" disabled={ro} onClick={photos}><IconPhoto size={17} /> Add site photos</button>
          <button className="btn big-btn grow" disabled={!api.canDo('report_issue') && !api.canDo('edit')} onClick={issue}><IconAlertTriangle size={17} /> Report an issue</button>
        </div>
        {!installed && <button className="btn big-btn" disabled={ro} onClick={async () => { await api.runAction('mark_installed', [p.id]); toast('Marked installed'); }}>Mark installation complete</button>}
      </div>
    </div>
  );
}
