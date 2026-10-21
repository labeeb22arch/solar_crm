import { documentRules } from '../lib/documentRules.js';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { IconDownload, IconCircleCheck, IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useToast } from '../lib/hooks.jsx';
import { PageHead, Empty, BackToDocs } from '../components/ui.jsx';
import { docFileName } from '../lib/docName.js';
import { CustomerPicker } from './Quotes.jsx';
import { createFeasibilityPdf, mapFeasibilityReport, getMissingFeasibilityFields, vendorFrom } from '../docs/feasibility.js';

// Which inputs to show for a missing report field, and the customer field each one saves to.
const INPUTS = {
  consumerNo: { label: 'Consumer No', placeholder: 'DISCOM consumer number' },
  address: { label: 'Full Address', placeholder: 'House, society, town, PIN code' },
  district: { label: 'District', placeholder: 'e.g. Banaskantha' },
  pincode: { label: 'Pincode', placeholder: '6 digits', inputMode: 'numeric' },
  kwp: { label: 'System Capacity (kW)', placeholder: 'e.g. 3', inputMode: 'decimal' },
  portalId: { label: 'PM Surya Ghar Portal / Feasibility No', placeholder: 'From the national portal' },
  janSamarthNo: { label: 'Jan Samarth Application No', placeholder: 'Loan application number' },
  value: { label: 'Total Quotation Amount (₹)', placeholder: 'e.g. 185000', inputMode: 'numeric' },
};
const safe = (v, d) => (v || d).replace(/[^a-zA-Z0-9_-]/g, '_');

export default function Feasibility() {
  const [params, setParams] = useSearchParams();
  const pid = params.get('p');
  const [p] = useData(() => (pid ? api.getProject(pid) : Promise.resolve(null)), [pid]);
  const [assets] = useData(() => api.getCompanyAssets(), []);
  const toast = useToast();
  const [highlight, setHighlight] = useState(false);
  const [draft, setDraft] = useState({});
  const [pdf, setPdf] = useState(null); // { url, blob }
  const [err, setErr] = useState('');
  const canEdit = api.canDo('edit');
  const ok = p && !p.notFound && !p.forbidden;

  const data = useMemo(() => (ok && documentRules(p).loan ? mapFeasibilityReport(p) : null), [p, ok]);
  const missing = useMemo(() => (data ? getMissingFeasibilityFields(data) : []), [data]);
  // Portal ID and Jan Samarth no. can always be edited here, even when already filled in.
  const editable = useMemo(() => {
    const keys = missing.map((m) => m.prop).filter((k) => INPUTS[k]);
    for (const k of ['portalId', 'janSamarthNo']) if (!keys.includes(k)) keys.push(k);
    return keys;
  }, [missing]);

  useEffect(() => { setDraft({}); }, [pid]);
  useEffect(() => {
    setPdf(null); setErr('');
    if (!data || !assets) return undefined;
    let alive = true; let url = null;
    createFeasibilityPdf(data, { stampUrl: assets.stamp, signUrl: assets.sign, highlightMapped: highlight, vendor: vendorFrom(assets) })
      .then((blob) => { if (!alive) return; url = URL.createObjectURL(blob); setPdf({ url, blob }); setErr(''); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not make the PDF'); });
    return () => { alive = false; if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); };
  }, [data, assets, highlight]);

  const dirty = Object.keys(draft).some((k) => String(draft[k] ?? '') !== String(p?.[k] ?? ''));
  const save = async () => {
    try { await api.updateProjectFields(p.id, draft); setDraft({}); toast('Details saved'); } catch (e) { toast(e.message); }
  };
  const download = () => {
    if (!pdf) return;
    const a = document.createElement('a');
    a.href = pdf.url; a.download = docFileName('Feasibility Report', data.consumerName);
    document.body.appendChild(a); a.click(); a.remove();
  };
  const val = (k) => (k in draft ? draft[k] : (k === 'district' ? (p.district || '') : (p[k] ?? '')));
  const missingCompany = assets && [!assets.stamp && 'company stamp', !assets.sign && 'authorised signature', !assets.epc && 'EPC code', !assets.account && 'bank account no.', !assets.ifsc && 'IFSC'].filter(Boolean);

  if (p?.notFound || p?.forbidden) return <div className="page"><PageHead title="Feasibility report"><BackToDocs pid={pid}/></PageHead><Empty>This customer is unavailable to this account.</Empty></div>;
  if (ok && !documentRules(p).loan) return <div className="page"><PageHead title="Feasibility report"><BackToDocs pid={pid}/></PageHead><Empty>This customer is self-funded. A loan feasibility report is not required.</Empty></div>;
  return (
    <div className="page">
      <PageHead title="Feasibility report" sub="The vendor feasibility report for PM Surya Ghar (3 pages), filled in from the customer's details. Fill in anything missing on the left, check the preview, then download the PDF."><BackToDocs pid={pid} /></PageHead>
      <div className="grid2 feas-grid">
        <div className="card card-b stack">
          <CustomerPicker filter={(r) => ['Bank Solar Loan', 'Personal Loan'].includes(r.paymentMethod)} value={pid} onChange={(id) => setParams({ p: id })} />
          {ok && (
            <>
              <div className="feas-missing">
                {missing.length ? (
                  <div className="row small" style={{ color: 'var(--coral)', fontWeight: 600 }}><IconAlertTriangle size={15} /> {missing.length} detail{missing.length === 1 ? '' : 's'} missing on the report</div>
                ) : (
                  <div className="row small" style={{ color: 'var(--ok)', fontWeight: 600 }}><IconCircleCheck size={15} /> All customer details are filled in</div>
                )}
                {missing.length > 0 && <ul className="small muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{missing.map((m) => <li key={m.field}>{m.field}</li>)}</ul>}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {editable.map((k) => (
                  <label key={k} className="stack" style={{ gap: 4 }}>
                    <span className="faint small">{INPUTS[k].label}{missing.some((m) => m.prop === k) ? ' · missing' : ''}</span>
                    <input className="input" value={val(k)} placeholder={INPUTS[k].placeholder} inputMode={INPUTS[k].inputMode} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                  </label>
                ))}
                {canEdit ? <button className="btn" onClick={save} disabled={!dirty}><IconDeviceFloppy size={15} /> Save details</button> : <span className="small faint">Your role can look at the report but not change the details.</span>}
              </div>
              <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" className="chk" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> Highlight filled fields</label>
              <button className="btn primary" style={{ justifyContent: 'center', height: 38 }} onClick={download} disabled={!pdf}><IconDownload size={16} /> Download PDF</button>
            </>
          )}
        </div>
        {ok ? (
          <div className="card feas-preview">
            {err ? <Empty>{err}</Empty> : pdf ? <iframe title="Feasibility report preview" src={pdf.url + '#view=FitH'} /> : <Empty>Making the PDF…</Empty>}
          </div>
        ) : <div className="card"><Empty>Pick a customer to see their feasibility report.</Empty></div>}
      </div>
    </div>
  );
}
