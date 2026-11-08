import SerialScanner from '../components/SerialScanner.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconCamera, IconKeyboard, IconFileSpreadsheet, IconPhone, IconMapPin, IconTrash, IconCheck, IconArrowLeft, IconChevronRight, IconBarcode, IconCpu,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, fdate } from '../lib/hooks.jsx';
import { Pill, Empty, StatusLine, CustName, Avatar, IconChip } from '../components/ui.jsx';
import { IconAlertTriangle, IconPhoto, IconTool, IconCalendarEvent, IconBarcode as IconBarcode2, IconListCheck, IconCalendar, IconLoader2 } from '@tabler/icons-react';
import { t, useLang, LangSwitch } from '../lib/i18n.js';
import '../styles/i18n.css';

// Stable ids so ticked items survive a language change; labels come from t('job.check.<id>').
const CHECKS = ['arrived', 'structure', 'modules', 'dc', 'earthing', 'inverter', 'walkthrough'];

function Loading() {
  return <div className="zero loading" role="status"><IconLoader2 size={20} className="spin" aria-hidden="true" /><div>{t('common.loading')}</div></div>;
}

export default function Field() {
  const lang = useLang();
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
            <span className={'serial-pill' + (j.serialCount >= j.expected ? ' ok' : '')} title={t('field.serialsScanned')}><IconBarcode2 size={13} />{j.serialCount}/{j.expected}</span>
            <IconChevronRight size={16} className="faint" />
          </button>
        ))}
      </div>}
    </>
  );
  return (
    <div className="field" lang={lang}>
      <LangSwitch />
      <div className="field-hero">
        <div className="hello-date">{session.role === 'Technician' ? session.technician : session.role === 'Installation Team' ? api.meta.TEAMS.find((t) => t.id === session.teamId)?.name : t('field.allTeams')} · {new Date(api.meta.TODAY).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        <h1>{t('field.title')}</h1>
        <p>{t('field.intro')}</p>
        <div className="field-stats">
          <span><b>{today.length}</b>{t('field.statToday')}</span><span><b>{upcoming.length}</b>{t('field.statUpcoming')}</span><span><b>{needSerials.length}</b>{t('field.statSerials')}</span>
        </div>
      </div>
      <Section icon={IconTool} tone="orange" title={t(today.length === 1 ? 'field.todayOne' : 'field.todayMany')} list={today} empty={t('field.emptyToday')} />
      <Section icon={IconCalendarEvent} tone="blue" title={t(upcoming.length === 1 ? 'field.upcomingOne' : 'field.upcomingMany')} list={upcoming} empty={t('field.emptyUpcoming')} />
      <Section icon={IconBarcode2} tone="violet" title={t(needSerials.length === 1 ? 'field.serialsOne' : 'field.serialsMany')} list={needSerials} empty={t('field.emptySerials')} />
    </div>
  );
}

