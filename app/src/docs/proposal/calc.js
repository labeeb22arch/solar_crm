// Residential on-grid proposal maths. Pure functions only: no DOM, no React, no app data access, so the
// builder, the PDF, the public acceptance page and `node calc.test.mjs` all get the same numbers.
//
// Ported from the SolarFlow Toolbox (read-only source):
//   - PM Surya Ghar subsidy slab ............ quote-generator.js (generatePreview)
//   - GST back-calculation from incl. price .. quote-generator.js (generatePreview)
//   - NPV / IRR (bisection) / ROI ............ global/scripts/solar-returns.js
//   - year-by-year projection with degradation and tariff + export-rate escalation ... quote-generator-calc.js (projection)
//   - interpolated payback ................... quote-generator-calc.js (paybackYears)
//   - net-metering bill before / after, export credit ... solar-savings.js (calculateSavings, generateBreakevenTable)
//   - reducing-balance EMI, tenure after subsidy prepayment ... solar-savings.js / emi-calculator.js
//   - CO2 (0.82 kg/kWh) and trees (45 per tonne) ... quote-generator.js
//   - amount in words (Indian numbering) .... quote-generator.js (numberToWords)

export const LOAN_METHODS = ['Bank Solar Loan', 'Personal Loan'];
export const isLoanMethod = (m) => LOAN_METHODS.includes(m);

const n = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };

/** National PM Surya Ghar CFA: ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, capped at ₹78,000. */
export function subsidyFor(kwp) {
  const k = Math.max(0, n(kwp));
  if (k <= 2) return Math.round(k * 30000);
  if (k <= 3) return Math.round(60000 + (k - 2) * 18000);
  return 78000;
}

/** GST inside a GST-inclusive price: taxable = total / (1 + rate); split CGST/SGST for an intra-state (Gujarat) sale. */
export function gstSplit(totalInclGst, ratePct) {
  const total = Math.max(0, n(totalInclGst));
  const rate = Math.max(0, n(ratePct));
  const taxable = total / (1 + rate / 100);
  const gst = total - taxable;
  return { total, rate, taxable, gst, cgst: gst / 2, sgst: gst / 2 };
}

/** Number of modules needed for a kWp size, and the DC size they actually make. */
export function moduleCount(kwp, wp) {
  const w = n(wp) > 0 ? n(wp) : 540;
  const qty = Math.max(1, Math.ceil((n(kwp) * 1000) / w - 1e-9));
  return { qty, wp: w, dcKwp: Math.round(qty * w) / 1000 };
}

// ---------- returns (solar-returns.js) ----------
export function npv(rate, flows) { return flows.reduce((t, f, i) => t + f / Math.pow(1 + rate, i), 0); }

/** IRR in percent, or null when there is no sign change or no root in [-99.99%, 1000%]. Bisection, as in the Toolbox. */
export function irr(flows, { lowerBound = -0.9999, upperBound = 10, tolerance = 1e-7, maxIterations = 200 } = {}) {
  if (!Array.isArray(flows) || flows.length < 2 || !flows.every(Number.isFinite)) return null;
  if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) return null;
  let low = lowerBound; let high = upperBound;
  let npvLow = npv(low, flows); const npvHigh = npv(high, flows);
  if (npvLow * npvHigh > 0) return null;
  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (low + high) / 2;
    const v = npv(mid, flows);
    if (Math.abs(v) < tolerance || (high - low) / 2 < tolerance) return mid * 100;
    if (npvLow * v < 0) high = mid; else { low = mid; npvLow = v; }
  }
  return ((low + high) / 2) * 100;
}

/** Simple ROI in percent: (total savings − investment) / investment. */
export function roi(investment, savings) {
  if (!Number.isFinite(investment) || investment <= 0 || !Array.isArray(savings) || !savings.length) return null;
  const total = savings.reduce((t, s) => t + (Number.isFinite(s) ? s : 0), 0);
  return ((total - investment) / investment) * 100;
}

