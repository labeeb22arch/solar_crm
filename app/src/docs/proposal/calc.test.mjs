// Run: node src/docs/proposal/calc.test.mjs
import assert from 'node:assert/strict';
import { subsidyFor, emi, monthsToRepay, irr, roi, npv, paybackYears, moduleCount, gstSplit, rupeesInWords, computeProposal } from './calc.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ~${b}, got ${a}`);

// --- PM Surya Ghar subsidy ---
assert.equal(subsidyFor(1), 30000);
assert.equal(subsidyFor(2), 60000);
assert.equal(subsidyFor(2.5), 69000);
assert.equal(subsidyFor(3), 78000);
assert.equal(subsidyFor(10), 78000, 'capped at ₹78,000');
assert.equal(subsidyFor(0), 0);

// --- EMI (reducing balance) ---
close(emi(100000, 12, 12), 8884.88, 0.01, '1 lakh at 12% for 12 months');
close(emi(200000, 7, 84), 3018.52, 0.05, '2 lakh at 7% for 7 years');
assert.equal(emi(120000, 0, 12), 10000, '0% loan is principal / months');
assert.equal(emi(0, 7, 84), 0);
// Paying the same EMI on a smaller principal (subsidy used to prepay) clears it sooner.
const m = monthsToRepay(200000 - 78000, 7, emi(200000, 7, 84));
assert.ok(m > 40 && m < 84, `tenure after prepayment ${m}`);
close(monthsToRepay(100000, 12, emi(100000, 12, 12)), 12, 1e-6, 'months to repay inverts EMI');

// --- returns (same cases as the Toolbox solar-returns tests) ---
close(irr([-1000, 500, 500, 500]), 23.375, 0.01, 'three-year IRR');
close(irr([-100000, ...Array(25).fill(10000)]), 8.8, 0.05, 'flat annuity IRR');
const series = [-250000, 40000, 42000, 44000, 46000, 48000, 50000, 52000];
close(npv(irr(series) / 100, series), 0, 1, 'NPV at IRR');
assert.equal(irr([100, 100]), null);
assert.equal(irr([-1, 1e9]), null, 'beyond the bracket is not guessed');
close(roi(100000, [50000, 50000, 50000, 50000, 50000]), 150, 1e-6, 'simple ROI');
assert.equal(roi(0, [1]), null);

// --- payback (interpolated) ---
const rows = [1, 2, 3, 4].map((y) => ({ cumulative: y * 30000 }));
assert.equal(paybackYears(75000, rows), 2.5);
assert.equal(paybackYears(0, rows), 0);
assert.equal(paybackYears(500000, rows), null);

// --- modules, GST, words ---
assert.deepEqual(moduleCount(3, 540), { qty: 6, wp: 540, dcKwp: 3.24 });
assert.equal(moduleCount(5, 550).qty, 10);
const g = gstSplit(105000, 5);
close(g.taxable, 100000, 1e-6, 'taxable'); close(g.cgst, 2500, 1e-6, 'cgst');
assert.equal(rupeesInWords(226400), 'Two Lakh Twenty Six Thousand Four Hundred Rupees Only');

// --- degradation across the projection ---
const base = {
  kwp: 3, price: 226400, subsidy: subsidyFor(3), gstRate: 5, consumptionMode: 'units', monthlyUnits: 360,
  tariff: 6.5, escalationPct: 0, exportRate: 2.25, degradationPct: 0.5, years: 25, unitsPerKwMonth: 120, moduleWp: 540, paymentMethod: 'Cash',
};
const p = computeProposal(base);
assert.equal(p.genAnnual1, 4320);
close(p.rows[1].generation, 4320 * 0.995, 1e-6, 'year 2 generation degrades 0.5%');
close(p.rows[24].generation, 4320 * Math.pow(0.995, 24), 1e-6, 'year 25 generation');
// Year 1: generation equals consumption, so the bill goes to zero and savings = old bill.
close(p.year1.savings, 4320 * 6.5, 1e-6, 'year-1 savings');
close(p.year1.billAfter, 0, 1e-6, 'year-1 bill after');
// Later years import the shortfall caused by degradation.
assert.ok(p.rows[10].imported > 0 && p.rows[10].exported === 0);
// Payback: 148,400 net at ~28,080/yr ≈ 5.3 years, reached in year 6.
assert.ok(p.payback > 5 && p.payback < 5.6, `payback ${p.payback}`);
assert.equal(p.paybackYear, 6);
assert.ok(p.irr > 15 && p.irr < 25, `irr ${p.irr}`);

// Net-metering export credit when generation exceeds use.
const surplus = computeProposal({ ...base, monthlyUnits: 200 });
close(surplus.year1.exportCredit, (4320 - 2400) * 2.25, 1e-6, 'export credit');
close(surplus.year1.billAfter, -(4320 - 2400) * 2.25, 1e-6, 'bill after becomes a credit');

// Bill entry converts at the tariff.
const byBill = computeProposal({ ...base, consumptionMode: 'bill', monthlyBill: 2340 });
close(byBill.consumptionMonthly, 360, 1e-6, 'bill → units');

// Loan: EMI page numbers and financed breakeven.
const loan = computeProposal({ ...base, paymentMethod: 'Bank Solar Loan', downPayment: 22640, loanAmount: 203760, loanRatePct: 7, loanTenureYears: 7 });
close(loan.loan.emi, emi(203760, 7, 84), 1e-9, 'EMI on the loan amount');
close(loan.loan.netMonthly1, loan.year1.savings / 12 - loan.loan.emi, 1e-9, 'net monthly cash-flow');
assert.equal(loan.loan.flows.length, 25);
assert.equal(loan.loan.flows[7].loanPaid, 0, 'no EMI after the tenure');
assert.ok(loan.loan.breakevenYear >= 1 && loan.loan.breakevenYear <= 25);
assert.equal(computeProposal(base).loan, null, 'cash customers have no loan section');

console.log('proposal calc tests passed');
