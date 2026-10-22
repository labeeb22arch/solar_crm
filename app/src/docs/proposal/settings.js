import { demoBrandText } from '../../lib/demoBranding.js';
// Proposal settings (app_state key 'proposal_settings'): defaults, merging and the builder's starting inputs.
// Every default below is a PLACEHOLDER until Solar CRM confirms it (the settings page shows a yellow banner until an
// Admin saves once). Prices are the Toolbox residential on-grid price list, used only as stand-ins.
import { subsidyFor, isLoanMethod } from './calc.js';

export const PACKAGE_SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLACEHOLDER_PRICES = { 2: 173600, 3: 226400, 4: 282200, 5: 342000, 6: 420800, 7: 475600, 8: 512400, 9: 563200, 10: 616000 };

export const DEFAULT_TERMS = [
  'Validity: This proposal is valid for {validity} days from the date of issue. Prices are subject to change after validity due to market fluctuations.',
  'Payment: As per the payment schedule in this proposal.',
  'Delivery: Material delivery within 10–15 working days from receipt of advance payment.',
  'Installation: System installation within 5–7 working days from material delivery, subject to site readiness.',
  'Warranty: All product warranties are directly from the respective manufacturers. Solar CRM will facilitate all claims.',
  'Subsidy: The PM Surya Ghar subsidy is paid by the Government directly into the customer\'s bank account. It depends on DISCOM approval and on the name on the electricity bill matching the bank account name.',
  'Force Majeure: Solar CRM shall not be liable for delays due to natural calamities, strikes, government orders or supply disruptions.',
  'Cancellation: Orders once confirmed cannot be cancelled. The advance amount is non-refundable after material procurement.',
  'Jurisdiction: Any disputes shall be subject to the exclusive jurisdiction of courts at Deesa, Gujarat.',
].join('\n');

export const DEFAULT_SETTINGS = {
  packages: PACKAGE_SIZES.map((kwp) => ({ kwp, price: PLACEHOLDER_PRICES[kwp] })),
  unitsPerKwMonth: 120,
  moduleMake: 'Adani / Vikram / Waaree',
  moduleModel: 'Mono PERC DCR',
  moduleWp: 540,
  inverterMake: 'Polycab / Growatt / Deye',
  structure: 'Module Mounting Structure (HDG/GI)',
  warrantyModulePerf: 30,
  warrantyModuleProduct: 12,
  warrantyInverter: 7,
  warrantyStructure: 10,
  warrantyWorkmanship: 5,
  gstRate: 5,
  gstNote: 'All prices are inclusive of GST. GST is charged at the rate applicable on the date of invoice.',
  tariff: 6.5,
  escalationPct: 3,
  exportRate: 2.25,
  degradationPct: 0.5,
  years: 25,
  loanRatePct: 7,
  loanTenureYears: 7,
  downPaymentPct: 10,
  milestones: [
    { label: 'Advance payment', pct: 80, note: 'To confirm the order and begin procurement' },
    { label: 'Final payment', pct: 20, note: 'Before dispatch of materials to site' },
  ],
  terms: DEFAULT_TERMS,
  validityDays: 15,
};
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
const NUM_KEYS = SETTING_KEYS.filter((k) => typeof DEFAULT_SETTINGS[k] === 'number');

/** Stored settings on top of the defaults; `placeholder` is true until an Admin has saved once. */
export function mergeSettings(stored = {}) {
  const s = { ...DEFAULT_SETTINGS };
  for (const k of SETTING_KEYS) if (stored[k] !== undefined && stored[k] !== null) s[k] = stored[k];
  for (const k of NUM_KEYS) { const v = Number(s[k]); s[k] = Number.isFinite(v) ? v : DEFAULT_SETTINGS[k]; }
  const byKwp = new Map((Array.isArray(s.packages) ? s.packages : []).map((p) => [Number(p.kwp), Number(p.price) || 0]));
  s.packages = PACKAGE_SIZES.map((kwp) => ({ kwp, price: byKwp.has(kwp) ? byKwp.get(kwp) : PLACEHOLDER_PRICES[kwp] }));
  s.milestones = (Array.isArray(s.milestones) ? s.milestones : DEFAULT_SETTINGS.milestones)
    .map((m) => ({ label: String(m.label || ''), pct: Number(m.pct) || 0, note: String(m.note || '') }));
  s.terms = demoBrandText(s.terms);
  return { ...s, placeholder: !stored.savedAt, savedAt: stored.savedAt || null, savedBy: stored.savedBy || null };
}