/**
 * Payback in years against the net investment, interpolated inside the year it is reached (quote-generator-calc.js).
 * `rows` carry a running `cumulative` savings figure. 0 when nothing is invested; null when never reached.
 */
export function paybackYears(investment, rows) {
  if (investment <= 0) return 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].cumulative >= investment) {
      const prev = i === 0 ? 0 : rows[i - 1].cumulative;
      const gap = rows[i].cumulative - prev;
      const frac = gap > 0 ? (investment - prev) / gap : 0;
      return Math.round((i + frac) * 10) / 10;
    }
  }
  return null;
}

// ---------- loan (solar-savings.js / emi-calculator.js, reducing balance) ----------
/** Monthly EMI on a reducing balance. A 0% loan is principal / months. */
export function emi(principal, annualRatePct, months) {
  const P = Math.max(0, n(principal)); const N = Math.max(0, Math.round(n(months)));
  if (!P || !N) return 0;
  const r = n(annualRatePct) / 12 / 100;
  if (r <= 0) return P / N;
  const pw = Math.pow(1 + r, N);
  return (P * r * pw) / (pw - 1);
}

/** Months needed to clear `principal` at a fixed EMI (null if the EMI never covers the interest). */
export function monthsToRepay(principal, annualRatePct, monthly) {
  const P = Math.max(0, n(principal));
  if (!P) return 0;
  if (!(monthly > 0)) return null;
  const r = n(annualRatePct) / 12 / 100;
  if (r <= 0) return P / monthly;
  if (monthly <= P * r) return null;
  return Math.log(monthly / (monthly - P * r)) / Math.log(1 + r);
}