function Job({ pid, onBack }) {
  const lang = useLang();
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
  if (!p) return <div className="field" lang={lang}><LangSwitch /><Loading /></div>;
  if (p.forbidden || p.notFound) return <div className="field" lang={lang}><LangSwitch /><button className="btn sm ghost" onClick={onBack}><IconArrowLeft size={15} /> {t('field.title')}</button><Empty hint={t('job.notYoursHint')}>{t('job.notYours')}</Empty></div>;
  const expected = Math.ceil(p.kwp * 1000 / 540);
  const ro = !api.canDo('field');
  const issue = async () => {
    const t = window.prompt(t('job.issuePrompt'));
    if (t && t.trim()) { await api.reportIssue(p.id, t.trim()); toast(t('job.issueSent')); }
  };
  const photos = async () => { await api.addPhotos(p.id, 4); toast(t('job.photosAdded', { count: 4 })); };
  const add = (s) => {
    const v = s.trim().toUpperCase();
    if (!v) return;
    if (mods.includes(v)) { toast(t('job.duplicate', { serial: v })); return; }
    setMods((m) => [v, ...m]);
  };
  const importXls = () => {
    const base = 2800000 + Math.floor(Math.random() * 9000) * 10;
    const list = Array.from({ length: expected }, (_, i) => 'HM540' + (base + i));
    setMods((m) => [...new Set([...list, ...m])]);
    if (!inv) setInv('INV' + (900000 + Math.floor(Math.random() * 9999)));
    toast(t('job.imported', { count: list.length, file: `Packing_List_${p.crn}.xlsx` }));
  };
  const save = async () => { await api.saveSerials(p.id, { modules: mods, inverter: inv }); toast(t('job.saved', { crn: p.crn })); };
  const installed = p.tracks.supply.find((x) => x.key === 'installation').status === 'done';

  return (
    <div className="field" lang={lang}>
      <LangSwitch />
      <button className="btn sm ghost" onClick={onBack} style={{ marginBottom: 8 }}><IconArrowLeft size={15} /> {t('job.back')}</button>
      <div className="card job">
        <div className="row"><Avatar name={p.name} size="lg" /><div className="grow" style={{ minWidth: 0 }}><div style={{ fontSize: 17 }}><CustName id={p.id} name={p.name} crn={p.crn} meta={`${p.kwp} kWp · ${p.discom}`} /></div></div><Pill status={installed ? 'done' : 'in_progress'}>{installed ? t('job.installed') : t('job.installOn', { date: fdate(p.installDate) })}</Pill></div>
        <StatusLine s={p.summary} />
        <div className="small muted">{p.address}</div>
        <div className="row">
          <a className="btn grow" style={{ justifyContent: 'center' }} href={'tel:+91' + p.phone}><IconPhone size={16} /> {t('job.call')}</a>
          <button className="btn grow" style={{ justifyContent: 'center' }} onClick={() => toast(t('job.mapsMock', { city: p.city }))}><IconMapPin size={16} /> {t('job.navigate')}</button>
        </div>
      </div>

      <h2 className="field-h"><IconChip icon={IconListCheck} tone="green" size="sm" />{t('job.checklist')}</h2>
      <div className="card">
        {CHECKS.map((c) => (
          <label key={c} className="oi" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" className="chk" checked={!!checks[c] || installed} onChange={() => setChecks((x) => ({ ...x, [c]: !x[c] }))} />
            <span className="t" style={{ fontWeight: 450 }}>{t('job.check.' + c)}</span>
          </label>
        ))}
      </div>

      <div className="row" style={{ margin: '16px 2px 8px' }}>
        <h2 className="field-h" style={{ margin: 0 }}><IconChip icon={IconBarcode2} tone="violet" size="sm" />{t('job.serials')}</h2>
        <span className="mono small" style={{ marginLeft: 'auto', color: mods.length >= expected ? 'var(--accent-text)' : 'var(--text-2)' }}>{t('job.modulesCount', { count: mods.length, expected })}</span>
      </div>
      <div className="bar" style={{ marginBottom: 10 }}><i style={{ width: Math.min(100, mods.length / expected * 100) + '%' }} /></div>
      <div className="seg" style={{ width: '100%', marginBottom: 10 }}>
        <button className={mode === 'camera' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('camera')}><IconCamera size={15} /> {t('job.modeScan')}</button>
        <button className={mode === 'manual' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('manual')}><IconKeyboard size={15} /> {t('job.modeType')}</button>
        <button className={mode === 'excel' ? 'on' : ''} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('excel')}><IconFileSpreadsheet size={15} /> {t('job.modeExcel')}</button>
      </div>
      {mode==='camera'&&<SerialScanner disabled={ro} onSerial={(serial,target)=>target==='inverter'?setInv(serial.trim().toUpperCase()):add(serial)}/>}
      {mode === 'manual' && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); add(manual); setManual(''); }}>
          <input className="input grow mono" style={{ height: 44 }} value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t('job.serialPlaceholder', { example: 'HM5402712345' })} autoCapitalize="characters" />
          <button className="btn primary" style={{ height: 44 }} disabled={ro}>{t('job.add')}</button>
        </form>
      )}
      {mode === 'excel' && (
        <div className="drop">
          <IconFileSpreadsheet size={26} />
          <div style={{ margin: '6px 0 10px' }}>{t('job.importHelp')}</div>
          <button className="btn primary" onClick={importXls} disabled={ro}>{t('job.useSample', { file: `Packing_List_${p.crn}.xlsx` })}</button>
        </div>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <IconCpu size={16} className="faint" />
        <input className="input grow mono" style={{ height: 40 }} value={inv} onChange={(e) => setInv(e.target.value.toUpperCase())} placeholder={t('job.inverterSerial')} />
      </div>
      <div className="card serial-list" style={{ marginTop: 10, padding: '0 10px' }}>
        {mods.length === 0 && <Empty icon={IconBarcode2} hint={t('job.noSerialsHint')}>{t('job.noSerials')}</Empty>}
        {mods.map((s, i) => (
          <div key={s}><span className="mono faint" style={{ width: 28 }}>{mods.length - i}</span><span className="mono grow">{s}</span><button className="btn sm icon ghost" onClick={() => setMods((m) => m.filter((x) => x !== s))} aria-label={t('job.remove')}><IconTrash size={14} /></button></div>
        ))}
      </div>
      <div className="stack" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn primary big-btn" onClick={save} disabled={ro || mods.length === 0}><IconCheck size={18} /> {t('job.save', { count: mods.length })}</button>
        <div className="row">
          <button className="btn big-btn grow" disabled={ro} onClick={photos}><IconPhoto size={17} /> {t('job.photos')}</button>
          <button className="btn big-btn grow" disabled={!api.canDo('report_issue') && !api.canDo('edit')} onClick={issue}><IconAlertTriangle size={17} /> {t('job.issue')}</button>
        </div>
        {!installed && <button className="btn big-btn" disabled={ro} onClick={async () => { await api.runAction('mark_installed', [p.id]); toast(t('job.markedInstalled')); }}>{t('job.markInstalled')}</button>}
      </div>
    </div>
  );
}
