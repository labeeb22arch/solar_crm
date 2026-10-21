// The A4 pages of the residential on-grid proposal. Rendered from one snapshot (inputs + number/date), so the
// builder preview, the PDF and the customer's public page are always the same document.
// Page order follows the Toolbox residential proposal: cover, overview, how it works, BOM & warranty,
// commercial offer, savings, terms — with generation, EMI (loan customers only) and acceptance pages added.
import { computeProposal, isLoanMethod } from './calc.js';
import { COMPANY } from '../../data/seed.js';
import './proposal.css';

const inr = (v) => (Number.isFinite(v) ? (v < 0 ? '−₹' : '₹') + Math.round(Math.abs(v)).toLocaleString('en-IN') : '—');
const num = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const pct = (v, d = 1) => (Number.isFinite(v) ? `${v.toFixed(d)}%` : '—');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const addDays = (iso, days) => new Date(new Date(iso).getTime() + days * 86400000).toISOString();
const showGstin = COMPANY.gstin && !/demo|X{3}/i.test(COMPANY.gstin);

function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="7" fill="#EE7A2B" />
      <g stroke="#F2A03A" strokeWidth="2.6" strokeLinecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" /></g>
    </svg>
  );
}

function Page({ id, title, sub, no, total, number, children, cover }) {
  return (
    <section className={'pp-page' + (cover ? ' pp-cover' : '')} id={id} data-page={no}>
      {!cover && (
        <header className="pp-head">
          <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
          <div className="pp-head-brand"><Mark size={30} /><span>{COMPANY.name}</span></div>
        </header>
      )}
      <div className="pp-body">{children}</div>
      <footer className="pp-foot"><span>{COMPANY.name}</span><span>{number}</span><span>Page {no} of {total}</span></footer>
    </section>
  );
}