// ---------- words (quote-generator.js) ----------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (x) => (x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? ' ' + ONES[x % 10] : ''));
const three = (x) => (x >= 100 ? ONES[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' and ' + two(x % 100) : '') : two(x));
export function rupeesInWords(value) {
  let num = Math.round(Math.max(0, n(value)));
  if (num === 0) return 'Zero Rupees Only';
  let out = '';
  if (num >= 10000000) { out += three(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
  if (num >= 100000) { out += two(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
  if (num >= 1000) { out += two(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
  if (num > 0) out += three(num);
  return out.trim() + ' Rupees Only';
}

// ---------- the whole proposal ----------
/**
 * Every figure the proposal prints, from one inputs object (see settings.js `proposalInputs`).
 * Consumption: monthly units, or a monthly bill converted at the tariff (energy charges only).
 */
export function computeProposal(inp) {
  const kwp = Math.max(0, n(inp.kwp));
  const years = Math.max(1, Math.round(n(inp.years, 25)));
  const tariff = Math.max(0, n(inp.tariff));
  const esc = n(inp.escalationPct) / 100;
  const exportRate = Math.max(0, n(inp.exportRate));
  const deg = n(inp.degradationPct) / 100;
  const unitsPerKwMonth = Math.max(0, n(inp.unitsPerKwMonth, 120));

  const mod = moduleCount(kwp, inp.moduleWp);
  const genMonthly1 = kwp * unitsPerKwMonth;
  const genAnnual1 = genMonthly1 * 12;

  const consumptionMonthly = inp.consumptionMode === 'bill'
    ? (tariff > 0 ? Math.max(0, n(inp.monthlyBill)) / tariff : 0)
    : Math.max(0, n(inp.monthlyUnits));
  const consumptionAnnual = consumptionMonthly * 12;

  const price = Math.max(0, n(inp.price));
  const subsidy = Math.min(price, Math.max(0, n(inp.subsidy)));
  const effectiveCost = Math.max(0, price - subsidy);
  const gst = gstSplit(price, inp.gstRate);

  // Year-by-year (degraded generation, escalating tariff and export credit; consumption held flat).
  const rows = [];
  let cumulative = 0; let totalGen = 0;
  for (let y = 1; y <= years; y += 1) {
    const generation = genAnnual1 * Math.pow(1 - deg, y - 1);
    const t = tariff * Math.pow(1 + esc, y - 1);
    const x = exportRate * Math.pow(1 + esc, y - 1);
    const imported = Math.max(0, consumptionAnnual - generation);
    const exported = Math.max(0, generation - consumptionAnnual);
    const billBefore = consumptionAnnual * t;
    const exportCredit = exported * x;
    const billAfter = imported * t - exportCredit;
    const savings = billBefore - billAfter;
    cumulative += savings; totalGen += generation;
    rows.push({ year: y, generation, tariff: t, exportRate: x, imported, exported, billBefore, billAfter, exportCredit, savings, cumulative });
  }
  const y1 = rows[0];
  const savingsSeries = rows.map((r) => r.savings);
  const payback = paybackYears(effectiveCost, rows);
  const returns = { roi: roi(effectiveCost, savingsSeries), irr: irr([-effectiveCost, ...savingsSeries]) };

  // Loan (only when the payment method is a loan).
  let loan = null;
  if (isLoanMethod(inp.paymentMethod)) {
    const down = Math.max(0, n(inp.downPayment));
    const amount = Math.max(0, n(inp.loanAmount));
    const rate = Math.max(0, n(inp.loanRatePct));
    const months = Math.max(0, Math.round(n(inp.loanTenureYears) * 12));
    const monthly = emi(amount, rate, months);
    const totalPaid = monthly * months;
    const afterSubsidy = subsidy > 0 && amount > subsidy ? monthsToRepay(amount - subsidy, rate, monthly) : null;
    const monthlySavings1 = y1.savings / 12;
    const flows = [];
    let cum = -down; let breakevenYear = cum >= 0 ? 0 : null;
    for (const r of rows) {
      const loanPaid = r.year <= Math.ceil(months / 12) ? monthly * Math.min(12, months - (r.year - 1) * 12) : 0;
      const subsidyIn = r.year === 1 ? subsidy : 0;
      const net = r.savings + subsidyIn - loanPaid;
      cum += net;
      if (breakevenYear === null && cum >= 0) breakevenYear = r.year;
      flows.push({ year: r.year, savings: r.savings, subsidy: subsidyIn, loanPaid, net, cumulative: cum });
    }
    loan = {
      down, amount, rate, months, emi: monthly, totalPaid, totalInterest: Math.max(0, totalPaid - amount),
      monthsAfterSubsidy: afterSubsidy, monthlySavings1, billAfterMonthly1: y1.billAfter / 12,
      netMonthly1: monthlySavings1 - monthly, outlayMonthly1: Math.max(0, y1.billAfter / 12) + monthly,
      flows, breakevenYear,
    };
  }

  const co2Tonnes = (totalGen * 0.82) / 1000;
  return {
    kwp, years, tariff, exportRate, escalationPct: esc * 100, degradationPct: deg * 100, unitsPerKwMonth,
    modules: mod, genMonthly1, genAnnual1, totalGen, consumptionMonthly, consumptionAnnual,
    price, subsidy, effectiveCost, gst, words: rupeesInWords(price),
    rows, year1: y1, monthly1: { billBefore: y1.billBefore / 12, billAfter: y1.billAfter / 12, savings: y1.savings / 12, exportCredit: y1.exportCredit / 12 },
    lifetimeSavings: cumulative, payback, paybackYear: payback === null ? null : Math.max(1, Math.ceil(payback)), ...returns,
    env: { co2Tonnes, trees: Math.round(co2Tonnes * 45), mwh: totalGen / 1000 },
    loan,
  };
}

/** Short totals stored on the customer with each sent version (for lists; the pages always recompute from inputs). */
export function proposalTotals(m) {
  const r = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);
  return {
    kwp: m.kwp, price: r(m.price), subsidy: r(m.subsidy), effectiveCost: r(m.effectiveCost), genAnnual1: r(m.genAnnual1),
    savingsYear1: r(m.year1.savings), lifetimeSavings: r(m.lifetimeSavings), payback: m.payback, roi: r(m.roi), irr: r(m.irr),
    emi: m.loan ? r(m.loan.emi) : null,
  };
}
