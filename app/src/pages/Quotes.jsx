import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconBrandWhatsapp, IconDownload, IconSun } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, inr, fdateY } from '../lib/hooks.jsx';
import { PageHead, Pill, Empty, DocBrand, BackToDocs } from '../components/ui.jsx';
import { docFileName } from '../lib/docName.js';
import { downloadElementAsPdf } from '../lib/pdfFromElement.js';

export function CustomerPicker({ value, onChange, filter }) {
  const session = useSession();
  const [list] = useData(() => api.pickList(), [session.role, session.branch]);
  const [q, setQ] = useState('');
  const rows = (list || []).filter((r) => (!filter || filter(r)) && (!q || (r.name + r.crn + r.city).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="stack" style={{ gap: 6 }}>
      <input className="input" placeholder="Find customer…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="select" value={value || ''} onChange={(e) => onChange(e.target.value)} size={6} style={{ height: 150, padding: 4 }}>
        {rows.slice(0, 200).map((r) => <option key={r.id} value={r.id}>{r.crn.slice(-4)} · {r.name} · {r.kwp} kWp{r.q ? ' · quote ' + r.q.replace('_', ' ') : ''}</option>)}
      </select>
    </div>
  );
}

const MODULES = { mono: { name: 'Mono PERC 540 Wp', wp: 540, add: 0 }, topcon: { name: 'TOPCon bifacial 550 Wp', wp: 550, add: 2500 } };
const INVERTERS = ['Invicta On-grid (5 yr warranty)', 'Invicta Hybrid-ready (8 yr warranty)'];

function subsidyFor(kwp, type) {
  if (type !== 'Residential') return 0;
  return Math.min(78000, Math.min(kwp, 2) * 30000 + (kwp > 2 ? Math.min(kwp - 2, 1) * 18000 : 0));
}

export default function Quotes() {
  const [params, setParams] = useSearchParams();
  const pid = params.get('p');
  const [p] = useData(() => (pid ? api.getProject(pid) : Promise.resolve(null)), [pid]);
  const session = useSession();
  const toast = useToast();
  const [cfg, setCfg] = useState(null);
  const [customerView, setCustomerView] = useState('leads');
  useEffect(() => {
    if (p) setCfg({ kwp: p.kwp, module: 'mono', inverter: INVERTERS[0], structure: p.type !== 'Residential' ? 'RCC flush mount' : 'GI elevated (6 ft)', rate: Math.round(p.value / p.kwp / 500) * 500, discount: 0, validity: 15 });
  }, [p?.id]); // eslint-disable-line

  const calc = useMemo(() => {
    if (!p || !cfg) return null;
    const m = MODULES[cfg.module];
    const nMod = Math.ceil(cfg.kwp * 1000 / m.wp);
    const base = cfg.kwp * (cfg.rate + m.add);
    const net = base - cfg.discount;
    const gst = Math.round(net * 0.089);
    const total = net + gst;
    const sub = subsidyFor(cfg.kwp, p.type);
    const gen = Math.round(cfg.kwp * 1550);
    return { nMod, base, net, gst, total, sub, effective: total - sub, gen, save: Math.round(gen * 7.2) };
  }, [p, cfg]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const send = async () => { const v = await api.sendQuotation(p.id, { kwp: cfg.kwp, total: calc.total }); toast(`Quotation v${v} sent on WhatsApp to ${p.phone} (mock)`); };

  return (
    <div className="page">
      <PageHead title="Quotation maker" sub="Pick a customer, set the system, check the preview, then send it on WhatsApp so the customer can approve with one tap."><BackToDocs pid={pid} /></PageHead>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card card-b stack">
          <select className="select" aria-label="Quotation customer list" value={customerView} onChange={(e) => setCustomerView(e.target.value)}><option value="leads">Leads · before registration</option><option value="history">Existing quotations</option></select><CustomerPicker value={pid} filter={(r) => customerView === 'leads' ? r.stage === 'leads' && !r.portalId : !!r.q} onChange={(id) => setParams({ p: id })} />
          {p && cfg && (
            <>
              <div className="row small"><span className="grow ell" style={{ fontWeight: 600 }}>{p.name}</span>{p.quotation && <Pill status={p.quotation.status === 'approved' ? 'done' : p.quotation.status === 'changes_requested' ? 'blocked' : 'waiting_customer'}>{p.quotation.status.replace('_', ' ')} · v{p.quotation.version}</Pill>}</div>
              <label className="stack" style={{ gap: 4 }}><span className="faint small">Capacity (kWp)</span><input className="input num" type="number" step="0.1" value={cfg.kwp} onChange={(e) => set('kwp', +e.target.value || 0)} /></label>
              <label className="stack" style={{ gap: 4 }}><span className="faint small">Modules</span><select className="select" value={cfg.module} onChange={(e) => set('module', e.target.value)}>{Object.entries(MODULES).map(([k, m]) => <option key={k} value={k}>{m.name}</option>)}</select></label>
              <label className="stack" style={{ gap: 4 }}><span className="faint small">Inverter</span><select className="select" value={cfg.inverter} onChange={(e) => set('inverter', e.target.value)}>{INVERTERS.map((i) => <option key={i}>{i}</option>)}</select></label>
              <label className="stack" style={{ gap: 4 }}><span className="faint small">Structure</span><select className="select" value={cfg.structure} onChange={(e) => set('structure', e.target.value)}>{['GI elevated (6 ft)', 'GI elevated (9 ft)', 'RCC flush mount', 'Tin-shed mini rail'].map((i) => <option key={i}>{i}</option>)}</select></label>
              <div className="grid2" style={{ gap: 8 }}>
                <label className="stack" style={{ gap: 4 }}><span className="faint small">Rate ₹/kWp</span><input className="input num" type="number" step="500" value={cfg.rate} onChange={(e) => set('rate', +e.target.value || 0)} /></label>
                <label className="stack" style={{ gap: 4 }}><span className="faint small">Discount ₹</span><input className="input num" type="number" step="500" value={cfg.discount} onChange={(e) => set('discount', +e.target.value || 0)} /></label>
              </div>
              <button className="btn primary" style={{ height: 38, justifyContent: 'center' }} onClick={send} disabled={!api.canDo('quote')}><IconBrandWhatsapp size={17} /> Send on WhatsApp for approval</button>
              <button className="btn" style={{ justifyContent: 'center' }} onClick={async () => { const el = document.querySelector('.doc-preview'); if (!el) return; try { await downloadElementAsPdf(el, docFileName('Quotation', p.name)); toast('Quotation downloaded — upload it to the customer\'s Drive folder, then add the link in Documents'); } catch (e) { toast('Could not make the PDF: ' + e.message); } }}><IconDownload size={15} /> Download PDF</button>
            </>
          )}
        </div>
        {p && calc ? (
          <div className="doc-preview">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <DocBrand sub={`Rooftop solar · ${p.branch}`} />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}><h2>Quotation</h2><div className="mono" style={{ fontSize: 12, color: '#6b7280' }}>Q-{p.crn.slice(4)} · v{(p.quotation?.version || 0) + (p.quotation?.status === 'approved' ? 0 : 1)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{fdateY(new Date().toISOString())} · valid {cfg.validity} days</div></div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
              <div><div style={{ color: '#6b7280' }}>Prepared for</div><b>{p.name}</b><div>{p.city} · {p.discom} consumer</div><div className="mono">{p.phone}</div></div>
              <div><div style={{ color: '#6b7280' }}>System</div><b>{cfg.kwp} kWp on-grid {p.type.toLowerCase()}</b><div>Est. generation <span className="mono">{calc.gen.toLocaleString('en-IN')}</span> kWh/yr</div><div>Est. saving <span className="mono">{inr(calc.save)}</span>/yr</div></div>
            </div>
            <table>
              <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
              <tbody>
                <tr><td>{MODULES[cfg.module].name}</td><td className="r mono">{calc.nMod}</td><td className="r mono" rowSpan={1}>{inr(calc.base * 0.58)}</td></tr>
                <tr><td>{cfg.inverter}</td><td className="r mono">1</td><td className="r mono">{inr(calc.base * 0.17)}</td></tr>
                <tr><td>{cfg.structure} structure</td><td className="r mono">{Math.ceil(cfg.kwp)} kit</td><td className="r mono">{inr(calc.base * 0.12)}</td></tr>
                <tr><td>BOS: cables, ACDB/DCDB, earthing, LA</td><td className="r mono">1 lot</td><td className="r mono">{inr(calc.base * 0.08)}</td></tr>
                <tr><td>Installation, DISCOM liaison, net-meter paperwork</td><td className="r mono">1</td><td className="r mono">{inr(calc.base * 0.05)}</td></tr>
                {cfg.discount > 0 && <tr><td>Discount</td><td /><td className="r mono">−{inr(cfg.discount)}</td></tr>}
                <tr><td>GST (blended 8.9%)</td><td /><td className="r mono">{inr(calc.gst)}</td></tr>
                <tr><td><b>Total payable</b></td><td /><td className="r mono"><b>{inr(calc.total)}</b></td></tr>
                {calc.sub > 0 && <tr><td style={{ color: '#4a6a00' }}>Central subsidy (est., credited to customer bank)</td><td /><td className="r mono" style={{ color: '#4a6a00' }}>−{inr(calc.sub)}</td></tr>}
                {calc.sub > 0 && <tr><td><b>Effective cost</b></td><td /><td className="r mono"><b>{inr(calc.effective)}</b></td></tr>}
              </tbody>
            </table>
            <div style={{ marginTop: 16, fontSize: 11.5, color: '#6b7280', lineHeight: 1.6 }}>
              Payment: {p.paymentMethod}. Warranty: modules 25 yr performance, inverter 5–8 yr, workmanship 5 yr. Subsidy depends on DISCOM approval and requires the DISCOM consumer name to match the bank account name.
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#6b7280' }}><IconSun size={15} /> Customer approves with one tap on WhatsApp — no signature needed at this step.</div>
          </div>
        ) : <div className="card"><Empty>Pick a customer to build a quotation.</Empty></div>}
      </div>
    </div>
  );
}