/** Clean an Admin's edits down to known keys and sane values before saving. */
export function cleanSettings(patch = {}) {
  const out = {};
  for (const k of SETTING_KEYS) {
    if (patch[k] === undefined) continue;
    if (NUM_KEYS.includes(k)) { const v = Number(patch[k]); if (Number.isFinite(v) && v >= 0) out[k] = v; continue; }
    if (k === 'packages') { out.packages = PACKAGE_SIZES.map((kwp) => ({ kwp, price: Math.max(0, Number((patch.packages.find((p) => Number(p.kwp) === kwp) || {}).price) || 0) })); continue; }
    if (k === 'milestones') { out.milestones = patch.milestones.filter((m) => String(m.label || '').trim()).map((m) => ({ label: String(m.label).trim(), pct: Math.max(0, Number(m.pct) || 0), note: String(m.note || '').trim() })); continue; }
    out[k] = String(patch[k] ?? '').trim();
  }
  return out;
}

export const packagePrice = (settings, kwp) => (settings.packages.find((p) => p.kwp === Number(kwp)) || {}).price || 0;
export const nearestPackage = (kwp) => PACKAGE_SIZES.reduce((best, s) => (Math.abs(s - kwp) < Math.abs(best - kwp) ? s : best), 3);

/** First draft of the builder's inputs: the customer's record plus the settings. Everything the pages print lives here. */
export function proposalInputs(p, settings) {
  const kwp = nearestPackage(Number(p.kwp) || 3);
  const price = packagePrice(settings, kwp);
  const down = Math.round((price * settings.downPaymentPct) / 100);
  return {
    kwp, price, subsidy: subsidyFor(kwp), subsidyAuto: true, gstRate: settings.gstRate, gstNote: settings.gstNote,
    consumptionMode: 'units', monthlyUnits: Math.round(kwp * settings.unitsPerKwMonth), monthlyBill: Math.round(kwp * settings.unitsPerKwMonth * settings.tariff),
    tariff: settings.tariff, escalationPct: settings.escalationPct, exportRate: settings.exportRate, degradationPct: settings.degradationPct,
    years: settings.years, unitsPerKwMonth: settings.unitsPerKwMonth,
    paymentMethod: p.paymentMethod || 'Online Transfer', bank: p.bank || '',
    downPayment: down, loanAmount: price - down, loanRatePct: settings.loanRatePct, loanTenureYears: settings.loanTenureYears,
    moduleMake: settings.moduleMake, moduleModel: settings.moduleModel, moduleWp: settings.moduleWp, inverterMake: settings.inverterMake, structure: settings.structure,
    warranties: {
      modulePerf: settings.warrantyModulePerf, moduleProduct: settings.warrantyModuleProduct, inverter: settings.warrantyInverter,
      structure: settings.warrantyStructure, workmanship: settings.warrantyWorkmanship,
    },
    milestones: settings.milestones.map((m) => ({ ...m })),
    terms: settings.terms,
    validityDays: settings.validityDays,
    customer: {
      name: p.name || '', address: p.address || '', city: p.city || '', phone: p.phone || '', discom: p.discom || '',
      consumerNo: p.consumerNo || '', crn: p.crn || '', type: p.type || 'Residential',
    },
  };
}

/** Recompute loan defaults after the price or payment method changes (keeps the user's rate and tenure). */
export function withLoanDefaults(inp, settings) {
  if (!isLoanMethod(inp.paymentMethod)) return inp;
  const down = Math.round((inp.price * settings.downPaymentPct) / 100);
  return { ...inp, downPayment: down, loanAmount: Math.max(0, inp.price - down) };
}

export const proposalNumber = (crn, version) => `PRP-${String(crn || '').replace(/\D/g, '')}-v${version}`;