const KV = ({ rows }) => (
  <table className="pp-kv"><tbody>{rows.filter(Boolean).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
);

/** The BOM rows: makes and quantities only, no per-line prices (Toolbox on-grid defaults; modules sized from kWp). */
export function bomRows(inp, m) {
  return [
    { item: `Solar PV Module (${inp.moduleModel}) ${m.modules.wp} Wp`, qty: m.modules.qty, unit: 'Nos', make: inp.moduleMake },
    { item: `On-Grid Inverter (${num(m.kwp, m.kwp % 1 ? 1 : 0)} kW class)`, qty: 1, unit: 'Nos', make: inp.inverterMake },
    { item: inp.structure, qty: 1, unit: 'Set', make: 'As per site design' },
    { item: 'AC Distribution Box (ACDB)', qty: 1, unit: 'Nos', make: 'Reputed make' },
    { item: 'DC Distribution Box (DCDB)', qty: 1, unit: 'Nos', make: 'Reputed make' },
    { item: 'DC Cable (4 sq mm)', qty: 50, unit: 'Mtrs', make: 'Reputed make' },
    { section: 'Installation Accessories' },
    { item: 'Lightning Arrester (LA)', qty: 1, unit: 'Nos', make: 'Reputed make' },
    { item: 'Earthing Kit (Chemical/Rod)', qty: 3, unit: 'Set', make: 'Reputed make' },
    { item: 'MC4 Connectors', qty: 4, unit: 'Pairs', make: 'Reputed make' },
    { item: 'AC Cable (Service Wire)', qty: 20, unit: 'Mtrs', make: 'Reputed make' },
    { item: 'Installation & Commissioning', qty: 1, unit: 'Job', make: 'Sunpay' },
    { item: 'Transportation & Handling', qty: 1, unit: 'Trip', make: 'Sunpay' },
  ];
}

const FLOW = [
  ['Generation', 'Solar panels convert sunlight into DC electricity throughout the day.'],
  ['DC Protection', 'The DCDB isolates and protects the DC side with fuses and surge protection.'],
  ['Conversion', 'The inverter converts DC into grid-synchronised 230 V AC power.'],
  ['AC Protection', 'The ACDB safeguards the AC side and provides safe isolation.'],
  ['Net-Metering', 'The bi-directional meter records energy imported and exported.'],
  ['Home & Grid', 'Your loads are powered first; surplus energy is exported to the grid.'],
];
const JOURNEY = [
  ['Site Survey & System Design', 'Roof assessment, shadow check and a system design suited to your consumption.'],
  ['Order Confirmation & Procurement', 'The advance payment confirms the order; materials are then procured.'],
  ['Structure & Module Installation', 'Mounting structure erection and panel installation.'],
  ['Electrical & Safety Works', 'DC/AC wiring, distribution boxes, earthing and lightning protection.'],
  ['DISCOM Liaison & Net-Metering', 'We handle the net-meter application and coordination with your DISCOM.'],
  ['Testing, Commissioning & Handover', 'System testing, a walk-through of how to use it, and documents handed over.'],
];
const SCOPE = ['Supply of all solar PV components as per the Bill of Materials', 'Complete installation & commissioning', 'AC/DC wiring, earthing & lightning arrester', 'Net-metering application & DISCOM liaison', 'PM Surya Ghar subsidy application support', 'System testing, handover & user guidance'];
const EXCLUSIONS = ['Civil work, scaffolding or roof waterproofing', 'Electrical panel upgrades / main breaker', 'Government fees, permits or DISCOM charges', 'Internet / Wi-Fi for remote monitoring', 'Storage batteries (unless in the BOM)', 'Structural modifications to the building'];
const RESPONSIBILITIES = [
  ['Site Access', 'Provide unobstructed access to the roof / installation site during working hours.'],
  ['Electricity & Water', 'Provide electricity and water supply at site during installation.'],
  ['Approvals', 'Obtain permission from the housing society or local authority, if applicable.'],
  ['Maintenance', 'Clean the solar panels regularly for best output and warranty compliance.'],
];

/**
 * All pages for one proposal.
 * snap: { inputs, number, createdAt } · accepted: { png, at, method } | null · assets: { stamp, sign } | null
 */
export function ProposalPages({ snap, accepted = null, assets = null, idPrefix = 'prp-page-' }) {
  const inp = snap.inputs;
  const m = computeProposal(inp);
  const c = inp.customer || {};
  const w = inp.warranties || {};
  const date = snap.createdAt || new Date().toISOString();
  const validTill = addDays(date, Number(inp.validityDays) || 15);
  const loan = isLoanMethod(inp.paymentMethod) && m.loan;
  const total = loan ? 10 : 9;
  let no = 0;
  const P = (props, children) => { no += 1; return <Page key={no} id={idPrefix + no} no={no} total={total} number={snap.number} {...props}>{children}</Page>; };
  const kw = `${num(m.kwp, m.kwp % 1 ? 1 : 0)} kWp`;
  const milestoneYears = [1, 5, 10, 15, 20, m.years].filter((y, i, a) => y <= m.years && a.indexOf(y) === i);
  const terms = String(inp.terms || '').replace(/\{validity\}/g, String(inp.validityDays)).split('\n').map((t) => t.trim()).filter(Boolean);
  const subsidyNote = 'The PM Surya Ghar subsidy is credited by the Government directly to your bank account — it is not a discount from Sunpay. It depends on DISCOM approval of the installation and on the name on the electricity bill matching the name on the bank account.';

  const pages = [];
  // 1. Cover
  pages.push(P({ cover: true }, (
    <>
      <div className="pp-cover-top">
        <div className="pp-cover-brand"><Mark size={52} /><div><b>{COMPANY.name}</b><span>{COMPANY.tagline}</span></div></div>
        <div className="pp-cover-date"><span>Date</span><b>{longDate(date)}</b></div>
      </div>
      <div className="pp-cover-title">
        <span className="pp-kicker">{COMPANY.name}</span>
        <h1>{kw} On-Grid Rooftop Solar Project Proposal</h1>
        <div className="pp-rule" />
        <p>Residential rooftop solar under PM Surya Ghar: Muft Bijli Yojana</p>
      </div>
      <div className="pp-cover-art" aria-hidden="true">
        <svg viewBox="0 0 600 220" width="100%" height="100%">
          <circle cx="470" cy="70" r="42" fill="#F2A03A" opacity=".9" />
          <polygon points="60,200 300,90 540,200" fill="#E8EDF8" />
          {[0, 1, 2, 3, 4].map((i) => <polygon key={i} points={`${120 + i * 76},180 ${180 + i * 76},180 ${206 + i * 70},132 ${148 + i * 70},132`} fill="#1F3FB4" opacity={0.85 - i * 0.06} />)}
          <rect x="40" y="200" width="520" height="6" fill="#C9581A" rx="3" />
        </svg>
      </div>
      <div className="pp-cover-grid">
        <div className="pp-card"><div className="pp-card-h">Prepared for</div><div className="pp-card-b"><b>{c.name || '—'}</b><p>{c.address || c.city || '—'}</p><p>{c.phone ? '+91 ' + c.phone : ''}</p></div></div>
        <div className="pp-card"><div className="pp-card-h">Proposal details</div><div className="pp-card-b">
          <KV rows={[['Proposal no.', snap.number], ['System', `${kw} On-Grid`], ['Date', longDate(date)], ['Valid till', `${longDate(validTill)} (${inp.validityDays} days)`]]} />
        </div></div>
      </div>
      <div className="pp-cover-foot"><p>{COMPANY.name}{showGstin ? ` | GSTIN: ${COMPANY.gstin}` : ''}</p><p>{COMPANY.address}</p><p>{COMPANY.phone} · {COMPANY.email} · {COMPANY.web}</p></div>
    </>
  )));

  // 2. Overview, customer & site
  pages.push(P({ title: 'Proposal Overview', sub: 'Your customer and site details, and the system at a glance' }, (
    <>
      <div className="pp-hero">
        <div><span className="pp-hero-type">On-Grid System</span><h2>Rooftop Solar Power System</h2><p>Grid-connected solar with net-metering</p></div>
        <div className="pp-badges"><span>Turnkey installation</span><span>PM Surya Ghar subsidy</span></div>
      </div>
      <h3>Customer &amp; Site</h3>
      <div className="pp-two">
        <KV rows={[['Customer', c.name], ['Phone', c.phone ? '+91 ' + c.phone : '—'], ['Address', c.address || '—'], ['City / town', c.city || '—']]} />
        <KV rows={[['DISCOM', c.discom || '—'], ['Consumer no.', c.consumerNo || '—'], ['Customer ref.', c.crn || '—'], ['Connection', 'Residential']]} />
      </div>
      <h3>At a Glance</h3>
      <div className="pp-metrics">
        {[
          ['System capacity', kw], ['Price (incl. GST)', inr(m.price)], ['Govt. subsidy (est.)', inr(m.subsidy)], ['Effective cost', inr(m.effectiveCost)],
          ['Annual generation', `${num(m.genAnnual1)} units`], ['Savings in year 1', inr(m.year1.savings)], [`Savings over ${m.years} years`, inr(m.lifetimeSavings)], ['Payback', m.payback === null ? `> ${m.years} years` : `${num(m.payback, 1)} years`],
        ].map(([k, v], i) => <div key={k} className={'pp-metric' + (i < 2 ? ' hi' : '')}><span>{k}</span><b>{v}</b></div>)}
      </div>
      <div className="pp-two pp-gap">
        <div className="pp-about">
          <h3>About {COMPANY.name}</h3>
          <p>{COMPANY.name} is a solar EPC company based in Deesa, Gujarat, installing rooftop solar systems for residential, commercial and industrial sites. For homes we handle the complete job — design, supply, installation, the net-metering application with your DISCOM and the PM Surya Ghar subsidy paperwork.</p>
        </div>
        <div className="pp-highlights">
          <h3>What you get</h3>
          <ul className="pp-check">
            <li>A system sized to your electricity use</li>
            <li>DISCOM net-metering application handled for you</li>
            <li>PM Surya Ghar subsidy application support</li>
            <li>Manufacturer warranties on modules and inverter</li>
            <li>{num(w.workmanship)}-year workmanship warranty from Sunpay</li>
          </ul>
        </div>
      </div>
    </>
  )));

  // 3. How it works
  pages.push(P({ title: 'How Your System Works', sub: 'Energy flow, net-metering and your installation journey' }, (
    <>
      <h3>Energy Flow, Step by Step</h3>
      <div className="pp-flow">{FLOW.map(([t, d], i) => <div key={t} className="pp-step"><span>{i + 1}</span><div><b>{t}</b><p>{d}</p></div></div>)}</div>
      <div className="pp-note"><b>What is net-metering?</b><p>Your DISCOM installs a bi-directional meter that records both the energy you draw from the grid and the surplus solar energy you export to it. Your bill is worked out on the <em>net</em> units (import minus export), and surplus units are credited at the DISCOM's export rate — so your rooftop keeps saving you money even when you are not at home.</p></div>
      <h3>Component Technology</h3>
      <div className="pp-tech">
        <div><b>Solar PV Modules</b><p>{inp.moduleModel} modules, {m.modules.wp} Wp each, from {inp.moduleMake}. {num(w.modulePerf)}-year performance warranty from the manufacturer.</p></div>
        <div><b>Grid-Tie Inverter</b><p>MPPT-tracked conversion of DC to grid-synchronised AC, with anti-islanding protection and app-based monitoring. Make: {inp.inverterMake}.</p></div>
        <div><b>Mounting Structure</b><p>{inp.structure}, designed for the wind load at your site.</p></div>
        <div><b>Protection &amp; Earthing</b><p>Lightning arrester, surge protection in the DCDB and ACDB, and earthing for the array, arrester and system.</p></div>
      </div>
      <h3>Your Installation Journey</h3>
      <div className="pp-flow">{JOURNEY.map(([t, d], i) => <div key={t} className="pp-step"><span>{i + 1}</span><div><b>{t}</b><p>{d}</p></div></div>)}</div>
    </>
  )));

  // 4. Recommended system + BOM + warranties
  pages.push(P({ title: 'Recommended System', sub: 'Bill of materials and warranty coverage' }, (
    <>
      <div className="pp-two">
        <KV rows={[['System capacity', kw], ['Modules', `${m.modules.qty} × ${m.modules.wp} Wp = ${num(m.modules.dcKwp, 2)} kWp DC`], ['Inverter', `On-grid, ${inp.inverterMake}`]]} />
        <KV rows={[['Structure', inp.structure], ['Expected generation', `${num(m.genMonthly1)} units / month`], ['Connection', `Net-metered, ${c.discom || 'DISCOM'}`]]} />
      </div>
      <h3>Bill of Materials</h3>
      <table className="pp-table">
        <thead><tr><th style={{ width: 34 }}>SN</th><th>Item description</th><th className="c" style={{ width: 52 }}>Qty</th><th className="c" style={{ width: 52 }}>Unit</th><th style={{ width: '26%' }}>Make</th></tr></thead>
        <tbody>
          {(() => { let sn = 0; return bomRows(inp, m).map((r) => (r.section
            ? <tr key={r.section} className="pp-sec"><td colSpan={5}>{r.section}</td></tr>
            : <tr key={r.item}><td className="c">{++sn}</td><td>{r.item}</td><td className="c">{r.qty}</td><td className="c">{r.unit}</td><td>{r.make}</td></tr>)); })()}
        </tbody>
      </table>
      <p className="pp-small">Components are from reputed manufacturers. Actual brands may vary with availability; equivalent or better alternatives will be supplied.</p>
      <h3>Warranty Coverage</h3>
      <KV rows={[
        ['Solar PV modules', `${num(w.modulePerf)} years performance warranty, ${num(w.moduleProduct)} years product warranty (manufacturer)`],
        ['Inverter', `${num(w.inverter)} years standard warranty (manufacturer)`],
        ['Mounting structure', `${num(w.structure)} years against structural defects`],
        ['Workmanship', `${num(w.workmanship)} years installation warranty (Sunpay)`],
      ]} />
      <p className="pp-small">All warranties are subject to proper use and maintenance as per manufacturer guidelines. Warranty certificates are handed over at commissioning.</p>
    </>
  )));

  // 5. Generation
  pages.push(P({ title: 'Generation Estimate', sub: `What your ${kw} system is expected to produce over ${m.years} years` }, (
    <>
      <div className="pp-metrics three">
        <div className="pp-metric hi"><span>Per month (year 1)</span><b>{num(m.genMonthly1)} units</b></div>
        <div className="pp-metric hi"><span>Per year (year 1)</span><b>{num(m.genAnnual1)} units</b></div>
        <div className="pp-metric"><span>Over {m.years} years</span><b>{num(m.totalGen)} units</b></div>
      </div>
      <p className="pp-small">Basis: {num(m.unitsPerKwMonth)} units per kW per month on average, module output reducing {pct(m.degradationPct, 1)} a year, electricity tariff ₹{num(m.tariff, 2)}/unit rising {pct(m.escalationPct, 1)} a year, export credit ₹{num(m.exportRate, 2)}/unit rising at the same rate. Your usage: {num(m.consumptionMonthly)} units a month. Actual generation depends on weather, shading and upkeep.</p>
      <table className="pp-table pp-dense">
        <thead><tr><th className="c">Year</th><th className="r">Generation (units)</th><th className="r">Tariff ₹/unit</th><th className="r">Bill without solar</th><th className="r">Bill with solar</th><th className="r">Savings</th><th className="r">Cumulative savings</th></tr></thead>
        <tbody>{m.rows.map((r) => (
          <tr key={r.year} className={m.paybackYear === r.year ? 'pp-hl' : ''}><td className="c">{r.year}</td><td className="r">{num(r.generation)}</td><td className="r">{num(r.tariff, 2)}</td><td className="r">{inr(r.billBefore)}</td><td className="r">{inr(r.billAfter)}</td><td className="r">{inr(r.savings)}</td><td className="r">{inr(r.cumulative)}</td></tr>
        ))}</tbody>
      </table>
      {m.paybackYear && <p className="pp-small">Highlighted: the year the cumulative savings pass the effective cost ({inr(m.effectiveCost)}).</p>}
    </>
  )));

  // 6. Savings & returns
  pages.push(P({ title: 'Savings & Returns', sub: 'Your bill before and after solar, and the return on your investment' }, (
    <>
      <h3>Monthly Bill Comparison (year 1, average)</h3>
      <div className="pp-compare">
        <div className="pp-cmp before"><div className="pp-cmp-h">Without solar</div><b>{inr(m.monthly1.billBefore)}</b><span>per month · {num(m.consumptionMonthly)} units at ₹{num(m.tariff, 2)}</span></div>
        <div className="pp-arrow">→</div>
        <div className="pp-cmp after"><div className="pp-cmp-h">With Sunpay solar</div><b>{m.monthly1.billAfter < 0 ? `${inr(-m.monthly1.billAfter)} credit` : inr(m.monthly1.billAfter)}</b><span>per month, after net-metering</span><div className="pp-save">Save {inr(m.monthly1.savings)} / month</div></div>
      </div>
      <h3>Net-Metering (year 1)</h3>
      <KV rows={[
        ['Units generated', `${num(m.genAnnual1)} units`],
        ['Units you use', `${num(m.consumptionAnnual)} units`],
        ['Units still drawn from the grid', `${num(m.year1.imported)} units`],
        ['Surplus units exported', `${num(m.year1.exported)} units`],
        ['Net-metering credit', `${inr(m.year1.exportCredit)} (at ₹${num(m.exportRate, 2)}/unit)`],
        ['Annual savings, year 1', inr(m.year1.savings)],
      ]} />
      <h3>Savings Over Time</h3>
      <table className="pp-table">
        <thead><tr><th>Year</th><th className="r">Tariff (₹/unit)</th><th className="r">Annual savings</th><th className="r">Cumulative savings</th></tr></thead>
        <tbody>{milestoneYears.map((y) => { const r = m.rows[y - 1]; return <tr key={y}><td>Year {y}</td><td className="r">{num(r.tariff, 2)}</td><td className="r">{inr(r.savings)}</td><td className="r">{inr(r.cumulative)}</td></tr>; })}</tbody>
      </table>
      <div className="pp-returns">
        <div><span>Savings over {m.years} years</span><b>{inr(m.lifetimeSavings)}</b></div>
        <div><span>Payback</span><b>{m.payback === null ? `> ${m.years} yrs` : `${num(m.payback, 1)} yrs`}</b>{m.paybackYear && <em>in year {m.paybackYear}</em>}</div>
        <div><span>Return on investment</span><b>{pct(m.roi, 0)}</b></div>
        <div><span>Internal rate of return</span><b>{pct(m.irr, 1)}</b></div>
      </div>
      <p className="pp-small">Returns are worked out on the effective cost of {inr(m.effectiveCost)} (price less the expected subsidy), before any loan.</p>
      <h3>Environmental Impact ({m.years} years)</h3>
      <div className="pp-metrics three">
        <div className="pp-metric"><span>CO₂ avoided</span><b>{num(m.env.co2Tonnes, 1)} tonnes</b></div>
        <div className="pp-metric"><span>Equal to planting</span><b>{num(m.env.trees)}+ trees</b></div>
        <div className="pp-metric"><span>Clean energy</span><b>{num(m.env.mwh, 1)} MWh</b></div>
      </div>
    </>
  )));

  // 7. Loan & EMI (loan customers only) — solar-savings EMI vs savings and breakeven table
  if (loan) {
    const L = m.loan;
    pages.push(P({ title: 'Loan & EMI', sub: `${inp.paymentMethod}${inp.bank ? ` · ${inp.bank}` : ''}: what you pay each month and what you save` }, (
      <>
        <div className="pp-two">
          <KV rows={[['Project price', inr(m.price)], ['Down payment', inr(L.down)], ['Loan amount', inr(L.amount)], ['Interest rate', `${num(L.rate, 2)}% a year`], ['Tenure', `${num(L.months / 12, L.months % 12 ? 1 : 0)} years (${L.months} EMIs)`]]} />
          <KV rows={[['Monthly EMI', inr(L.emi)], ['Total paid to the lender', inr(L.totalPaid)], ['Total interest', inr(L.totalInterest)], L.monthsAfterSubsidy ? ['If the subsidy prepays the loan', `about ${num(L.monthsAfterSubsidy / 12, 1)} years at the same EMI`] : null]} />
        </div>
        <h3>Monthly Cash-Flow (year 1, average)</h3>
        <table className="pp-table">
          <tbody>
            <tr><td>Electricity bill without solar</td><td className="r">{inr(m.monthly1.billBefore)}</td></tr>
            <tr><td>Electricity bill with solar</td><td className="r">{inr(m.monthly1.billAfter)}{m.monthly1.billAfter < 0 ? ' (credit)' : ''}</td></tr>
            <tr><td>Loan EMI</td><td className="r">{inr(L.emi)}</td></tr>
            <tr><td><b>Monthly savings vs EMI</b></td><td className="r"><b>{inr(L.monthlySavings1)} − {inr(L.emi)}</b></td></tr>
            <tr className={L.netMonthly1 >= 0 ? 'pp-good' : 'pp-bad'}><td><b>Net monthly cash-flow</b></td><td className="r"><b>{inr(L.netMonthly1)} {L.netMonthly1 >= 0 ? '(you gain)' : '(you pay extra)'}</b></td></tr>
          </tbody>
        </table>
        <h3>Breakeven Table</h3>
        <table className="pp-table pp-dense">
          <thead><tr><th className="c">Year</th><th className="r">Savings</th><th className="r">Subsidy received</th><th className="r">Loan paid</th><th className="r">Net cash-flow</th><th className="r">Cumulative</th></tr></thead>
          <tbody>
            <tr><td className="c">0</td><td className="r">—</td><td className="r">—</td><td className="r">—</td><td className="r">{inr(-L.down)}</td><td className="r">{inr(-L.down)}</td></tr>
            {L.flows.map((f) => <tr key={f.year} className={L.breakevenYear === f.year ? 'pp-hl' : ''}><td className="c">{f.year}</td><td className="r">{inr(f.savings)}</td><td className="r">{f.subsidy ? inr(f.subsidy) : '—'}</td><td className="r">{f.loanPaid ? inr(f.loanPaid) : '—'}</td><td className="r">{inr(f.net)}</td><td className="r">{inr(f.cumulative)}</td></tr>)}
          </tbody>
        </table>
        <p className="pp-small">{L.breakevenYear ? `You are ahead (savings + subsidy have covered your down payment and EMIs) from year ${L.breakevenYear}.` : `Breakeven is not reached within ${m.years} years on these figures.`} Assumes the subsidy is credited in year 1. Loan terms are indicative; the lender's sanction letter is final.</p>
      </>
    )));
  }

  // 8. Commercial offer + payment schedule
  const ms = (inp.milestones || []).filter((x) => x.label);
  pages.push(P({ title: 'Commercial Offer', sub: 'Pricing and payment terms' }, (
    <>
      <div className="pp-two">
        <div className="pp-card"><div className="pp-card-h">From</div><div className="pp-card-b"><b>{COMPANY.name}</b><p>{COMPANY.address}</p><p>{COMPANY.phone} · {COMPANY.email}</p>{showGstin && <p>GSTIN: {COMPANY.gstin}</p>}</div></div>
        <div className="pp-card"><div className="pp-card-h">Proposal for</div><div className="pp-card-b"><b>{c.name}</b><p>{c.address || c.city}</p><p>Proposal no. <b>{snap.number}</b> · {longDate(date)}</p></div></div>
      </div>
      <h3>System Pricing</h3>
      <table className="pp-table pp-price">
        <tbody>
          <tr><td>System capacity</td><td className="r">{kw} On-Grid</td></tr>
          <tr><td>Taxable value</td><td className="r">{inr(m.gst.taxable)}</td></tr>
          <tr><td>CGST ({num(m.gst.rate / 2, 2)}%)</td><td className="r">{inr(m.gst.cgst)}</td></tr>
          <tr><td>SGST ({num(m.gst.rate / 2, 2)}%)</td><td className="r">{inr(m.gst.sgst)}</td></tr>
          <tr className="pp-total"><td>Total price (incl. GST)</td><td className="r">{inr(m.price)}</td></tr>
        </tbody>
      </table>
      <p className="pp-small"><b>Amount in words:</b> {m.words}. {inp.gstNote}</p>
      <div className="pp-strip">
        <div><span>Total price</span><b>{inr(m.price)}</b><em>incl. GST, paid to Sunpay</em></div>
        <div><span>PM Surya Ghar subsidy</span><b>− {inr(m.subsidy)}</b><em>credited to your bank account by the Government</em></div>
        <div className="net"><span>Effective cost to you</span><b>{inr(m.effectiveCost)}</b><em>after the subsidy is received</em></div>
      </div>
      <div className="pp-note warn"><b>About the subsidy</b><p>{subsidyNote}</p></div>
      <h3>Payment Schedule</h3>
      <div className="pp-pay">{ms.map((x, i) => (
        <div key={i} className="pp-pay-step"><span>{i + 1}</span><div><b>{x.label} ({num(x.pct)}%)</b><em>{inr((m.price * x.pct) / 100)}</em><p>{x.note}</p></div></div>
      ))}</div>
      {isLoanMethod(inp.paymentMethod) && <p className="pp-small">Payment method: {inp.paymentMethod}{inp.bank ? ` (${inp.bank})` : ''}. The loan amount is paid by the lender against these milestones; your down payment of {inr(m.loan.down)} is paid to Sunpay.</p>}
      {(assets?.account || assets?.ifsc) && (
        <div className="pp-bank"><b>Bank transfer details</b><span>Beneficiary: {COMPANY.name}</span>{assets.account && <span>A/c no.: {assets.account}</span>}{assets.ifsc && <span>IFSC: {assets.ifsc}</span>}</div>
      )}
    </>
  )));

  // 9. Terms
  pages.push(P({ title: 'Terms & Conditions', sub: 'Scope, responsibilities and general terms' }, (
    <>
      <div className="pp-two">
        <div className="pp-card"><div className="pp-card-h">Scope of work</div><div className="pp-card-b"><ul className="pp-check">{SCOPE.map((s) => <li key={s}>{s}</li>)}</ul></div></div>
        <div className="pp-card ex"><div className="pp-card-h">Exclusions</div><div className="pp-card-b"><ul className="pp-check x">{EXCLUSIONS.map((s) => <li key={s}>{s}</li>)}</ul></div></div>
      </div>
      <h3>Customer Responsibilities</h3>
      <div className="pp-resp">{RESPONSIBILITIES.map(([t, d]) => <div key={t}><b>{t}</b><p>{d}</p></div>)}</div>
      <h3>General Terms &amp; Conditions</h3>
      <ol className="pp-terms">{terms.map((t, i) => { const k = t.indexOf(':'); return <li key={i}>{k > 0 && k < 40 ? <><b>{t.slice(0, k)}:</b>{t.slice(k + 1)}</> : t}</li>; })}</ol>
    </>
  )));

  // 10. Acceptance
  pages.push(P({ title: 'Proposal Acceptance', sub: 'Confirm the proposal to go ahead' }, (
    <>
      <KV rows={[
        ['Proposal no.', snap.number], ['Customer', c.name], ['System', `${kw} On-Grid rooftop solar`],
        ['Total price (incl. GST)', inr(m.price)], ['Expected subsidy', `${inr(m.subsidy)} (credited to the customer's bank account)`], ['Effective cost', inr(m.effectiveCost)],
        ['Payment method', inp.paymentMethod + (loan ? ` · EMI ${inr(m.loan.emi)} × ${m.loan.months}` : '')], ['Valid till', longDate(validTill)],
      ]} />
      <p className="pp-declare">I / We have read this proposal, including the Bill of Materials, the commercial offer, the payment schedule and the terms &amp; conditions, and accept it. I / We understand that the PM Surya Ghar subsidy is paid by the Government, depends on DISCOM approval and requires the name on the electricity bill to match the bank account name.</p>
      <div className="pp-sign">
        <div className="pp-signbox">
          <div className="pp-sign-h">Customer</div>
          <div className="pp-sign-area">{accepted?.png ? <img src={accepted.png} alt="Customer signature" /> : <span className="pp-sign-empty">Signature</span>}</div>
          <div className="pp-sign-line"><b>{c.name}</b><span>{accepted?.at ? `Accepted on ${longDate(accepted.at)}${accepted.method ? ` (${accepted.method === 'photo' ? 'photo of signature' : 'signed on screen'})` : ''}` : 'Date: ____________'}</span></div>
        </div>
        <div className="pp-signbox">
          <div className="pp-sign-h">For {COMPANY.name}</div>
          <div className="pp-sign-area stamp">
            {assets?.stamp && <img src={assets.stamp} alt="Sunpay stamp" className="st" />}
            {assets?.sign && <img src={assets.sign} alt="Authorised signature" className="sg" />}
            {!assets?.stamp && !assets?.sign && <span className="pp-sign-empty">Stamp &amp; sign</span>}
          </div>
          <div className="pp-sign-line"><b>Authorised signatory</b><span>Date: {longDate(date)}</span></div>
        </div>
      </div>
      <div className="pp-thanks"><h2>Thank you for choosing {COMPANY.name}</h2><p>Questions about this proposal? Call {COMPANY.phone} or write to {COMPANY.email}.</p></div>
    </>
  )));
  return <>{pages}</>;
}

export const pageCount = (inputs) => (isLoanMethod(inputs.paymentMethod) ? 10 : 9);
