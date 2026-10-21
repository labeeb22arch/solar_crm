import { ManagedInput, ManagedSelect } from '../components/ManagedOptions.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconSend, IconRefresh, IconCircleCheck, IconClock } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useToast, inr, fdate, fdateY } from '../lib/hooks.jsx';
import { PageHead, Empty } from '../components/ui.jsx';
import { CustomerPicker } from './Quotes.jsx';
import { SignLinkDialog } from '../components/SignLink.jsx';
import { ProposalViewer } from '../docs/proposal/ProposalViewer.jsx';
import { computeProposal, subsidyFor, isLoanMethod } from '../docs/proposal/calc.js';
import { proposalInputs, packagePrice, withLoanDefaults, proposalNumber, PACKAGE_SIZES } from '../docs/proposal/settings.js';

const numIn = (v) => (v === '' ? '' : Number(v));
function F({ label, children, hint }) {
  return <label className="stack" style={{ gap: 4 }}><span className="faint small">{label}{hint && <span className="pb-auto"> · {hint}</span>}</span>{children}</label>;
}

/** Residential on-grid proposal: inputs on the left, live A4 pages on the right, then send it for acceptance. */
export default function Proposal() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const pid = params.get('p');
  const [p] = useData(() => (pid ? api.getProject(pid) : Promise.resolve(null)), [pid]);
  const [settings] = useData(() => api.getProposalSettings(), []);
  const [assets] = useData(() => api.getCompanyAssets(), []);
  const [inp, setInp] = useState(null);
  const [forId, setForId] = useState(null);
  const [view, setView] = useState('draft');
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const ok = p && !p.notFound && !p.forbidden;

  // Start from the last sent version if there is one, otherwise from the customer's record and the settings.
  useEffect(() => {
    if (!ok || !settings || forId === p.id) return;
    setInp(p.proposal?.inputs ? JSON.parse(JSON.stringify(p.proposal.inputs)) : proposalInputs(p, settings));
    setForId(p.id);
    setView(p.proposal?.accepted ? 'sent' : 'draft');
  }, [ok, p, settings, forId]);

  const model = useMemo(() => (inp ? computeProposal(inp) : null), [inp]);
  if (!pid) {
    return (
      <div className="page">
        <PageHead title="Residential proposal" sub="Pick a customer to build their multi-page solar proposal and send it for acceptance." />
        <div className="docs-layout"><div className="card" style={{ padding: 12 }}><CustomerPicker value={pid} onChange={(id) => setParams({ p: id })} /></div><div className="card"><Empty hint="Search by name, CRN or city on the left.">Pick a customer.</Empty></div></div>
      </div>
    );
  }
  if (!p || !settings) return <div className="page"><div className="card faint small" style={{ padding: 16 }}>Loading…</div></div>;
  if (!ok) return <div className="page"><div className="card"><Empty>This customer is not in your list.</Empty></div></div>;
  if (!inp || forId !== p.id) return <div className="page" />;

  const set = (patch) => setInp((x) => ({ ...x, ...patch }));
  const setKwp = (kwp) => setInp((x) => withLoanDefaults({ ...x, kwp, price: packagePrice(settings, kwp), subsidy: x.subsidyAuto ? subsidyFor(kwp) : x.subsidy }, settings));
  const setPrice = (price) => setInp((x) => withLoanDefaults({ ...x, price }, settings));
  const setMethod = (paymentMethod) => setInp((x) => withLoanDefaults({ ...x, paymentMethod }, settings));
  const reset = () => { setInp(proposalInputs(p, settings)); toast('Started again from the customer record and current settings'); };
  const send = async () => {
    setBusy(true);
    try { const l = await api.sendProposal(p.id, inp); setLink(l); setView('sent'); toast(`Proposal v${l.version} saved`); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const st = api.proposalStatus(p);
  const sent = p.proposal;
  const nextVersion = (sent?.version || 0) + 1;
  const showSent = view === 'sent' && sent;
  const snap = showSent ? sent : { inputs: inp, number: proposalNumber(p.crn, nextVersion), createdAt: new Date().toISOString() };
  const loan = isLoanMethod(inp.paymentMethod);
  const canSend = api.canDo('edit');

  return (
    <div className="page">
      <PageHead title="Residential proposal" sub="On-grid rooftop solar proposal for a home. Check the inputs, look through the pages, then send it to the customer to accept on their phone." />
      <div className="pb-layout">
        <div className="card card-b pb-form">
          <CustomerPicker value={pid} onChange={(id) => setParams({ p: id })} />
          <div className="row small" style={{ flexWrap: 'wrap', gap: 6 }}>
            <b className="grow ell">{p.name}</b>
            <span className="faint">{p.city} · {p.type}</span>
          </div>
          {p.type !== 'Residential' && <div className="small" style={{ color: 'var(--coral)' }}>This customer is {p.type}. This proposal is for homes (with PM Surya Ghar subsidy).</div>}
          <div className={'doc-status ' + (st.state === 'accepted' ? 'done' : st.state === 'none' ? 'todo' : 'wait')}>
            {st.state === 'accepted' ? <IconCircleCheck size={15} /> : <IconClock size={15} />}
            <span>{st.state === 'none' ? 'Not sent yet' : st.state === 'accepted' ? `v${st.version} accepted on ${fdateY(st.at)}` : st.state === 'expired' ? `v${st.version} sent ${fdate(st.at)} · link expired` : `v${st.version} sent ${fdate(st.at)}, waiting for the customer`}</span>
          </div>

          <div className="pb-sec">System</div>
          <div className="grid2">
            <F label="System size"><select className="select" value={inp.kwp} onChange={(e) => setKwp(Number(e.target.value))}>{PACKAGE_SIZES.map((k) => <option key={k} value={k}>{k} kWp</option>)}</select></F>
            <F label="Module wattage"><input className="input num" type="number" step="5" value={inp.moduleWp} onChange={(e) => set({ moduleWp: numIn(e.target.value) })} /></F>
          </div>
          <F label="Modules" hint={`${model.modules.qty} × ${model.modules.wp} Wp`}><ManagedInput category="panel_brands" className="input" value={inp.moduleMake} onChange={(e) => set({ moduleMake: e.target.value })} /></F>
          <F label="Module type"><ManagedInput category="panel_models" className="input" value={inp.moduleModel} onChange={(e) => set({ moduleModel: e.target.value })} /></F>
          <F label="Inverter make"><ManagedInput category="inverter_brands" className="input" value={inp.inverterMake} onChange={(e) => set({ inverterMake: e.target.value })} /></F>

          <div className="pb-sec">Electricity use</div>
          <div className="seg" role="group" aria-label="Enter units or bill">
            <button className={inp.consumptionMode === 'units' ? 'on' : ''} onClick={() => set({ consumptionMode: 'units' })}>Units a month</button>
            <button className={inp.consumptionMode === 'bill' ? 'on' : ''} onClick={() => set({ consumptionMode: 'bill' })}>Average bill</button>
          </div>
          {inp.consumptionMode === 'units'
            ? <F label="Units used per month" hint={`about ${inr(Number(inp.monthlyUnits || 0) * inp.tariff)} a month`}><input className="input num" type="number" min="0" value={inp.monthlyUnits} onChange={(e) => set({ monthlyUnits: numIn(e.target.value) })} /></F>
            : <F label="Average monthly bill (₹)" hint={`≈ ${Math.round(model.consumptionMonthly)} units at ₹${inp.tariff}`}><input className="input num" type="number" min="0" value={inp.monthlyBill} onChange={(e) => set({ monthlyBill: numIn(e.target.value) })} /></F>}

          <div className="pb-sec">Price</div>
          <div className="grid2">
            <F label="Price incl. GST (₹)" hint={inp.price === packagePrice(settings, inp.kwp) ? 'package' : 'edited'}><input className="input num" type="number" min="0" step="100" value={inp.price} onChange={(e) => setPrice(numIn(e.target.value))} /></F>
            <F label="Subsidy (₹)" hint={inp.subsidyAuto ? 'auto' : <button className="btn sm ghost" style={{ height: 18, padding: '0 4px' }} onClick={(e) => { e.preventDefault(); set({ subsidyAuto: true, subsidy: subsidyFor(inp.kwp) }); }}>auto</button>}>
              <input className="input num" type="number" min="0" step="1000" value={inp.subsidy} onChange={(e) => set({ subsidy: numIn(e.target.value), subsidyAuto: false })} />
            </F>
          </div>
          <div className="small faint">Effective cost {inr(model.effectiveCost)} · savings year 1 {inr(model.year1.savings)} · payback {model.payback === null ? '—' : `${model.payback} yrs`}</div>

          <div className="pb-sec">Payment</div>
          <F label="Payment method"><ManagedSelect category="payment_methods" className="select" value={inp.paymentMethod} onChange={(e) => setMethod(e.target.value)}/></F>
          {loan && (
            <>
              <F label="Loan bank"><ManagedSelect category="banks" placeholder="Choose bank" className="select" value={inp.bank||''} onChange={(e)=>set({bank:e.target.value})}/></F>
              <div className="grid2">
                <F label="Down payment (₹)"><input className="input num" type="number" min="0" step="1000" value={inp.downPayment} onChange={(e) => set({ downPayment: numIn(e.target.value) })} /></F>
                <F label="Loan amount (₹)"><input className="input num" type="number" min="0" step="1000" value={inp.loanAmount} onChange={(e) => set({ loanAmount: numIn(e.target.value) })} /></F>
                <F label="Interest (% a year)"><input className="input num" type="number" min="0" step="0.05" value={inp.loanRatePct} onChange={(e) => set({ loanRatePct: numIn(e.target.value) })} /></F>
                <F label="Tenure (years)"><input className="input num" type="number" min="1" step="1" value={inp.loanTenureYears} onChange={(e) => set({ loanTenureYears: numIn(e.target.value) })} /></F>
              </div>
              <div className="small faint">EMI {inr(model.loan.emi)} vs savings {inr(model.loan.monthlySavings1)} a month → {model.loan.netMonthly1 >= 0 ? 'gain' : 'extra'} {inr(Math.abs(model.loan.netMonthly1))}</div>
            </>
          )}
          <div className="small faint">Tariff ₹{inp.tariff}/unit (+{inp.escalationPct}%/yr), export ₹{inp.exportRate}/unit, {inp.unitsPerKwMonth} units/kW/month, {inp.degradationPct}% degradation, {inp.years} years, valid {inp.validityDays} days.</div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {canSend && <button className="btn primary" style={{ height: 38 }} onClick={send} disabled={busy || !(inp.price > 0)}><IconSend size={16} /> {busy ? 'Sending…' : `Send for acceptance (v${nextVersion})`}</button>}
            <button className="btn" onClick={reset} title="Start again from the customer record and the current settings"><IconRefresh size={15} /> Reset</button>
          </div>
          {!canSend && <div className="small faint">Your role can look at proposals but not send them.</div>}
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {sent && (
            <div className="seg" role="group" aria-label="Which version">
              <button className={view === 'draft' ? 'on' : ''} onClick={() => setView('draft')}>Draft (v{nextVersion})</button>
              <button className={view === 'sent' ? 'on' : ''} onClick={() => setView('sent')}>Sent v{sent.version}{sent.accepted ? ' · accepted' : ''}</button>
            </div>
          )}
          <ProposalViewer key={showSent ? 'sent' + sent.version : 'draft'} snap={snap} accepted={showSent ? sent.accepted : null} assets={assets} title={`${snap.number}${showSent ? '' : ' (draft)'}`} />
        </div>
      </div>
      {link && <SignLinkDialog link={link} onClose={() => setLink(null)} />}
    </div>
  );
}
