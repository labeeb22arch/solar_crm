import { useEffect, useState } from 'react';
import { IconDeviceFloppy, IconPlus, IconTrash, IconRestore } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useToast, inr, fdateY } from '../lib/hooks.jsx';
import { PageHead } from '../components/ui.jsx';
import { SubNav } from './Ops.jsx';
import { subsidyFor } from '../docs/proposal/calc.js';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '../docs/proposal/settings.js';

function Num({ label, value, onChange, step = 'any', suffix }) {
  return (
    <label className="stack" style={{ gap: 4 }}>
      <span className="faint small">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input className="input num" type="number" step={step} min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
    </label>
  );
}
function Text({ label, value, onChange }) {
  return <label className="stack" style={{ gap: 4 }}><span className="faint small">{label}</span><input className="input" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

/** Admin: the numbers and wording every residential proposal starts from. */
export default function ProposalSettings() {
  const [saved] = useData(() => api.getProposalSettings(), []);
  const toast = useToast();
  const [f, setF] = useState(null);
  useEffect(() => { if (saved && !f) setF(pick(saved)); }, [saved]); // eslint-disable-line
  if (!saved || !f) return <div className="page" />;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(pick(saved));
  const pctTotal = f.milestones.reduce((t, m) => t + (Number(m.pct) || 0), 0);
  const save = async () => {
    try { const s = await api.saveProposalSettings(f); setF(pick(s)); toast('Proposal settings saved'); } catch (e) { toast(e.message); }
  };
  const setPkg = (kwp, price) => set('packages', f.packages.map((p) => (p.kwp === kwp ? { ...p, price } : p)));
  const setMs = (i, k, v) => set('milestones', f.milestones.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  return (
    <div className="page">
      <PageHead title="Proposal settings" sub="Prices, equipment, warranties, savings assumptions, loan defaults, payment milestones and terms used by every residential proposal. Only Admin can change them." />
      <SubNav parent="team" />
      <div className="ps-grid">
        <div className="card">
          <div className="card-h">Residential packages<span className="muted small">price incl. GST · subsidy is worked out by the PM Surya Ghar rule</span></div>
          <div className="card-b">
            <table className="tbl ps-pkg">
              <thead><tr><th>System</th><th>Price incl. GST (₹)</th><th className="r">Subsidy</th><th className="r">Effective</th><th className="r">Units / month</th></tr></thead>
              <tbody>{f.packages.map((p) => (
                <tr key={p.kwp}>
                  <td><b>{p.kwp} kW</b></td>
                  <td><input className="input num" type="number" min="0" step="100" value={p.price} onChange={(e) => setPkg(p.kwp, e.target.value === '' ? '' : Number(e.target.value))} aria-label={`Price for ${p.kwp} kW`} /></td>
                  <td className="r mono">{inr(subsidyFor(p.kwp))}</td>
                  <td className="r mono">{inr(Math.max(0, (Number(p.price) || 0) - subsidyFor(p.kwp)))}</td>
                  <td className="r mono">{Math.round(p.kwp * (Number(f.unitsPerKwMonth) || 0))}</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="small faint" style={{ margin: '8px 0 0' }}>Subsidy: ₹30,000 per kW for the first 2 kW, ₹18,000 for the 3rd kW, at most ₹78,000.</p>
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-h">Equipment</div>
            <div className="card-b ps-fields">
              <Text label="Module make(s)" value={f.moduleMake} onChange={(v) => set('moduleMake', v)} />
              <Text label="Module model / type" value={f.moduleModel} onChange={(v) => set('moduleModel', v)} />
              <Num label="Module wattage" suffix="Wp" value={f.moduleWp} onChange={(v) => set('moduleWp', v)} step="5" />
              <Text label="Inverter make(s)" value={f.inverterMake} onChange={(v) => set('inverterMake', v)} />
              <Text label="Structure type" value={f.structure} onChange={(v) => set('structure', v)} />
              <Num label="Expected units per kW per month" value={f.unitsPerKwMonth} onChange={(v) => set('unitsPerKwMonth', v)} />
            </div>
          </div>
          <div className="card">
            <div className="card-h">Warranties<span className="muted small">years</span></div>
            <div className="card-b ps-fields">
              <Num label="Module performance" value={f.warrantyModulePerf} onChange={(v) => set('warrantyModulePerf', v)} step="1" />
              <Num label="Module product" value={f.warrantyModuleProduct} onChange={(v) => set('warrantyModuleProduct', v)} step="1" />
              <Num label="Inverter" value={f.warrantyInverter} onChange={(v) => set('warrantyInverter', v)} step="1" />
              <Num label="Structure" value={f.warrantyStructure} onChange={(v) => set('warrantyStructure', v)} step="1" />
              <Num label="Workmanship (Solar CRM)" value={f.warrantyWorkmanship} onChange={(v) => set('warrantyWorkmanship', v)} step="1" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">Savings assumptions &amp; GST</div>
          <div className="card-b ps-fields">
            <Num label="Electricity tariff" suffix="₹/unit" value={f.tariff} onChange={(v) => set('tariff', v)} step="0.05" />
            <Num label="Tariff increase per year" suffix="%" value={f.escalationPct} onChange={(v) => set('escalationPct', v)} step="0.5" />
            <Num label="Net-metering export rate" suffix="₹/unit" value={f.exportRate} onChange={(v) => set('exportRate', v)} step="0.05" />
            <Num label="Module degradation per year" suffix="%" value={f.degradationPct} onChange={(v) => set('degradationPct', v)} step="0.1" />
            <Num label="Analysis period" suffix="years" value={f.years} onChange={(v) => set('years', v)} step="1" />
            <Num label="GST rate in the price" suffix="%" value={f.gstRate} onChange={(v) => set('gstRate', v)} step="0.1" />
            <label className="stack ps-wide" style={{ gap: 4 }}><span className="faint small">GST note (printed under the price)</span><input className="input" value={f.gstNote} onChange={(e) => set('gstNote', e.target.value)} /></label>
          </div>
        </div>

        <div className="card">
          <div className="card-h">Loan defaults<span className="muted small">for Bank Solar Loan and Personal Loan customers</span></div>
          <div className="card-b ps-fields">
            <Num label="Interest rate" suffix="% a year" value={f.loanRatePct} onChange={(v) => set('loanRatePct', v)} step="0.05" />
            <Num label="Tenure" suffix="years" value={f.loanTenureYears} onChange={(v) => set('loanTenureYears', v)} step="1" />
            <Num label="Down payment" suffix="% of price" value={f.downPaymentPct} onChange={(v) => set('downPaymentPct', v)} step="1" />
            <Num label="Proposal valid for" suffix="days" value={f.validityDays} onChange={(v) => set('validityDays', v)} step="1" />
          </div>
        </div>

        <div className="card ps-span">
          <div className="card-h">Payment milestones<span className={'small ' + (Math.abs(pctTotal - 100) < 0.01 ? 'muted' : '')} style={Math.abs(pctTotal - 100) < 0.01 ? null : { color: 'var(--coral)' }}>total {pctTotal}%{Math.abs(pctTotal - 100) < 0.01 ? '' : ' — should be 100%'}</span></div>
          <div className="card-b stack" style={{ gap: 8 }}>
            {f.milestones.map((m, i) => (
              <div key={i} className="ps-ms">
                <input className="input" value={m.label} onChange={(e) => setMs(i, 'label', e.target.value)} placeholder="Milestone" aria-label="Milestone name" />
                <input className="input num" type="number" min="0" max="100" value={m.pct} onChange={(e) => setMs(i, 'pct', e.target.value === '' ? '' : Number(e.target.value))} aria-label="Percent" />
                <input className="input" value={m.note} onChange={(e) => setMs(i, 'note', e.target.value)} placeholder="When it is due" aria-label="When it is due" />
                <button className="btn ghost icon" onClick={() => set('milestones', f.milestones.filter((_, j) => j !== i))} aria-label="Remove milestone"><IconTrash size={15} /></button>
              </div>
            ))}
            <div><button className="btn sm" onClick={() => set('milestones', [...f.milestones, { label: '', pct: 0, note: '' }])}><IconPlus size={14} /> Add milestone</button></div>
          </div>
        </div>

        <div className="card ps-span">
          <div className="card-h">Terms &amp; conditions<span className="muted small">one term per line; "Heading: text" prints the heading in bold; {'{validity}'} becomes the validity days</span>
            <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => set('terms', DEFAULT_SETTINGS.terms)}><IconRestore size={14} /> Reset to default</button></div>
          <div className="card-b"><textarea className="input" rows={11} value={f.terms} onChange={(e) => set('terms', e.target.value)} aria-label="Terms and conditions" style={{ width: '100%', fontSize: 13, lineHeight: 1.5 }} /></div>
        </div>
      </div>
      <div className="ps-save">
        <button className="btn primary" onClick={save} disabled={!dirty && !saved.placeholder}><IconDeviceFloppy size={15} /> Save settings</button>
        {saved.savedAt ? <span className="small faint">Last saved {fdateY(saved.savedAt)}{saved.savedBy ? ` by ${saved.savedBy}` : ''}</span> : <span className="small faint">Not saved yet</span>}
      </div>
    </div>
  );
}

const pick = (s) => Object.fromEntries(SETTING_KEYS.map((k) => [k, JSON.parse(JSON.stringify(s[k]))]));
