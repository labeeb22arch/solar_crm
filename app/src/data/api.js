import { createDemoExpansion, missingDemoRecords } from '../lib/demoExpansion.js';
import { changeCustomerDocument, changeCustomerResource, documentDefinition } from '../lib/customerDocuments.js';
import { currentStageTask } from '../lib/projectPipeline.js';
import {archiveCustomer,restoreArchivedCustomer} from '../lib/customerArchive.js';
import {documentInboxEntry} from '../lib/documentInbox.js';
import {cleanNameVerification} from '../lib/nameVerification.js';
import { paymentMilestones, cleanPaymentPlan } from '../lib/customerMilestones.js';
import { OPERATIONS_CATEGORIES, operationsOptions, changeOperationsOption } from '../lib/operationsLists.js';
import { documentTaskState, preparedDocumentKeys, DOCUMENT_TASKS } from '../lib/documentTask.js';
import { lastCustomerUpdate } from '../lib/customerUpdates.js';
import { indiaDay, cleanReceipt, expectedReceipts } from '../lib/receipts.js';
import { makeBOMVersion, changeBOMVersion } from '../lib/procurement.js';
import { TRACKING_STATUSES, trackingStatus, eligibleTracking, appendTracking, LOAN_DOCS } from '../lib/financeTracking.js';
import { documentRules, SCHEMES } from '../lib/documentRules.js';
import { nextStage,confirmedNextStage } from '../lib/stageProgress.js';
import { recordWarrantyIssue } from '../lib/warrantyIssues.js';
import { warrantyRecord, cleanWarranty } from '../lib/warranty.js';
import { changeDelivery, combineBOM } from '../lib/delivery.js';
import { installationInfo } from '../lib/installations.js';
// Data access layer. Every screen goes through these async functions.
// Works on an in-memory copy of the data. With Supabase configured (see remote.js) that copy is loaded from
// and saved to Supabase; otherwise it is kept in browser storage.
// Role scoping and permissions are enforced HERE (not only in the UI), so a hosted backend can mirror it with RLS.
import {
  generate, genActivity, genAttendance, itemsFor, SLOTS, TODAY, TRACKS, ITEM_LABELS, BRANCHES, DISCOMS, BANKS, PAY_METHODS,
  CPOS, CHANNEL_PARTNERS, DEALERS, TEAMS, TECHNICIANS, VENDORS, STAFF, OFFICE_USERS, INVENTORY, CITY_BRANCH, CITY_DISCOM, COMPANY,
} from './seed.js';
import { DEMO_ACCOUNTS } from './demoAccounts.js';
import * as remote from './remote.js';
import { STAGES, STAGE_IDS, stageById, stageIndex } from '../lib/stages.js';
import { trimToInk } from '../lib/cleanImage.js';
import { computeProposal, proposalTotals } from '../docs/proposal/calc.js';
import { mergeSettings, cleanSettings, proposalNumber } from '../docs/proposal/settings.js';
import { ROLES, ROLE_INFO, PARTNER_ROLES, FIELD_ROLES, PAGES, can, isReadOnly, pageAllowed } from '../lib/access.js';

const PREFIX = 'sunpay.final.';
const DB_KEY = PREFIX + 'db';
const DB_VERSION = 8; // 8: installs never run ahead of booking, advance or loan paperwork
const DAY = 86400000;
const T0 = new Date(TODAY + 'T10:00:00').getTime();

let db = null;
const DEFAULT_SESSION = { role: 'Admin', branch: 'All', officeId: 'OS-MAIN', cpoId: 'CPO-1', cpId: 'CP-01', dealerId: 'DL-01', teamId: 'T-A', technician: TECHNICIANS[0] };
let session = { ...DEFAULT_SESSION };
const listeners = new Set();

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (v) => { if (!v) return ''; const d = new Date(v.length === 10 ? v + 'T10:00:00' : v); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const keyPlus = (n) => dayKey(new Date(T0 + n * DAY).toISOString());
const TOMORROW = keyPlus(1);
const daysSince = (isoStr) => (isoStr ? Math.max(0, Math.round((new Date(dayKey(TODAY) + 'T10:00:00') - new Date(dayKey(isoStr) + 'T10:00:00')) / DAY)) : 0);
const daysUntil = (isoStr) => Math.round((new Date(dayKey(isoStr) + 'T10:00:00') - new Date(TODAY + 'T10:00:00')) / DAY);
const fd = (v) => (v ? new Date(v.length === 10 ? v + 'T10:00:00' : v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** Plain date words: "Today", "Tomorrow", "Yesterday", "in 4 days", "3 days ago". */
export function when(v) {
  if (!v) return '—';
  const d = daysUntil(v);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d <= 6) return `in ${d} days`;
  if (d < -1 && d >= -6) return `${-d} days ago`;
  return fd(v);
}
const isoAt = (daysAgo) => new Date(T0 - daysAgo * DAY).toISOString();

// ---------- load / calibrate ----------
function freshDb() {
  const projects = calibrate(generate());
  return {
    v: DB_VERSION, projects, activity: genActivity(projects), attendance: genAttendance(),
    inventory: INVENTORY.map((x) => ({ ...x })), views: null, recent: {}, seq: projects.length, company_assets: {}, proposal_settings: {},
  };
}
const RECENT_KEY = PREFIX + 'recent';
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '{}'); } catch { return {}; } };

/**
 * Start-up. Without Supabase settings: browser storage with the demo sign-in.
 * With Supabase: restores the signed-in user (if any), reads their profile for role/branch, then loads the data.
 * Nothing is loaded before sign-in, and nothing falls back to local demo data, so real data never mixes with fake.
 */
export async function init() {
  if (!remote.enabled) { load(); return { mode: 'local' }; }
  remote.onRecovery(() => { recovery = true; listeners.forEach((fn) => fn()); });
  if (isPublicRoute()) return { mode: 'public' };
  // One quiet retry: a brief network drop at start-up should not show the error screen.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const s = await remote.getAuthSession();
      if (s) await startSession(s.user);
      bootError = '';
      break;
    } catch (e) {
      bootError = e.message;
      if (attempt === 0 && /fetch|network|timed? ?out/i.test(e.message)) await new Promise((r) => setTimeout(r, 1500)); else break;
    }
  }
  return { mode: 'cloud' };
}
const isPublicRoute = () => /^#\/sign\//.test(location.hash);
let recovery = false;
let bootError = '';
let dataReady = !remote.enabled;
let watching = null;

/** Turns a Supabase login into an app session: role, branch, crew or partner office come from the profile. */
async function startSession(user) {
  const prof = await remote.myProfile(user.id);
  if (!prof || !prof.active || prof.role === 'Pending') {
    await remote.signOut();
    throw new Error(prof ? 'Your account is not active yet. Ask an Admin to activate it.' : 'This account has no profile yet. Ask an Admin.');
  }
  auth = { id: user.id, email: user.email, name: prof.name || user.email, role: prof.role };
  session = normalize({ ...DEFAULT_SESSION, ...sessionFromProfile(prof) });
  try { localStorage.setItem(PREFIX + 'session', JSON.stringify(session)); } catch { /* */ }
  await loadCloud();
  bootError = '';
  listeners.forEach((fn) => fn());
}
function sessionFromProfile(prof) {
  const out = { role: prof.role, branch: 'All' };
  if (prof.role === 'Office Staff') {
    out.branch = BRANCHES.includes(prof.branch) ? prof.branch : 'Main Office';
    out.officeId = (OFFICE_USERS.find((u) => u.branches[0] === out.branch) || OFFICE_USERS[0]).id;
  }
  if (prof.role === 'Installation Team') out.teamId = TEAMS.some((t) => t.id === prof.team) ? prof.team : TEAMS[0].id;
  if (prof.role === 'CPO') out.cpoId = CPOS.some((c) => c.id === prof.cpo_id) ? prof.cpo_id : CPOS[0].id;
  if (prof.role === 'CP') out.cpId = prof.cp_id || '';
  if (prof.role === 'Dealer') out.dealerId = prof.dealer_id || '';
  if (prof.role === 'Technician') out.technician = prof.technician || prof.name || '';
  return out;
}
async function loadCloud() {
  dataReady = false;
  const got = await remote.fetchAll();
  // Only an Admin (who sees every row) may treat an empty result as an empty database and upload demo data.
  // A partner or crew with no customers yet simply gets an empty list.
  if (!got.projects.length && auth?.role === 'Admin' && !(await remote.hasAnyProject())) {
    db = freshDb();
    db.recent = loadRecent();
    await remote.seed(db);
  } else {
    db = {
      v: DB_VERSION, projects: got.projects, activity: got.activity,
      delivery_batches: got.state.delivery_batches || [],
      attendance: got.state.attendance || genAttendance(), inventory: got.state.inventory || INVENTORY.map((x) => ({ ...x })),
      views: got.state.views || null, recent: loadRecent(), seq: got.projects.length,
      company_assets: got.state.company_assets || {},
      proposal_settings: got.state.proposal_settings || {},
      operations_settings: got.state.operations_settings || {brands:[],models:[],registrations:[]},
    };
    if (Array.isArray(db.views) && !db.views.length) db.views = null;
    await remote.fillMissingState(db, Object.keys(got.state));
    remote.markSynced(db);
    remote.ready();
  }
  if (!watching) {
    watching = remote.watchProjects((p) => {
      if (!db) return;
      const i = db.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) db.projects[i] = p; else db.projects.push(p);
      listeners.forEach((fn) => fn());
    });
  }
  dataReady = true;
}
export async function retryStart() {
  bootError = '';
  listeners.forEach((fn) => fn());
  try { const s = await remote.getAuthSession(); if (s) await startSession(s.user); } catch (e) { bootError = e.message; }
  listeners.forEach((fn) => fn());
}
const cloud = () => remote.enabled;

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (parsed.v === DB_VERSION) { db = parsed; if (!db.company_assets) db.company_assets = {}; if (!db.proposal_settings) db.proposal_settings = {}; return db; } }
  } catch { /* ignore */ }
  db = freshDb();
  persist(false);
  return db;
}
function setPartner(p, cp, dealer) {
  p.cp = cp; p.dealer = dealer;
  const keys = itemsFor(p).closure;
  p.tracks.closure = keys.map((k) => p.tracks.closure.find((x) => x.key === k) || { key: k, label: ITEM_LABELS[k], status: 'not_started', updatedAt: null });
}
function calibrate(projects) {
  const it = (p, t, k) => p.tracks[t].find((x) => x.key === k);
  const at = isoAt;
  const setSeq = (p, t, upto, status, ago) => {
    const keys = p.tracks[t];
    const idx = keys.findIndex((x) => x.key === upto);
    keys.forEach((x, i) => {
      if (i < idx) { if (x.status !== 'done') { x.status = 'done'; x.updatedAt = at(ago + (idx - i) * 2); } }
      else if (i === idx) { x.status = status; x.updatedAt = at(ago); }
      else { x.status = 'not_started'; x.updatedAt = null; }
    });
  };
  // 1) Quotations awaiting approval: 14 young projects, plus 3 with changes requested.
  const young = projects.filter((p) => p.ageDays <= 40 && p.ageDays >= 3).sort((a, b) => a.ageDays - b.ageDays);
  young.slice(0, 17).forEach((p, n) => {
    const ago = Math.min(p.ageDays - 1, 1 + (n * 3) % 19);
    setSeq(p, 'sales', 'quotation', n < 14 ? 'waiting_customer' : 'in_progress', ago);
    for (const t of ['supply', 'grid', 'closure']) p.tracks[t].forEach((x) => { x.status = 'not_started'; x.updatedAt = null; });
    p.tracks.finance.forEach((x, i) => { if (i > 0) { x.status = 'not_started'; x.updatedAt = null; } });
    p.payments = []; p.reminders = []; p.subsidy = []; p.installDate = null; p.agreement = null;
    if (n % 3 === 1) setPartner(p, 'CP-01', n % 2 ? 'DL-01' : null);
    const sentAt = at(ago);
    p.quotation = { status: n < 14 ? (n % 3 === 0 ? 'sent' : 'viewed') : 'changes_requested', sentAt, version: 1 + (n % 2) };
    p.timeline = p.timeline.filter((e) => !e.track || e.track === 'sales').filter((e) => e.type !== 'payment' && !(e.type === 'whatsapp' && /Quotation|Approved|reminder/i.test(e.text)));
    p.timeline.push({ type: 'whatsapp', dir: 'out', at: sentAt, by: 'Office desk', text: `Quotation v${p.quotation.version} for ${p.kwp} kWp sent for approval. Tap "Approve" to confirm.` });
    if (n >= 14) p.timeline.push({ type: 'whatsapp', dir: 'in', at: new Date(new Date(sentAt).getTime() + 4 * 3600000).toISOString(), by: p.name, text: ['Can you reduce the price a little? Neighbour got a lower rate.', 'Please change inverter brand and resend.', 'I want 1 kW more, please revise.'][n - 14] });
    p.timeline.sort((a, b) => a.at.localeCompare(b.at));
  });
  const quoted = new Set(young.slice(0, 17).map((p) => p.id));
  const rest = projects.filter((p) => !quoted.has(p.id));
  rest.forEach((p) => { if (p.quotation && p.quotation.status !== 'approved') { p.quotation.status = 'approved'; const q = it(p, 'sales', 'quotation'); q.status = 'done'; if (it(p, 'sales', 'agreement').status === 'not_started') { it(p, 'sales', 'agreement').status = 'waiting_customer'; it(p, 'sales', 'agreement').updatedAt = q.updatedAt; p.agreement = { status: 'sent', at: q.updatedAt }; } } });
  // 2) Agreements awaiting signature: keep 7 (+3 signed today -> "new confirmed clients today").
  const sent = rest.filter((p) => p.agreement && p.agreement.status === 'sent');
  sent.slice(0, 2).forEach((p) => setPartner(p, 'CP-01', null));
  sent.slice(7, 10).forEach((p, n) => {
    p.agreement = { status: 'signed', at: at(0) }; const ag = it(p, 'sales', 'agreement'); ag.status = 'done'; ag.updatedAt = at(0);
    const st = it(p, 'sales', 'stamp'); st.status = 'in_progress'; st.updatedAt = at(0);
    p.timeline.push({ type: 'status', at: new Date(T0 - (n + 1) * 1800000).toISOString(), by: 'System', text: 'Agreement signed by link — done', track: 'sales' });
  });
  sent.slice(10).forEach((p) => {
    p.agreement = { status: 'signed', at: it(p, 'sales', 'agreement').updatedAt || at(5) }; it(p, 'sales', 'agreement').status = 'done';
    const st = it(p, 'sales', 'stamp'); if (st.status !== 'done') { st.status = 'done'; st.updatedAt = at(3); }
  });
  // 3) Name mismatches: 6 open.
  const variants = (n) => { const w = n.split(' '); return w.length === 3 ? [`${w[0]}bhai ${w[1][0]} ${w[2]}`, `${w[2]} ${w[0]} ${w[1]}`] : null; };
  let open = rest.filter((p) => !p.nameCheck.match && !p.nameCheck.resolution);
  rest.filter((p) => p.type === 'Residential' && p.nameCheck.match && it(p, 'grid', 'discom_docs').status !== 'not_started' && it(p, 'grid', 'submission').status !== 'done')
    .slice(0, Math.max(0, 6 - open.length)).forEach((p, n) => {
      const v = variants(p.name); if (!v) return;
      p.nameCheck = { ...p.nameCheck, discomName: v[0], bankName: n % 2 ? v[1] : p.name, match: false, resolution: null };
      const nc = it(p, 'grid', 'name_check'); nc.status = 'blocked'; nc.updatedAt = at(4 + n * 9);
    });
  open = rest.filter((p) => !p.nameCheck.match && !p.nameCheck.resolution);
  open.slice(6).forEach((p) => { p.nameCheck.resolution = 'Accepted as same person'; const nc = it(p, 'grid', 'name_check'); if (nc.status !== 'not_started') nc.status = 'done'; });
  // 4) Loan agreements: 4 waiting.
  const loans = rest.filter((p) => p.loan);
  let waiting = loans.filter((p) => ['waiting_customer', 'in_progress', 'blocked', 'waiting_third'].includes(it(p, 'finance', 'loan_agreement').status));
  loans.filter((p) => !waiting.includes(p) && it(p, 'sales', 'agreement').status === 'done' && it(p, 'finance', 'loan_agreement').status === 'not_started')
    .slice(0, Math.max(0, 4 - waiting.length)).forEach((p, n) => setSeq(p, 'finance', 'loan_agreement', 'waiting_customer', 2 + n * 5));
  waiting = loans.filter((p) => ['waiting_customer', 'in_progress', 'blocked', 'waiting_third'].includes(it(p, 'finance', 'loan_agreement').status));
  waiting.slice(4).forEach((p) => { it(p, 'finance', 'loan_agreement').status = 'done'; });
  // 5) Subsidy stuck > 30 days: 3.
  const stuck = rest.filter((p) => p.subsidy.length && p.subsidy[p.subsidy.length - 1].status.startsWith('Applied') && daysSince(p.subsidy[p.subsidy.length - 1].at) > 30);
  stuck.slice(3).forEach((p) => p.subsidy.push({ status: 'Approved by DISCOM', at: at(6) }));
  // 6) Installs today: 9 (2 of them already completed today), 3 tomorrow.
  let todays = rest.filter((p) => p.installDate === TODAY && it(p, 'supply', 'installation').status !== 'done');
  const pool = [
    ...rest.filter((p) => it(p, 'supply', 'installation').status === 'in_progress' && p.installDate !== TODAY),
    ...rest.filter((p) => it(p, 'supply', 'installation').status === 'not_started' && it(p, 'supply', 'bom').status === 'done' && p.tracks.sales.every((x) => x.status === 'done')),
  ];
  pool.slice(0, Math.max(0, 9 - todays.length)).forEach((p) => { setSeq(p, 'supply', 'installation', 'in_progress', 0); p.installDate = TODAY; });
  todays = rest.filter((p) => p.installDate === TODAY && it(p, 'supply', 'installation').status !== 'done');
  todays.slice(9).forEach((p) => { p.installDate = keyPlus(2); });
  todays.slice(7, 9).forEach((p) => { const x = it(p, 'supply', 'installation'); x.status = 'done'; x.updatedAt = at(0); const s = it(p, 'supply', 'serials'); s.status = 'in_progress'; s.updatedAt = at(0); p.timeline.push({ type: 'status', at: at(0), by: 'System', text: 'Installation — done', track: 'supply' }); });
  const upcoming = rest.filter((p) => it(p, 'supply', 'installation').status === 'not_started' && it(p, 'sales', 'agreement').status === 'done' && !p.installDate);
  upcoming.slice(0, 8).forEach((p, n) => { setSeq(p, 'supply', 'installation', 'in_progress', 1); p.installDate = keyPlus(n < 3 ? 1 : n - 1); });
  // Two quotations approved today (also "new confirmed clients today").
  young.slice(12, 14).forEach((p) => { p.quotation.status = 'approved'; const q = it(p, 'sales', 'quotation'); q.status = 'done'; q.updatedAt = at(0); const ag = it(p, 'sales', 'agreement'); ag.status = 'waiting_customer'; ag.updatedAt = at(0); p.agreement = { status: 'sent', at: at(0) }; p.timeline.push({ type: 'whatsapp', dir: 'in', at: at(0), by: p.name, text: 'Approved ✅' }); });
  // 7) Payment reminders: keep ~22 overdue, settle the rest; 2 received today.
  const overdue = rest.filter((p) => dueNow(p) > 0);
  overdue.slice(22).forEach((p) => { const d = dueNow(p); p.payments.push({ date: at(2 + (d % 20)), amount: d, mode: p.paymentMethod.includes('Loan') ? 'Online Transfer' : p.paymentMethod, ref: 'TX' + (40000 + d % 50000) }); p.timeline.push({ type: 'payment', at: at(2 + (d % 20)), by: 'Finance desk', text: `₹${d.toLocaleString('en-IN')} received` }); });
  overdue.slice(0, 2).forEach((p) => { const d = dueNow(p); p.payments.push({ date: at(0), amount: d, mode: 'Online Transfer', ref: 'TX' + (70000 + d % 9000) }); p.timeline.push({ type: 'payment', at: at(0), by: 'Finance desk', text: `₹${d.toLocaleString('en-IN')} received · Online Transfer` }); });
  // 8) The steps above schedule installs by quota; make sure nobody is installed or scheduled while booking,
  //    advance or loan paperwork is still open, so the status sentences never contradict the install board.
  const READY_FINANCE = ['method', 'loan_docs', 'sanction', 'loan_agreement', 'advance'];
  projects.forEach((p) => {
    const inst = it(p, 'supply', 'installation');
    if (inst.status === 'not_started') return;
    const ref = Math.min(Date.now(), new Date(inst.updatedAt || Date.now()).getTime());
    const close = (x, n) => { if (x.status !== 'done') { x.status = 'done'; x.updatedAt = new Date(ref - (n + 2) * 86400000).toISOString(); } };
    p.tracks.sales.forEach((x, n, a) => close(x, a.length - n + 3));
    p.tracks.finance.filter((x) => READY_FINANCE.includes(x.key)).forEach((x, n, a) => close(x, a.length - n));
    p.tracks.supply.slice(0, p.tracks.supply.findIndex((x) => x.key === 'installation')).forEach((x, n, a) => close(x, a.length - n - 1));
    if (p.quotation) p.quotation.status = 'approved'; else p.quotation = { status: 'approved', sentAt: it(p, 'sales', 'quotation').updatedAt, version: 1 };
    p.agreement = { status: 'signed', at: it(p, 'sales', 'agreement').updatedAt };
    if (!p.payments.length) p.payments.push({ date: it(p, 'finance', 'advance').updatedAt, amount: p.schedule[0].amount, mode: p.paymentMethod.includes('Loan') ? 'Online Transfer' : p.paymentMethod, ref: 'TX' + (30000 + p.schedule[0].amount % 60000) });
  });
  return projects;
}

function persist(notify = true) {
  if (cloud()) {
    remote.scheduleSave(db);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(db.recent || {})); } catch { /* */ }
  } else {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* quota */ }
  }
  if (notify) listeners.forEach((fn) => fn());
}
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 0));
const clone = (v) => JSON.parse(JSON.stringify(v));
const nowIso = () => new Date().toISOString();   // real time for every new entry

// ---------- session ----------
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getSession() { return { ...session, user: auth, ready: dataReady, recovery, bootError, cloud: remote.enabled }; }

// ---------- sign-in ----------
// With Supabase: real email + password accounts (see remote.js). Without it: the demo email-only sign-in.
const AUTH_KEY = 'sunpay.app.session';
let auth = null;
if (!remote.enabled) { try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { auth = null; } }
const cleanEmail = (email) => String(email || '').trim().toLowerCase().replace(/[.,;\s]+$/, '');
export async function signIn(email, password) {
  const e = cleanEmail(email);
  if (remote.enabled) {
    let s;
    try { s = await remote.signInWithPassword(e, String(password || '')); } catch (x) {
      const m = /invalid login/i.test(x.message) ? 'Email or password is incorrect' : /not confirmed/i.test(x.message) ? 'Please confirm your email first (check your inbox)' : x.message;
      throw new Error(m);
    }
    await startSession(s.user);
    return { ...auth };
  }
  // Forgive easy typing slips: spaces, capitals and a trailing full stop or comma ("1@crm.").
  const acc = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e);
  if (!acc) { const err = new Error('We don\'t recognise that email'); err.code = 'bad_credentials'; throw err; }
  auth = { email: acc.email, name: acc.name, role: acc.role, at: new Date().toISOString() };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch { /* */ }
  setSession({ role: acc.role, branch: 'All' });
  return delay({ ...auth });
}
export async function signOut() {
  auth = null;
  if (remote.enabled) {
    await remote.signOut().catch(() => {});
    db = null; dataReady = false;
  } else {
    try { localStorage.removeItem(AUTH_KEY); } catch { /* */ }
  }
  listeners.forEach((fn) => fn());
}
export const passwordSignIn = () => remote.enabled;
export const sendPasswordReset = (email) => remote.sendPasswordReset(cleanEmail(email));
export async function hasAdmin() { return remote.enabled ? remote.hasAdmin() : true; }
export async function createFirstAdmin(form) {
  const r = await remote.createFirstAdmin({ name: String(form.name || '').trim(), email: cleanEmail(form.email), password: form.password });
  if (r.session) await startSession(r.session.user);
  return r;
}
/** After following a reset link: saves the new password, then continues into the app. */
export async function finishPasswordReset(password) {
  await remote.setOwnPassword(password);
  recovery = false;
  try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* */ }
  const s = await remote.getAuthSession();
  if (s) await startSession(s.user);
  listeners.forEach((fn) => fn());
}
/** Admin may preview other roles; everyone else always works as their own role. */
export const canPreviewRoles = () => !remote.enabled || auth?.role === 'Admin';
export const realRole = () => auth?.role || session.role;

function normalize(s) {
  const n = { ...DEFAULT_SESSION, ...s };
  if (!ROLES.includes(n.role)) n.role = 'Admin';
  if (n.role === 'Office Staff') {
    const u = OFFICE_USERS.find((o) => o.id === n.officeId) || OFFICE_USERS[0];
    n.officeId = u.id;
    if (!u.branches.includes(n.branch)) n.branch = u.branches[0];
  } else if (n.role === 'Admin' || n.role === 'Finance') {
    if (n.branch !== 'All' && !BRANCHES.includes(n.branch)) n.branch = 'All';
  } else n.branch = 'All';
  return n;
}
export function setSession(patch) {
  const roleChanged = patch.role && patch.role !== session.role;
  session = normalize({ ...session, ...(roleChanged && !patch.branch ? { branch: 'All' } : {}), ...patch });
  try { localStorage.setItem(PREFIX + 'session', JSON.stringify(session)); } catch { /* */ }
  listeners.forEach((fn) => fn());
}
try { const s = JSON.parse(localStorage.getItem(PREFIX + 'session') || 'null'); if (s) session = normalize(s); } catch { /* */ }

export { ROLES, ROLE_INFO, PAGES };
export const canDo = (cap, role = session.role) => can(role, cap);
export function canWrite(role = session.role) { return !isReadOnly(role); }
export const meta = { STAGES, COMPANY, CITIES: Object.keys(CITY_BRANCH), TODAY, TOMORROW, TRACKS, ITEM_LABELS, BRANCHES, DISCOMS, BANKS, PAY_METHODS, CPOS, CHANNEL_PARTNERS, DEALERS, TEAMS, TECHNICIANS, VENDORS, OFFICE_USERS };
export function officeUser(s = session) { return OFFICE_USERS.find((o) => o.id === s.officeId) || OFFICE_USERS[0]; }
export function branchOptions(s = session) {
  if (s.role === 'Admin' || s.role === 'Finance') return ['All', ...BRANCHES];
  if (s.role === 'Office Staff') return officeUser(s).branches;
  return [];
}
export function identityLabel(s = session) {
  switch (s.role) {
    case 'Office Staff': return officeUser(s).name.replace('Office desk · ', '') + (s.branch && officeUser(s).branches.length > 1 ? ` · viewing ${s.branch}` : '');
    case 'CPO': return CPOS.find((c) => c.id === s.cpoId)?.name;
    case 'CP': return CHANNEL_PARTNERS.find((c) => c.id === s.cpId)?.name;
    case 'Dealer': return DEALERS.find((d) => d.id === s.dealerId)?.name;
    case 'Technician': return s.technician;
    case 'Installation Team': { const t = TEAMS.find((x) => x.id === s.teamId); return t ? `${t.name} (${t.kind})` : ''; }
    case 'Stamp Staff': return 'Stamp desk';
    default: return s.branch === 'All' ? 'All branches' : s.branch;
  }
}

// ---------- helpers ----------
export const URGENCY = { blocked: 5, waiting_customer: 4, waiting_third: 3, in_progress: 2, not_started: 1, done: 0 };
export const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', waiting_customer: 'Waiting on customer', waiting_third: 'Waiting on others', blocked: 'Stuck', done: 'Done' };
const COMMISSION_KEYS = ['cp_comm', 'dealer_comm', 'inst_comm', 'vendor_comm'];
const find = (id) => load().projects.find((p) => p.id === id || p.crn === id);
const item = (p, t, k) => p.tracks[t].find((x) => x.key === k);
const cpOf = (id) => CHANNEL_PARTNERS.find((c) => c.id === id);
const dealerOf = (id) => DEALERS.find((d) => d.id === id);
export function paid(p) { return p.payments.reduce((s, x) => s + x.amount, 0); }
function dueMilestones(p) {
  const out = [];
  if (item(p, 'sales', 'agreement').status === 'done') out.push(p.schedule[0]);
  if (item(p, 'supply', 'installation').status === 'done') out.push(p.schedule[1]);
  if (item(p, 'grid', 'commissioning').status === 'done') out.push(p.schedule[2]);
  return out;
}
export function dueNow(p) { return Math.max(0, dueMilestones(p).reduce((s, x) => s + x.amount, 0) - paid(p)); }
export function trackProgress(p, t, hidden = []) {
  const items = p.tracks[t].filter((x) => !hidden.includes(x.key));
  const done = items.filter((x) => x.status === 'done').length;
  const open = items.filter((x) => x.status !== 'done' && x.status !== 'not_started');
  const worst = [...open].sort((a, b) => URGENCY[b.status] - URGENCY[a.status])[0];
  return { done, total: items.length, pct: items.length ? done / items.length : 1, worst: worst ? worst.status : done === items.length ? 'done' : 'not_started', current: worst || items.find((x) => x.status !== 'done') || null };
}
export function openItems(p, hidden = []) {
  const out = [];
  for (const t of TRACKS) for (const it of p.tracks[t.key]) if (!hidden.includes(it.key) && it.status !== 'done' && it.status !== 'not_started') out.push({ ...it, track: t.key, age: daysSince(it.updatedAt) });
  for (const t of TRACKS) { const n = p.tracks[t.key].find((x) => x.status === 'not_started' && !hidden.includes(x.key)); if (n && !out.some((o) => o.track === t.key)) out.push({ ...n, track: t.key, age: 0 }); }
  return out.sort((a, b) => URGENCY[b.status] - URGENCY[a.status] || b.age - a.age);
}
/** Items a role must not see (internal cost / other parties' commission). */
// Sunpay uses customer signatures; legacy stamp-paper tasks stay stored but are not part of its workflow.
function hiddenFor(role = session.role) {
  return ['stamp', ...roleHiddenFor(role)];
}
function roleHiddenFor(role = session.role) {
  if (role === 'CPO') return ['inst_comm', 'vendor_comm'];
  if (role === 'CP') return ['dealer_comm', 'inst_comm', 'vendor_comm'];
  if (role === 'Dealer') return ['cp_comm', 'inst_comm', 'vendor_comm'];
  if (FIELD_ROLES.includes(role) || role === 'Stamp Staff') return COMMISSION_KEYS;
  return ['vendor_comm'];   // vendor commission was dropped; older customers may still carry the item
}

// ---------- plain-English status: sentence, next step, milestones ----------
// owner: who usually acts. sla: days an item may sit in its state before it is late.
const META = {
  enquiry: { sla: 2, own: 'sales', do: 'Call the customer and book a site survey', wc: 'the customer to reply to the enquiry' },
  survey: { sla: 5, own: 'tech', do: 'Do the site survey', wc: 'the customer to confirm a survey date', wt: 'a survey slot' },
  feasibility: { sla: 3, own: 'tech', do: 'Upload the feasibility report' },
  quotation: { sla: 3, own: 'sales', do: 'Follow up on the quotation on WhatsApp', wc: 'the customer to approve the quotation', ip: 'Quotation being revised' },
  proposal: { sla: 5, own: 'sales', do: 'Send the commercial proposal', wc: 'the customer to accept the proposal' },
  agreement: { sla: 4, own: 'sales', do: 'Get the agreement signed (sign-by-link)', wc: 'the customer to sign the agreement' },
  stamp: { sla: 2, own: 'stamp', do: 'Prepare stamp paper', ip: 'Stamp paper being prepared' },
  method: { sla: 2, own: 'finance', do: 'Confirm how the customer will pay', wc: 'the customer to choose a payment method' },
  loan_docs: { sla: 5, own: 'customer', do: 'Collect loan documents from the customer', wc: 'the customer to share loan documents' },
  sanction: { sla: 10, own: 'bank', do: 'Chase {bank} for the loan sanction', wt: '{bank} loan sanction' },
  loan_agreement: { sla: 4, own: 'customer', do: 'Get the {bank} loan agreement signed', wc: 'the customer to sign the {bank} loan agreement' },
  disbursement: { sla: 7, own: 'bank', do: 'Chase {bank} to release the loan money', wt: '{bank} to release the loan money' },
  advance: { sla: 7, own: 'finance', do: 'Collect the advance payment', wc: 'the advance payment' },
  balance: { sla: 10, own: 'finance', do: 'Collect the balance payment', wc: 'the balance payment' },
  subsidy: { sla: 30, own: 'finance', do: 'Follow up the subsidy on the national portal', wt: 'the government subsidy' },
  bom: { sla: 3, own: 'stores', do: 'Prepare the bill of materials' },
  reservation: { sla: 2, own: 'stores', do: 'Reserve stock for this job', wt: 'stock from the vendor' },
  challan: { sla: 2, own: 'stores', do: 'Issue the delivery challan' },
  tally: { sla: 1, own: 'team', do: 'Complete the truck tally checklist' },
  team: { sla: 2, own: 'ops', do: 'Assign an installation team' },
  installation: { sla: 3, own: 'team', do: 'Complete the installation', wc: 'the customer to give roof access', ip: 'Installation scheduled' },
  serials: { sla: 2, own: 'team', do: 'Scan module and inverter serial numbers' },
  discom_docs: { sla: 4, own: 'grid', do: 'Prepare the DISCOM documents', wc: 'customer documents for the DISCOM' },
  name_check: { sla: 3, own: 'grid', do: 'Fix the name mismatch (electricity bill vs bank)', wc: 'the customer to correct the name on bill or bank', bl: 'name on electricity bill does not match bank account' },
  submission: { sla: 3, own: 'grid', do: 'Submit the file to {discom}', wt: '{discom} to accept the file' },
  inspection: { sla: 15, own: 'grid', do: 'Chase {discom} for the inspection date', wt: '{discom} inspection' },
  net_meter: { sla: 10, own: 'grid', do: 'Chase {discom} to install the net meter', wt: '{discom} net meter' },
  commissioning: { sla: 5, own: 'grid', do: 'Get the commissioning certificate', wt: '{discom} commissioning' },
  payout: { sla: 7, own: 'accounts', do: 'Clear the final payout' },
  invoice: { sla: 3, own: 'accounts', do: 'Raise the final invoice' },
  cp_comm: { sla: 15, own: 'accounts', do: 'Pay channel partner commission' },
  dealer_comm: { sla: 15, own: 'accounts', do: 'Pay dealer commission' },
  inst_comm: { sla: 15, own: 'accounts', do: 'Pay installation commission' },
  vendor_comm: { sla: 15, own: 'accounts', do: 'Settle vendor commission' },
  warranty: { sla: 7, own: 'ops', do: 'Register the warranty' },
};
function ownerName(p, own) {
  switch (own) {
    case 'sales': return p.dealer ? dealerOf(p.dealer).name : p.cp ? cpOf(p.cp).name : 'Sales desk';
    case 'tech': return p.technician;
    case 'stamp': return 'Stamp desk';
    case 'finance': return 'Finance desk';
    case 'customer': return 'Customer (office follows up)';
    case 'bank': return p.bank + ' (office follows up)';
    case 'stores': return 'Stores';
    case 'team': return TEAMS.find((t) => t.id === p.team)?.name || 'Install team';
    case 'grid': return 'DISCOM desk';
    case 'accounts': return 'Accounts';
    default: return 'Office desk';
  }
}
const fill = (s, p) => s.replace('{bank}', p.bank).replace('{discom}', p.discom);
const lc = (s) => (/^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

const MILESTONES = [
  { key: 'booked', label: 'Booked', typ: 20 },
  { key: 'finance', label: 'Finance ready', typ: 45 },
  { key: 'installed', label: 'Installed', typ: 60 },
  { key: 'grid', label: 'Grid connected', typ: 95 },
  { key: 'subsidy', label: 'Subsidy received', typ: 130 },
  { key: 'closed', label: 'Closed', typ: 150 },
];
export const MILESTONE_LABELS = MILESTONES.map((m) => m.label);
function milestones(p) {
  const done = (t, k) => { const x = item(p, t, k); return x && x.status === 'done' ? (x.updatedAt || p.createdAt) : null; };
  const max = (...a) => a.filter(Boolean).sort().slice(-1)[0];
  const loan = !!p.loan;
  const closureAll = p.tracks.closure.every((x) => x.status === 'done');
  const reached = {
    booked: done('sales', 'agreement'),
    finance: done('finance', 'advance') && (!loan || done('finance', 'disbursement')) ? max(done('finance', 'advance'), loan && done('finance', 'disbursement')) : null,
    installed: done('supply', 'installation'),
    grid: done('grid', 'commissioning'),
    subsidy: p.type !== 'Residential' ? 'n/a' : done('finance', 'subsidy'),
    closed: closureAll ? max(...p.tracks.closure.map((x) => x.updatedAt)) : null,
  };
  let prevDate = p.createdAt; let prevTyp = 0;
  return MILESTONES.map((m) => {
    const r = reached[m.key];
    if (r === 'n/a') return { key: m.key, label: m.label, na: true };
    if (r) { prevDate = r; prevTyp = m.typ; return { key: m.key, label: m.label, reached: true, date: r }; }
    const exp = new Date(new Date(prevDate).getTime() + (m.typ - prevTyp) * DAY).toISOString();
    prevDate = exp; prevTyp = m.typ;
    const late = daysUntil(exp) < 0;
    return { key: m.key, label: m.label, reached: false, expected: late ? null : exp, lateBy: late ? -daysUntil(exp) : 0 };
  });
}
// ---------- project stage (the 11 stages in lib/stages.js) ----------
// A customer's stage is set by staff ("Move to stage"). Customers that were never moved get a starting stage
// worked out from their checklist, so imported or demo data lands somewhere sensible.
function deriveStage(p) {
  const st = (t, k) => item(p, t, k)?.status;
  const done = (t, k) => !item(p, t, k) || st(t, k) === 'done';
  if (!p.tracks.sales.every((x) => x.status === 'done')) return 'leads';
  if (!p.tracks.finance.filter((x) => ['method', 'loan_docs', 'sanction', 'loan_agreement', 'advance'].includes(x.key)).every((x) => x.status === 'done')) return 'pending_loans';
  // Not installed, and the visit is not booked within the next two days → material is still being procured.
  if (!done('supply', 'installation') && (!p.installDate || daysUntil(p.installDate) > 2)) return 'material_procurement';
  if (!done('supply', 'installation')) return 'pending_installation';
  if (!done('grid', 'discom_docs')) return 'post_installation_docs';
  if (!done('grid', 'submission')) return 'discom_submissions';
  if (!done('grid', 'net_meter')) return 'meter_installation';
  if (!done('grid', 'commissioning')) return 'system_commissioning';
  // Grid-connected but the job is not closed yet: commissioning paperwork, meter flag or DISCOM inspection.
  if (!p.tracks.closure.filter((x) => x.key !== 'vendor_comm').every((x) => x.status === 'done')) return ['system_commissioning', 'meter_flag', 'discom_inspection'][Number(String(p.id).slice(-1)) % 3];
  return 'completed';
}
const stageOf = (p) => (STAGE_IDS.includes(p.stage) ? p.stage : deriveStage(p));
function stageInfo(p) {
  const id = stageOf(p);
  const s = stageById(id);
  // When the customer last moved stage. Customers never moved by hand (demo/imported) use their latest finished step.
  const lastDone = Object.values(p.tracks || {}).flat().filter((x) => x.status === 'done' && x.updatedAt).map((x) => x.updatedAt).sort().pop();
  const stageAt = p.stageAt || lastDone || p.createdAt;
  return { stage: id, stageLabel: s.label, stageNo: stageIndex(id) + 1, stageCount: STAGES.length, stageAt, stageDays: daysSince(stageAt) };
}

function describe(p, role = session.role) {
  const hidden = [...new Set([...hiddenFor(role), ...COMMISSION_KEYS])];
  const ms = milestones(p);
  const oi = openItems(p, hidden);
  const lastReached = [...ms].reverse().find((m) => m.reached);
  // Field roles care about the installation part first, stamp staff about the agreement part.
  const focus = FIELD_ROLES.includes(role) ? 'supply' : role === 'Stamp Staff' ? 'sales' : null;
  const cur = (focus && oi.find((x) => x.track === focus && x.status !== 'not_started')) || oi.find((x) => x.status !== 'not_started') || oi[0] || null;
  let sentence; let tone = '';
  if (!cur) {
    const closed = ms.find((m) => m.key === 'closed');
    const commOpen = p.tracks.closure.some((x) => COMMISSION_KEYS.includes(x.key) && x.status !== 'done' && !hiddenFor(role).includes(x.key));
    sentence = closed.reached ? `Closed ${fd(closed.date)} · handed over to customer` : `Handed over${commOpen ? ' · commission being settled' : ''}`;
    tone = 'done';
  } else {
    const m = META[cur.key] || {};
    const label = cur.label;
    const age = cur.age;
    const since = cur.status !== 'not_started' && cur.updatedAt && !(cur.key === 'installation' && cur.status === 'in_progress' && p.installDate) ? ` since ${fd(cur.updatedAt)} (${age === 0 ? 'today' : plural(age, 'day')})` : '';
    let phrase;
    if (cur.status === 'waiting_customer') phrase = `Waiting for ${fill(m.wc || 'the customer: ' + lc(label), p)}`;
    else if (cur.status === 'waiting_third') phrase = `Waiting for ${fill(m.wt || lc(label), p)}`;
    else if (cur.status === 'blocked') phrase = `Stuck: ${lc(fill(m.bl || m.do || label, p))}`;
    else if (cur.status === 'in_progress') phrase = m.ip && cur.key === 'installation' && p.installDate ? `Installation booked for ${when(p.installDate).toLowerCase() === 'today' ? 'today' : fd(p.installDate)}` : (m.ip || `Working on it: ${lc(fill(m.do || label, p))}`);
    else phrase = `Next: ${lc(label)}`;
    const after = lastReached && ['installed', 'grid', 'subsidy'].includes(lastReached.key) && cur.track !== 'supply';
    if (after) {
      const short = cur.status === 'waiting_third' ? `${fill(m.wt ? m.wt.replace(/^the /, '') : label, p)} pending` : lc(phrase);
      sentence = `${lastReached.label} ${fd(lastReached.date)} · ${short.charAt(0).toUpperCase() + short.slice(1)}${age > 3 ? ` (${plural(age, 'day')})` : ''}`;
    } else sentence = phrase + since;
    tone = cur.status === 'blocked' ? 'red' : cur.status === 'waiting_customer' || cur.status === 'waiting_third' ? 'wait' : cur.status === 'in_progress' ? 'active' : '';
  }
  let next = null;
  if (cur) {
    const m = META[cur.key] || { sla: 5, own: 'ops', do: cur.label };
    const base = cur.status === 'not_started' ? null : cur.updatedAt;
    const due = base ? new Date(new Date(base).getTime() + m.sla * DAY).toISOString() : new Date(T0 + m.sla * DAY).toISOString();
    const dueIn = daysUntil(due);
    next = { text: fill(m.do, p), owner: ownerName(p, m.own), due, overdue: dueIn < 0, lateBy: dueIn < 0 ? -dueIn : 0, dueWords: dueIn < 0 ? `${plural(-dueIn, 'day')} late` : when(due), key: cur.key, track: cur.track, status: cur.status, age: cur.age, label: cur.label };
    if (next.overdue && tone !== 'red') tone = 'late';
  }
  const stuckDays = oi.filter((x) => x.status !== 'not_started').reduce((m, x) => Math.max(m, x.age), 0);
  return { sentence, tone, next, milestones: ms, stuckDays };
}

// ---------- scoping ----------
function scopeFn(s) {
  return (p) => {
    switch (s.role) {
      case 'Admin': case 'Finance': return s.branch === 'All' || p.branch === s.branch;
      case 'Office Staff': return p.branch === s.branch;
      case 'CPO': return !!p.cp && cpOf(p.cp)?.cpoId === s.cpoId;
      case 'CP': return p.cp === s.cpId;
      case 'Dealer': return p.dealer === s.dealerId;
      case 'Technician': return p.technician === s.technician;
      case 'Installation Team': return p.team === s.teamId && item(p, 'supply', 'installation').status !== 'not_started';
      case 'Stamp Staff': {
        const ag = item(p, 'sales', 'agreement'); const st = item(p, 'sales', 'stamp'); const la = p.loan && item(p, 'finance', 'loan_agreement');
        const inQueue = (ag.status !== 'not_started' && ag.status !== 'done') || (st.status !== 'not_started' && st.status !== 'done') || (la && la.status !== 'not_started' && la.status !== 'done');
        return inQueue || (p.acted && Object.values(p.acted).includes(TODAY) && ag.status === 'done' && daysSince(st.updatedAt) <= 1);
      }
      default: return false;
    }
  };
}
function scoped(s = session) { return load().projects.filter(p=>!p.deletedAt&&scopeFn(s)(p)); }
const inScope = (p, s = session) => !!p && !p.deletedAt && scopeFn(s)(p);

function subsidyStatus(p) {
  if (p.type !== 'Residential') return `Not applicable (${p.type.toLowerCase()})`;
  if (!p.subsidy.length) return 'Not applied yet';
  const last = p.subsidy[p.subsidy.length - 1];
  return `${last.status.replace(' on national portal', '').replace(' to customer account', '')} · ${fd(last.at)}`;
}
function partnerLabel(p) {
  if (p.dealer) return `${dealerOf(p.dealer).name} (dealer of ${cpOf(p.cp).name})`;
  if (p.cp) return cpOf(p.cp).name;
  return 'Direct (no partner)';
}
function summary(p, role = session.role) {
  const hidden = hiddenFor(role);
  const tp = {};
  for (const t of TRACKS) tp[t.key] = trackProgress(p, t.key, hidden);
  const d = describe(p, role);
  const stage = stageInfo(p);
  const task = currentStageTask(p.tracks, stage.stage, hidden);
  let stageNext = null;
  if(task) {
    const meta = META[task.key] || {sla:5,own:'ops',do:task.label};
    const base = task.updatedAt || stage.stageAt;
    const due = new Date(Date.parse(base) + meta.sla*DAY).toISOString();
    const dueIn = daysUntil(due);
    stageNext = {...task,text:fill(meta.do,p),owner:ownerName(p,meta.own),due,overdue:dueIn<0,dueWords:dueIn<0?`${plural(-dueIn,'day')} late`:when(due)};
  }

  const oi = openItems(p, hidden);
  return {
    id: p.id, crn: p.crn, name: p.name, contact: p.contact, phone: p.phone, city: p.city, address: p.address, branch: p.branch, type: p.type, kwp: p.kwp, value: p.value,
    paid: paid(p), due: dueNow(p), discom: p.discom, consumerNo: p.consumerNo, paymentMethod: p.paymentMethod, bank: p.bank,
    cp: p.cp, dealer: p.dealer, cpName: p.cp ? cpOf(p.cp).name : null, dealerName: p.dealer ? dealerOf(p.dealer).name : null, partner: partnerLabel(p),
    team: p.team, teamName: TEAMS.find((t) => t.id === p.team)?.name, technician: p.technician,
    updatedAt: lastCustomerUpdate(p), createdAt: p.createdAt, ageDays: daysSince(p.createdAt), tracks: tp, worst: oi[0] ? oi[0].status : 'done', openCount: oi.filter((x) => x.status !== 'not_started').length,
    installDate: p.installDate, installStatus: item(p, 'supply', 'installation').status, nameMismatch: !p.nameCheck.match && !p.nameCheck.resolution,
    subsidyStatus: subsidyStatus(p), loan: p.loan, ...stage, ...d, stageNext,
  };
}
function log(p, entry) {
  p.updatedAt = nowIso();
  const e = { at: p.updatedAt, by: session.role === 'Admin' ? 'Admin' : identityLabel() || session.role, ...entry };
  p.timeline.push(e);
  load().activity.unshift({ ...e, crn: p.crn, pid: p.id, customer: p.name });
}
function setItem(p, t, k, status, by) {
  const it = item(p, t, k);
  if (!it) return;
  it.status = status; it.updatedAt = nowIso();
  if (status === 'done') {
    const idx = p.tracks[t].indexOf(it);
    const nx = p.tracks[t][idx + 1];
    if (nx && nx.status === 'not_started') { nx.status = 'in_progress'; nx.updatedAt = nowIso(); }
  }
  log(p, { type: 'status', text: `${it.label} — ${STATUS_LABEL[status].toLowerCase()}`, track: t, by });
}
function acted(p, key) { p.acted = p.acted || {}; p.acted[key] = TODAY; }
const isActed = (p, key) => p.acted && p.acted[key] === TODAY;
function deny(msg = 'Not allowed for your role') { const e = new Error(msg); e.code = 'forbidden'; throw e; }
function canEditItem(role, track, key) {
  if (can(role, 'edit')) return true;
  if (can(role, 'stamp') && (key === 'stamp' || key === 'agreement' || key === 'loan_agreement')) return true;
  if (can(role, 'field') && track === 'supply' && ['installation', 'serials'].includes(key)) return true;
  if (can(role, 'tally') && track === 'supply' && key === 'tally') return true;
  return false;
}
export const canEditTrackItem = (track, key, role = session.role) => canEditItem(role, track, key);

// ---------- search ----------
const digits = (s) => String(s).replace(/\D/g, '');
function normPhone(q) { let d = digits(q); if (d.length > 10 && d.startsWith('91')) d = d.slice(2); if (d.length === 11 && d.startsWith('0')) d = d.slice(1); return d.replace(/^0+/, ''); }
function matchScore(p, raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return 0;
  const d = digits(q);
  if (d.length >= 4 && d.length === q.replace(/[\s+\-()]/g, '').length) {
    if (d.length <= 4 && (p.crn.endsWith('-' + d.padStart(4, '0')))) return 99;
    const ph = normPhone(q);
    if (ph && ph.length >= 5 && p.phone.includes(ph)) return 100;
    if (p.consumerNo.includes(d)) return 90;
    if (p.crn.endsWith(d) || p.id.endsWith(d)) return 80;
  }
  if (p.crn.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) return 95;
  const toks = q.split(/\s+/).filter(Boolean);
  const nameToks = (p.name + ' ' + (p.contact || '')).toLowerCase().split(/\s+/);
  if (toks.every((t) => nameToks.some((n) => n.startsWith(t) || (t.length >= 3 && n.includes(t))))) return 70 + (nameToks[0].startsWith(toks[0]) ? 5 : 0);
  const hay = [p.city, p.cp ? cpOf(p.cp).name : '', p.dealer ? dealerOf(p.dealer).name : '', p.discom].join(' ').toLowerCase();
  if (toks.every((t) => hay.includes(t))) return 40;
  return 0;
}
export async function search(q, limit = 8) {
  if (!q.trim()) return delay([]);
  const hits = scoped().map((p) => [matchScore(p, q), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
  return delay({ total: hits.length, rows: hits.slice(0, limit).map(([, p]) => { const s = summary(p); return { id: s.id, crn: s.crn, name: s.name, city: s.city, kwp: s.kwp, sentence: s.sentence, tone: s.tone, phone: s.phone }; }) });
}

// ---------- recently opened ----------
const recentKey = () => [session.role, session.officeId, session.cpoId, session.cpId, session.dealerId, session.teamId, session.technician].join('|');
export function markOpened(id) {
  const d = load(); const k = recentKey();
  d.recent[k] = [id, ...(d.recent[k] || []).filter((x) => x !== id)].slice(0, 8);
  persist(false);
}
export async function listRecent() {
  const ids = load().recent[recentKey()] || [];
  return delay(ids.map((id) => find(id)).filter((p) => inScope(p)).map((p) => summary(p)));
}

// ---------- board ("Today at Sunpay") ----------
const st = (p, t, k) => item(p, t, k)?.status;
const upd = (p, t, k) => item(p, t, k)?.updatedAt;
const lastSub = (p) => p.subsidy[p.subsidy.length - 1];
const thisMonth = (v) => v && dayKey(v).slice(0, 7) === TODAY.slice(0, 7);
export const BOARD = {
  new_today: { one: 'new confirmed client today', many: 'new confirmed clients today', test: (p) => (st(p, 'sales', 'agreement') === 'done' && dayKey(upd(p, 'sales', 'agreement')) === TODAY) || (st(p, 'sales', 'quotation') === 'done' && dayKey(upd(p, 'sales', 'quotation')) === TODAY), note: (p) => (st(p, 'sales', 'agreement') === 'done' && dayKey(upd(p, 'sales', 'agreement')) === TODAY ? 'Agreement signed today' : 'Quotation approved today') },
  inst_today: { one: 'installation today', many: 'installations today', test: (p) => p.installDate === TODAY && st(p, 'supply', 'installation') !== 'done', note: (p) => `${TEAMS.find((t) => t.id === p.team).name} · ${p.address}` },
  inst_tomorrow: { one: 'installation tomorrow', many: 'installations tomorrow', test: (p) => p.installDate === TOMORROW && st(p, 'supply', 'installation') !== 'done', note: (p) => `${TEAMS.find((t) => t.id === p.team).name} · ${p.address}` },
  inst_week: { one: 'more installation later this week', many: 'more installations later this week', test: (p) => p.installDate > TOMORROW && p.installDate <= keyPlus(7) && st(p, 'supply', 'installation') !== 'done', note: (p) => `${when(p.installDate)} · ${TEAMS.find((t) => t.id === p.team).name} · ${p.address}` },
  done_today: { one: 'installation completed today', many: 'installations completed today', test: (p) => st(p, 'supply', 'installation') === 'done' && dayKey(upd(p, 'supply', 'installation')) === TODAY, note: (p) => TEAMS.find((t) => t.id === p.team).name },
  done_week: { one: 'installation completed earlier this week', many: 'installations completed earlier this week', test: (p) => st(p, 'supply', 'installation') === 'done' && daysSince(upd(p, 'supply', 'installation')) >= 1 && daysSince(upd(p, 'supply', 'installation')) <= 6, note: (p) => `${when(upd(p, 'supply', 'installation'))} · ${TEAMS.find((t) => t.id === p.team).name}` },
  discom_submitted: { one: 'file submitted, waiting for inspection date', many: 'files submitted, waiting for inspection date', test: (p) => st(p, 'grid', 'submission') === 'done' && ['not_started', 'in_progress'].includes(st(p, 'grid', 'inspection')), note: (p) => `${p.discom} · submitted ${when(upd(p, 'grid', 'submission')).toLowerCase()}` },
  discom_inspection: { one: 'inspection to chase', many: 'inspections to chase', test: (p) => ['waiting_third', 'blocked'].includes(st(p, 'grid', 'inspection')), note: (p) => `${p.discom} · waiting ${plural(daysSince(upd(p, 'grid', 'inspection')), 'day')}` },
  discom_meter: { one: 'net meter installed this week', many: 'net meters installed this week', test: (p) => st(p, 'grid', 'net_meter') === 'done' && daysSince(upd(p, 'grid', 'net_meter')) <= 6, note: (p) => `${p.discom} · ${when(upd(p, 'grid', 'net_meter'))}` },
  discom_name: { one: 'name mismatch to fix', many: 'name mismatches to fix', test: (p) => !p.nameCheck.match && !p.nameCheck.resolution, note: (p) => `Bill: ${p.nameCheck.discomName} · Bank: ${p.nameCheck.bankName}` },
  loan_bank: { one: 'loan waiting for the bank', many: 'loans waiting for the bank', test: (p) => !!p.loan && (['waiting_third', 'in_progress', 'blocked'].includes(st(p, 'finance', 'sanction')) || ['waiting_third', 'in_progress', 'blocked'].includes(st(p, 'finance', 'disbursement'))), note: (p) => `${p.bank} · ${['waiting_third', 'in_progress', 'blocked'].includes(st(p, 'finance', 'sanction')) ? 'sanction' : 'money release'} pending` },
  pay_due: { one: 'customer with payment due', many: 'customers with payment due', test: (p) => dueNow(p) > 0, note: (p) => `₹${dueNow(p).toLocaleString('en-IN')} due` },
  pay_today: { one: 'payment received today', many: 'payments received today', test: (p) => p.payments.some((x) => dayKey(x.date) === TODAY), note: (p) => `₹${p.payments.filter((x) => dayKey(x.date) === TODAY).reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')} received` },
  sub_applied: { one: 'subsidy applied, within 30 days', many: 'subsidies applied, within 30 days', test: (p) => p.subsidy.length > 0 && !lastSub(p).status.startsWith('Redeemed') && daysSince(p.subsidy[0].at) <= 30, note: (p) => `${lastSub(p).status} · ${when(lastSub(p).at)}` },
  sub_stuck: { one: 'subsidy pending more than 30 days', many: 'subsidies pending more than 30 days', test: (p) => p.subsidy.length > 0 && !lastSub(p).status.startsWith('Redeemed') && daysSince(p.subsidy[0].at) > 30, note: (p) => `Applied ${plural(daysSince(p.subsidy[0].at), 'day')} ago · ${lastSub(p).status}` },
  sub_received: { one: 'subsidy received this month', many: 'subsidies received this month', test: (p) => p.subsidy.length > 0 && lastSub(p).status.startsWith('Redeemed') && thisMonth(lastSub(p).at), note: (p) => `Received ${when(lastSub(p).at).toLowerCase()}` },
  closed_month: { one: 'client fully completed this month', many: 'clients fully completed this month', test: (p) => { const c = milestones(p).find((m) => m.key === 'closed'); return c.reached && thisMonth(c.date); }, note: (p) => 'All work, payments and paperwork done' },
  // partner / field boards
  docs_missing: { one: 'customer waiting on documents', many: 'customers waiting on documents', test: (p) => p.drive.some((d) => ['Aadhaar card', 'Electricity bill', 'Bank passbook / cheque', 'PAN card'].includes(d.slot) && !d.present) || st(p, 'grid', 'discom_docs') === 'waiting_customer' || st(p, 'finance', 'loan_docs') === 'waiting_customer', note: (p) => { const m = p.drive.filter((d) => ['Aadhaar card', 'Electricity bill', 'Bank passbook / cheque', 'PAN card'].includes(d.slot) && !d.present).map((d) => d.slot); return m.length ? 'Missing: ' + m.join(', ') : 'Documents requested by office'; } },
  to_call: { one: 'customer to call', many: 'customers to call', test: (p) => p.tracks.sales.some((x) => x.status === 'waiting_customer' && daysSince(x.updatedAt) >= 2) || (p.quotation && p.quotation.status === 'changes_requested'), note: (p) => { const x = p.tracks.sales.find((i) => i.status === 'waiting_customer'); return x ? `${x.label} · waiting ${plural(daysSince(x.updatedAt), 'day')}` : 'Asked for quotation changes'; } },
  new_leads: { one: 'new lead this month', many: 'new leads this month', test: (p) => thisMonth(p.createdAt) && st(p, 'sales', 'agreement') !== 'done', note: (p) => `Added ${when(p.createdAt).toLowerCase()}` },
  serials_due: { one: 'job waiting for serial numbers', many: 'jobs waiting for serial numbers', test: (p) => st(p, 'supply', 'installation') === 'done' && p.serials.modules.length === 0, note: (p) => `${Math.ceil(p.kwp * 1000 / 540)} modules + inverter to scan` },
};
const BOARD_SECTIONS = {
  office: [
    { key: 'new', title: 'New confirmed clients', desc: 'Customers who approved a quotation or signed the agreement today.', parts: ['new_today'] },
    { key: 'install', title: 'Installations scheduled', desc: 'Upcoming installation visits with the team and the address.', parts: ['inst_today', 'inst_tomorrow', 'inst_week'] },
    { key: 'done', title: 'Completed installations', desc: 'Installations finished by the teams.', parts: ['done_today', 'done_week'] },
    { key: 'discom', title: 'Electricity board (DISCOM)', desc: 'Files with the electricity board, inspections, net meters and name problems.', parts: ['discom_submitted', 'discom_inspection', 'discom_meter', 'discom_name'] },
    { key: 'money', title: 'Loans & payments', desc: 'Bank loans in progress, money due from customers and money received.', parts: ['loan_bank', 'pay_due', 'pay_today'] },
    { key: 'subsidy', title: 'Government subsidy', desc: 'Subsidy applications on the national portal.', parts: ['sub_applied', 'sub_stuck', 'sub_received'] },
    { key: 'closed', title: 'Fully completed clients', desc: 'Everything done: installed, connected, paid, subsidy, paperwork.', parts: ['closed_month'] },
  ],
  partner: [
    { key: 'p_call', title: 'Customers to call', desc: 'Your customers who have not replied for 2+ days, or asked for changes.', parts: ['to_call'] },
    { key: 'p_docs', title: 'Waiting on documents', desc: 'Ask these customers for the missing papers and share them with the office.', parts: ['docs_missing'] },
    { key: 'p_install', title: 'My installations', desc: 'Installation visits booked for your customers.', parts: ['inst_today', 'inst_tomorrow', 'inst_week', 'done_week'] },
    { key: 'p_new', title: 'New leads', desc: 'Leads you added this month that are not booked yet.', parts: ['new_leads', 'new_today'] },
  ],
  field: [
    { key: 'f_today', title: 'My installations', desc: 'Jobs assigned to you. Tap a customer for address and phone.', parts: ['inst_today', 'inst_tomorrow', 'inst_week'] },
    { key: 'f_serials', title: 'Serial numbers to scan', desc: 'Installed jobs that still need module and inverter serials.', parts: ['serials_due', 'done_today'] },
  ],
};
export async function getBoard(kind = 'office', perPart = 5) {
  const list = scoped();
  const sections = BOARD_SECTIONS[kind].map((sec) => {
    const parts = sec.parts.map((k) => {
      const b = BOARD[k];
      const rows = list.filter(b.test).map((p) => ({ ...summary(p), note: b.note(p) })).sort((a, z) => (a.installDate || '').localeCompare(z.installDate || '') || z.stuckDays - a.stuckDays);
      return { key: k, count: rows.length, sentence: `${rows.length} ${rows.length === 1 ? b.one : b.many}`, rows: rows.slice(0, perPart) };
    });
    return { ...sec, total: parts.reduce((s, x) => s + x.count, 0), parts };
  });
  return delay(sections);
}
export const boardLabel = (k) => (BOARD[k] ? BOARD[k].many.charAt(0).toUpperCase() + BOARD[k].many.slice(1) : k);

// ---------- projects ----------
export async function listProjects(f = {}) {
  let list = scoped();
  if (f.board && BOARD[f.board]) list = list.filter(BOARD[f.board].test);
  if (f.q) list = list.filter((p) => matchScore(p, f.q) > 0);
  let rows = list.map((p) => summary(p));
  if (f.type) rows = rows.filter((r) => r.type === f.type);
  if (f.cp) rows = rows.filter((r) => r.cp === f.cp || r.dealer === f.cp);
  const sort = f.sort || 'stuck';
  if (sort === 'stuck') rows.sort((a, b) => (b.tone === 'red') - (a.tone === 'red') || b.stuckDays - a.stuckDays);
  if (sort === 'newest') rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'value') rows.sort((a, b) => b.value - a.value);
  if (sort === 'crn') rows.sort((a, b) => a.crn.localeCompare(b.crn));
  return delay(rows);
}
export async function getProject(id) {
  const p = find(id);
  if (!p) return delay({ notFound: true });
  if (!inScope(p)) return delay({ forbidden: true });
  const hidden = hiddenFor();
  const c = clone(p);
  for (const t of TRACKS) c.tracks[t.key] = c.tracks[t.key].filter((x) => !hidden.includes(x.key)).map((x) => ({ ...x, age: x.status !== 'done' && x.status !== 'not_started' ? daysSince(x.updatedAt) : 0, owner: ownerName(p, (META[x.key] || {}).own), editable: canEditItem(session.role, t.key, x.key) }));
  if (FIELD_ROLES.includes(session.role) || session.role === 'Stamp Staff') c.timeline = c.timeline.filter((e) => e.type !== 'payment');
  const s = summary(p);
  return delay({ ...c, summary: s, open: openItems(p, hidden), paidTotal: paid(p), due: dueNow(p), cpInfo: cpOf(p.cp) || null, dealerInfo: dealerOf(p.dealer) || null, teamInfo: TEAMS.find((t) => t.id === p.team) });
}
export async function updateTrackItem(pid, track, key, status) {
  const p = find(pid);
  if (!inScope(p) || !canEditItem(session.role, track, key)) deny();
  setItem(p, track, key, status); persist(); return delay(true);
}
export async function addNote(pid, type, text) {
  const p = find(pid);
  if (!inScope(p) || !(can(session.role, 'note') || can(session.role, 'edit'))) deny();
  log(p, { type, text, dir: type === 'whatsapp' ? 'out' : undefined }); persist(); return delay(true);
}
export async function reportIssue(pid, text) {
  const p = find(pid);
  if (!inScope(p) || !(can(session.role, 'report_issue') || can(session.role, 'edit'))) deny();
  log(p, { type: 'note', text: `Issue reported from site: ${text}` }); persist(); return delay(true);
}
export async function addPhotos(pid, n) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'field')) deny();
  const slot = p.drive.find((d) => d.slot === 'Installation photos'); if (slot) { slot.present = true; slot.modified = nowIso(); }
  log(p, { type: 'document', text: `${n} site photos added to Drive folder (Installation photos).` }); persist(); return delay(true);
}
export async function linkDoc(pid, slotName) {
  const p = find(pid);
  if (!inScope(p) || !(can(session.role, 'link_docs') || can(session.role, 'edit'))) deny();
  const slot = p.drive.find((d) => d.slot === slotName); if (slot) { slot.present = true; slot.modified = nowIso(); }
  log(p, { type: 'document', text: `${slotName} linked from Google Drive.` }); persist(); return delay(true);
}
const EDITABLE = ['registrationStatus', 'phone', 'kwp', 'city', 'paymentMethod', 'bank', 'team', 'technician', 'installDate', 'discom'];
export async function updateProject(pid, patch) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  for (const [k, v] of Object.entries(patch)) {
    if (!EDITABLE.includes(k)) continue;
    const before = p[k];
    p[k] = k === 'kwp' ? Number(v) : v;
    log(p, { type: 'note', text: `${k} changed: ${before ?? '—'} → ${v}` });
  }
  persist(); return delay(summary(p));
}
export async function addLead(data) {
  if (!can(session.role, 'add_lead')) deny();
  const d = load();
  let cp = null; let dealer = null;
  if (session.role === 'Dealer') { dealer = session.dealerId; cp = dealerOf(dealer).cpId; }
  else if (session.role === 'CP') { cp = session.cpId; if (data.dealer && dealerOf(data.dealer)?.cpId === cp) dealer = data.dealer; }
  else if (session.role === 'CPO') { cp = data.cp && cpOf(data.cp)?.cpoId === session.cpoId ? data.cp : CHANNEL_PARTNERS.find((c) => c.cpoId === session.cpoId).id; }
  else if (data.cp) { cp = data.cp; }
  const n = cloud() ? await remote.nextProjectNumber() : ++d.seq;
  const num = String(n).padStart(4, '0');
  const city = data.city || 'Deesa';
  const branchOf = CITY_BRANCH;
  const discomOf = CITY_DISCOM;
  const kwp = Number(data.kwp) || 3;
  const p = {
    id: `PRJ-2026-${num}`, crn: `CRN-2026-${num}`, name: data.name.trim(), contact: null, phone: digits(data.phone).slice(-10), city,
    branch: session.role === 'Office Staff' ? session.branch : branchOf[city] || 'Main Office', discom: discomOf[city] || 'UGVCL', type: data.type || 'Residential',
    kwp, value: Math.round(kwp * 56000 / 100) * 100, paymentMethod: data.paymentMethod || 'Online Transfer', bank: 'SBI', cp, dealer,
    address: data.address || city, consumerNo: digits(data.consumerNo || '') || '—', team: TEAMS[0].id, technician: TECHNICIANS[0],
    createdAt: nowIso(), ageDays: 0,
    nameCheck: { discomName: data.name.trim(), bankName: data.name.trim(), aadhaarName: data.name.trim(), match: true, resolution: null },
    quotation: null, agreement: null, loan: null, subsidy: [], payments: [], reminders: [], schedule: [], serials: { modules: [], inverter: '' }, installDate: null, timeline: [], notes: [],
    drive: SLOTS.filter((s) => s !== 'Loan sanction letter').map((slot) => ({ slot, present: false, file: `${slot.replace(/[^A-Za-z]+/g, '_')}_CRN-2026-${num}.pdf`, modified: nowIso() })),
  };
  const defs = itemsFor(p);
  p.stage = 'leads'; p.stageAt = new Date().toISOString();
  p.tracks = {};
  for (const t of TRACKS) p.tracks[t.key] = defs[t.key].map((k, i) => ({ key: k, label: ITEM_LABELS[k], status: t.key === 'sales' && i === 0 ? 'in_progress' : 'not_started', updatedAt: t.key === 'sales' && i === 0 ? nowIso() : null }));
  const adv = Math.round(p.value * 0.2 / 100) * 100;
  p.schedule = [{ label: 'Advance', amount: adv, due: nowIso() }, { label: 'Before installation', amount: Math.round((p.value - adv) * 0.7 / 100) * 100, due: nowIso() }, { label: 'On commissioning', amount: 0, due: nowIso() }];
  p.schedule[2].amount = p.value - p.schedule[0].amount - p.schedule[1].amount;
  d.projects.unshift(p);
  log(p, { type: 'status', text: `Lead added${data.notes ? ': ' + data.notes : ''}`, track: 'sales' });
  persist();
  return delay(p.id);
}

// ---------- inbox (Today · My tasks) ----------
const QUEUES = [
  { key: 'quote_approval', title: 'Quotations waiting for customer approval', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'remind_quote', label: 'Send reminder' }, secondary: { id: 'approve_quote', label: 'Mark approved' }, bulk: ['remind_quote', 'approve_quote'], tone: 'violet' },
  { key: 'quote_changes', title: 'Customers asked for quotation changes', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'revise_quote', label: 'Revise quote' }, tone: 'coral' },
  { key: 'name_mismatch', title: 'Name mismatches to fix', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'fix_name', label: 'Fix' }, tone: 'coral' },
  { key: 'installs_today', title: 'Installations today', roles: ['Admin', 'Office Staff', 'Installation Team', 'Technician'], primary: { id: 'mark_installed', label: 'Mark installed' }, bulk: ['mark_installed'], tone: 'accent' },
  { key: 'serials_missing', title: 'Installed, serial numbers not captured', roles: ['Admin', 'Office Staff', 'Installation Team', 'Technician'], primary: { id: 'scan_serials', label: 'Scan serials' }, tone: 'violet' },
  { key: 'loan_agreement', title: 'Loan agreements to sign', roles: ['Admin', 'Office Staff', 'Finance', 'Stamp Staff'], primary: { id: 'send_loan_link', label: 'Send sign link' }, secondary: { id: 'mark_loan_signed', label: 'Mark signed' }, bulk: ['send_loan_link'], tone: 'violet' },
  { key: 'agreement_sign', title: 'Agreements waiting for customer signature', roles: ['Admin', 'Office Staff', 'Stamp Staff'], primary: { id: 'resend_agreement', label: 'Resend link' }, secondary: { id: 'mark_agreement_signed', label: 'Mark signed' }, bulk: ['resend_agreement'], tone: 'violet' },
  { key: 'stamp', title: 'Stamp paper to prepare', roles: ['Admin', 'Office Staff', 'Stamp Staff'], primary: { id: 'mark_stamped', label: 'Mark stamped' }, bulk: ['mark_stamped'], tone: 'accent' },
  { key: 'payment_reminders', title: 'Payment reminders due', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'remind_payment', label: 'Send reminder' }, bulk: ['remind_payment'], tone: 'coral' },
  { key: 'subsidy_stuck', title: 'Subsidy pending more than 30 days', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'escalate_subsidy', label: 'Escalate' }, tone: 'coral' },
  { key: 'discom_inspection', title: 'DISCOM inspections to chase', roles: ['Admin', 'Office Staff', 'Finance'], primary: { id: 'chase_discom', label: 'Log follow-up' }, bulk: ['chase_discom'], tone: 'violet' },
];
export const ACTION_LABELS = {
  remind_quote: 'Send reminder', approve_quote: 'Mark approved', revise_quote: 'Revise quote', fix_name: 'Fix', mark_installed: 'Mark installed',
  scan_serials: 'Scan serials', send_loan_link: 'Send sign link', mark_loan_signed: 'Mark signed', resend_agreement: 'Resend link',
  mark_agreement_signed: 'Mark signed', mark_stamped: 'Mark stamped', remind_payment: 'Send reminder', escalate_subsidy: 'Escalate', chase_discom: 'Log follow-up', open: 'Open',
};
const ACTION_CAP = { mark_installed: 'field', mark_loan_signed: 'stamp', mark_agreement_signed: 'stamp', mark_stamped: 'stamp', resend_agreement: 'stamp', send_loan_link: 'stamp', remind_payment: 'money_edit' };
export const canAction = (a, role = session.role) => can(role, 'edit') || (ACTION_CAP[a] && can(role, ACTION_CAP[a]));
function rowsFor(qk, list) {
  const out = [];
  const fmt = (n) => '₹' + n.toLocaleString('en-IN');
  for (const p of list) {
    if (isActed(p, qk)) continue;
    let r = null;
    if (qk === 'quote_approval' && p.quotation && (p.quotation.status === 'sent' || p.quotation.status === 'viewed'))
      r = { reason: p.quotation.status === 'viewed' ? `Seen on WhatsApp, no reply yet · version ${p.quotation.version}` : `Delivered, not opened yet · version ${p.quotation.version}`, since: p.quotation.sentAt };
    if (qk === 'quote_changes' && p.quotation && p.quotation.status === 'changes_requested') {
      const last = [...p.timeline].reverse().find((e) => e.type === 'whatsapp' && e.dir === 'in');
      r = { reason: last ? `“${last.text}”` : 'Customer asked for changes', since: p.quotation.sentAt };
    }
    if (qk === 'name_mismatch' && !p.nameCheck.match && !p.nameCheck.resolution)
      r = { reason: `Bill says “${p.nameCheck.discomName}”, bank says “${p.nameCheck.bankName}”`, since: item(p, 'grid', 'name_check').updatedAt || p.createdAt };
    if (qk === 'installs_today' && p.installDate === TODAY && item(p, 'supply', 'installation').status !== 'done')
      r = { reason: `${p.kwp} kWp · ${TEAMS.find((t) => t.id === p.team).name} · ${p.address}`, since: item(p, 'supply', 'installation').updatedAt };
    if (qk === 'serials_missing' && item(p, 'supply', 'installation').status === 'done' && p.serials.modules.length === 0)
      r = { reason: `${Math.ceil(p.kwp * 1000 / 540)} modules + 1 inverter to record`, since: item(p, 'supply', 'installation').updatedAt };
    if (qk === 'loan_agreement' && p.loan) { const it = item(p, 'finance', 'loan_agreement'); if (it.status !== 'done' && it.status !== 'not_started') r = { reason: `${p.loan.bank} · ${fmt(p.loan.amount)} sanctioned`, since: it.updatedAt }; }
    if (qk === 'agreement_sign' && p.agreement && p.agreement.status === 'sent') r = { reason: 'Sign-by-link sent, not signed yet', since: p.agreement.at };
    if (qk === 'stamp') { const it = item(p, 'sales', 'stamp'); if (it.status !== 'done' && it.status !== 'not_started') r = { reason: `₹${p.type === 'Residential' ? 300 : 500} stamp paper · agreement signed`, since: it.updatedAt }; }
    if (qk === 'payment_reminders') { const d = dueNow(p); if (d > 0) { const last = p.reminders[p.reminders.length - 1]; r = { reason: `${fmt(d)} due · ${p.reminders.length ? `last reminder ${plural(daysSince(last.at), 'day')} ago` : 'no reminder sent yet'}`, since: (p.reminders[p.reminders.length - 1] || {}).at || dueMilestones(p).slice(-1)[0]?.due }; } }
    if (qk === 'subsidy_stuck' && p.subsidy.length) { const last = p.subsidy[p.subsidy.length - 1]; if (last.status.startsWith('Applied') && daysSince(last.at) > 30) r = { reason: `Applied ${daysSince(last.at)} days ago, no approval yet`, since: last.at }; }
    if (qk === 'discom_inspection') { const it = item(p, 'grid', 'inspection'); if (it.status === 'waiting_third' || it.status === 'blocked') r = { reason: `${p.discom} has not given an inspection date`, since: it.updatedAt }; }
    if (r) out.push({ pid: p.id, crn: p.crn, name: p.name, city: p.city, kwp: p.kwp, sentence: describe(p).sentence, ...r, age: daysSince(r.since) });
  }
  return out.sort((a, b) => b.age - a.age);
}
export async function getInbox(keys) {
  const list = scoped();
  const role = session.role;
  const queues = QUEUES.filter((q) => q.roles.includes(role) && (!keys || keys.includes(q.key))).map((q) => ({ ...q, rows: rowsFor(q.key, list) }));
  const doneToday = list.reduce((s, p) => s + (p.acted ? Object.values(p.acted).filter((d) => d === TODAY).length : 0), 0);
  return delay({ queues, doneToday });
}
export async function runAction(action, pids) {
  if (!canAction(action)) deny('This action is not available for your role');
  const results = [];
  for (const pid of pids) {
    const p = find(pid);
    if (!p || !inScope(p)) continue;
    switch (action) {
      case 'remind_quote': log(p, { type: 'whatsapp', dir: 'out', text: `Reminder: please review quotation v${p.quotation.version} and tap Approve.` }); acted(p, 'quote_approval'); break;
      case 'approve_quote':
        p.quotation.status = 'approved'; setItem(p, 'sales', 'quotation', 'done'); acted(p, 'quote_approval');
        if (p.tracks.sales.find((x) => x.key === 'agreement').status === 'in_progress') p.agreement = p.agreement || { status: 'draft', at: nowIso() }; break;
      case 'mark_installed': setItem(p, 'supply', 'installation', 'done'); acted(p, 'installs_today'); break;
      case 'send_loan_link': log(p, { type: 'whatsapp', dir: 'out', text: `Loan agreement sign link sent (${p.loan.bank}).` }); acted(p, 'loan_agreement'); break;
      case 'mark_loan_signed': setItem(p, 'finance', 'loan_agreement', 'done'); acted(p, 'loan_agreement'); break;
      case 'resend_agreement': log(p, { type: 'whatsapp', dir: 'out', text: 'Agreement sign-by-link re-sent.' }); acted(p, 'agreement_sign'); break;
      case 'mark_agreement_signed': p.agreement = { status: 'signed', at: nowIso() }; setItem(p, 'sales', 'agreement', 'done'); acted(p, 'agreement_sign'); break;
      case 'mark_stamped': setItem(p, 'sales', 'stamp', 'done'); acted(p, 'stamp'); break;
      case 'remind_payment':
        p.reminders.push({ at: nowIso(), channel: 'WhatsApp', text: 'Payment reminder sent' });
        log(p, { type: 'whatsapp', dir: 'out', text: `Payment reminder: ₹${dueNow(p).toLocaleString('en-IN')} due for ${p.crn}.` }); acted(p, 'payment_reminders'); break;
      case 'escalate_subsidy': log(p, { type: 'note', text: 'Subsidy escalated to DISCOM nodal officer.' }); acted(p, 'subsidy_stuck'); break;
      case 'chase_discom': log(p, { type: 'call', text: `Followed up with ${p.discom} for inspection date.` }); acted(p, 'discom_inspection'); break;
      default: break;
    }
    results.push(pid);
  }
  persist();
  return delay(results);
}

// ---------- overview ----------
export async function getOverview() {
  const list = scoped();
  const rows = list.map((p) => summary(p));
  const tracks = TRACKS.map((t) => {
    const c = { not_started: 0, in_progress: 0, waiting_customer: 0, waiting_third: 0, blocked: 0, done: 0 };
    for (const r of rows) c[r.tracks[t.key].worst]++;
    return { ...t, counts: c };
  });
  const funnel = MILESTONES.map((m, i) => ({ label: m.label, count: rows.filter((r) => r.milestones[i].reached).length, applicable: rows.filter((r) => !r.milestones[i].na).length, late: rows.filter((r) => r.milestones[i].lateBy > 0).length }));
  const branches = BRANCHES.map((b) => { const br = rows.filter((r) => r.branch === b); return { name: b, count: br.length, kwp: br.reduce((s, r) => s + r.kwp, 0), due: br.reduce((s, r) => s + r.due, 0), stuck: br.filter((r) => r.tone === 'red').length, late: br.filter((r) => r.tone === 'late').length }; }).filter((b) => b.count > 0);
  const stuck = [...rows].sort((a, b) => b.stuckDays - a.stuckDays).slice(0, 10);
  const segments = ['Residential', 'Commercial', 'Industrial'].map((t) => { const sr = rows.filter((r) => r.type === t); return { name: t, count: sr.length, kwp: sr.reduce((s, r) => s + r.kwp, 0), value: sr.reduce((s, r) => s + r.value, 0) }; });
  const stages = STAGES.map((st) => ({ id: st.id, label: st.label, count: rows.filter((r) => r.stage === st.id).length }));
  return delay({ segments, total: rows.length, kwp: rows.reduce((s, r) => s + r.kwp, 0), due: rows.reduce((s, r) => s + r.due, 0), tracks, funnel, stages, branches, stuck, showMoney: can(session.role, 'internal_money') });
}

// ---------- partner home ----------
function commissionLines(list, role = session.role, s = session) {
  const out = [];
  for (const p of list) {
    const commissioned = item(p, 'grid', 'commissioning').status === 'done';
    const add = (key, who, rate) => { const it = item(p, 'closure', key); if (!it) return; out.push({ key, pid: p.id, crn: p.crn, name: p.name, party: who, basis: `${rate}% of ₹${p.value.toLocaleString('en-IN')}`, amount: Math.round(p.value * rate / 100), state: it.status === 'done' ? 'paid' : commissioned ? 'pending' : 'upcoming', status: it.status, eligible: commissioned }); };
    if ((role === 'CPO' || role === 'CP') && p.cp) add('cp_comm', cpOf(p.cp).name, cpOf(p.cp).rate);
    if ((role === 'CPO' || role === 'Dealer') && p.dealer) add('dealer_comm', dealerOf(p.dealer).name, dealerOf(p.dealer).rate);
  }
  return out;
}
export async function listMyCommission() {
  if (!PARTNER_ROLES.includes(session.role)) deny();
  return delay(commissionLines(scoped()));
}
export async function getPartnerHome() {
  if (!PARTNER_ROLES.includes(session.role)) deny();
  const list = scoped();
  const lines = commissionLines(list);
  const sum = (st2) => lines.filter((l) => st2.includes(l.state)).reduce((s, l) => s + l.amount, 0);
  let network = [];
  if (session.role === 'CPO') network = CHANNEL_PARTNERS.filter((c) => c.cpoId === session.cpoId).map((c) => ({ id: c.id, name: c.name, kind: 'Channel partner', count: list.filter((p) => p.cp === c.id).length, dealers: DEALERS.filter((d) => d.cpId === c.id).map((d) => ({ id: d.id, name: d.name, count: list.filter((p) => p.dealer === d.id).length })) }));
  if (session.role === 'CP') network = DEALERS.filter((d) => d.cpId === session.cpId).map((d) => ({ id: d.id, name: d.name, kind: 'Dealer', count: list.filter((p) => p.dealer === d.id).length, dealers: [] }));
  return delay({
    who: identityLabel(), role: session.role, count: list.length,
    commission: { earned: sum(['pending', 'paid']), pending: sum(['pending']), paid: sum(['paid']), upcoming: sum(['upcoming']) },
    network,
  });
}

// ---------- stamp queue ----------
export async function getStampQueue() { return getInbox(['agreement_sign', 'stamp', 'loan_agreement']); }

// ---------- name check ----------
export async function listNameChecks() {
 if(!can(session.role,'internal_money'))deny();
 return delay(scoped().map(p=>({pid:p.id,crn:p.crn,name:p.name,discom:p.discom,bank:p.bank,consumerNo:p.consumerNo,...p.nameCheck})).sort((a,b)=>Number(!!a.verifiedAt)-Number(!!b.verifiedAt)||a.name.localeCompare(b.name)));
}
export function tokens(s) { return String(s).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean); }
export function tokenMatch(t, others) {
  let best = 0;
  const root = (w) => w.replace(/bhai$|ben$/, '');
  for (const u of others) {
    if (u === t) return 1;
    if (root(u) === root(t) && root(t).length > 2) best = Math.max(best, 0.75);
    else if ((t.length === 1 && u[0] === t) || (u.length === 1 && t[0] === u)) best = Math.max(best, 0.5);
  }
  return best;
}
export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.length || !B.length) return 0;
  const sum = A.reduce((s, t) => s + tokenMatch(t, B), 0);
  const ordered = A.every((t, i) => !B[i] || tokenMatch(t, [B[i]]) > 0);
  return Math.round((sum / Math.max(A.length, B.length)) * (ordered ? 100 : 90));
}
export async function resolveNameCheck(pid, resolution) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  p.nameCheck.resolution = resolution;
  setItem(p, 'grid', 'name_check', resolution === 'Accepted as same person' ? 'done' : 'waiting_customer');
  log(p, { type: 'note', text: `Name check: ${resolution}.` });
  acted(p, 'name_mismatch');
  persist(); return delay(true);
}

// ---------- field ----------
export async function saveSerials(pid, serials) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'field')) deny();
  p.serials = serials;
  setItem(p, 'supply', 'serials', 'done');
  log(p, { type: 'document', text: `${serials.modules.length} module serials + inverter ${serials.inverter || '—'} recorded.` });
  persist(); return delay(true);
}
export async function listFieldJobs() {
  const list = scoped().filter((p) => p.installDate && p.tracks.supply.find((x) => x.key === 'installation').status !== 'not_started');
  return delay(list.map((p) => ({ ...summary(p), serialCount: p.serials.modules.length, expected: Math.ceil(p.kwp * 1000 / 540) }))
    .sort((a, b) => Math.abs(new Date(a.installDate) - T0) - Math.abs(new Date(b.installDate) - T0)));
}

// ---------- saved views (Projects grid) ----------
const BUILTIN_VIEWS = [
  { id: 'all', name: 'All customers', filters: [], sort: { key: 'stuckDays', dir: 'desc' }, groupBy: null, builtin: true },
  { id: 'stuck', name: 'Most stuck', filters: [{ key: 'stuckDays', op: 'gt', value: 14 }], sort: { key: 'stuckDays', dir: 'desc' }, groupBy: null, builtin: true },
  { id: 'late', name: 'Next step late', filters: [{ key: 'late', op: 'is', value: true }], sort: { key: 'stuckDays', dir: 'desc' }, groupBy: 'nextOwner', builtin: true },
  { id: 'loan', name: 'Loan customers', filters: [{ key: 'paymentMethod', op: 'in', value: ['Bank Solar Loan', 'Personal Loan'] }], sort: null, groupBy: 'bank', builtin: true },
  { id: 'due', name: 'Payment due', filters: [{ key: 'due', op: 'gt', value: 0 }], sort: { key: 'due', dir: 'desc' }, groupBy: null, builtin: true },
  { id: 'commercial', name: 'Commercial & industrial', filters: [{ key: 'type', op: 'in', value: ['Commercial', 'Industrial'] }], sort: { key: 'kwp', dir: 'desc' }, groupBy: 'type', builtin: true },
  { id: 'by_stage', name: 'By stage', filters: [], sort: null, groupBy: 'stage', builtin: true },
];
export async function listViews() { const d = load(); return delay([...BUILTIN_VIEWS, ...clone(d.views || [])]); }
export async function saveView(v) { const d = load(); d.views = [...(d.views || []).filter((x) => x.id !== v.id), { ...v, builtin: false }]; persist(false); return delay(true); }
export async function deleteView(id) { const d = load(); d.views = (d.views || []).filter((x) => x.id !== id); persist(false); return delay(true); }

// ---------- supply ----------
export async function listInventory() { return delay(clone((await deliveryState()).inventory)); }
export function bomFor(p) {
  if (p.bomVersions?.length) return clone(p.bomVersions.at(-1).lines);
  const nMod = Math.ceil(p.kwp * 1000 / 540);
  const inv = p.kwp >= 40 ? 'INV-50K-3PH' : p.kwp > 6 ? 'INV-10K-3PH' : p.kwp > 3.3 ? 'INV-5K-1PH' : 'INV-3K-1PH';
  const invQty = p.kwp >= 40 ? Math.ceil(p.kwp / 50) : 1;
  return [
    { sku: 'MOD-540-MONO', qty: nMod, unit: 'pcs' }, { sku: inv, qty: invQty, unit: 'pcs' }, { sku: 'STR-GI-KIT', qty: Math.ceil(p.kwp), unit: 'kit' },
    { sku: 'CBL-DC-4', qty: Math.round(p.kwp * 12), unit: 'm' }, { sku: 'CBL-AC-6', qty: Math.round(p.kwp * 5), unit: 'm' },
    { sku: 'ACDB-1PH', qty: 1, unit: 'pcs' }, { sku: 'DCDB-2S', qty: 1, unit: 'pcs' }, { sku: 'EARTH-KIT', qty: p.kwp > 20 ? 3 : 1, unit: 'set' }, { sku: 'MC4-PAIR', qty: nMod, unit: 'pair' },
  ].map((l) => ({ ...l, name: INVENTORY.find((i) => i.sku === l.sku).name }));
}
export async function getBOM(pid) { const p = find(pid); if (!inScope(p)) return delay(null); return delay({ project: summary(p), lines: bomFor(p), versions: clone(p.bomVersions || []) }); }
export async function listDispatch(kind) {
  const key = kind === 'challan' ? 'challan' : 'tally';
  const rows = scoped().filter((p) => item(p, 'supply', key).status !== 'not_started').map((p, i) => ({
    no: (kind === 'challan' ? 'DC-' : 'TT-') + p.crn.slice(-4), pid: p.id, crn: p.crn, name: p.name, city: p.city, kwp: p.kwp,
    status: item(p, 'supply', key).status, date: item(p, 'supply', key).updatedAt, vehicle: 'GJ-0' + (1 + (i % 9)) + '-XX-' + String(1000 + ((i * 377) % 9000)),
    team: TEAMS.find((t) => t.id === p.team).name, lines: bomFor(p),
  }));
  return delay(rows.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
}
export async function setDispatchStatus(pid, kind, status) {
  const key = kind === 'challan' ? 'challan' : 'tally';
  const p = find(pid);
  if (!inScope(p) || !canEditItem(session.role, 'supply', key)) deny();
  setItem(p, 'supply', key, status); persist(); return delay(true);
}

// ---------- installs ----------
export async function listInstalls() {
  return delay(scoped().map((p) => ({ ...summary(p), ...installationInfo(p, stageOf(p), item(p, 'supply', 'installation')), teamInfo: TEAMS.find((t) => t.id === p.team) })).filter((p) => p.included));
}

// ---------- money ----------
export async function listInvoices() {
  return delay(scoped().filter((p) => item(p, 'grid', 'commissioning').status === 'done' || paid(p) > 0).map((p) => {
    const inv = item(p, 'closure', 'invoice');
    const base = Math.round(p.value / 1.089);
    return { no: 'INV/26-27/' + p.crn.slice(-4), pid: p.id, crn: p.crn, name: p.name, city: p.city, kwp: p.kwp, value: p.value, base, gst: p.value - base, paid: paid(p), status: inv.status, date: inv.updatedAt || p.createdAt };
  }).sort((a, b) => b.date.localeCompare(a.date)));
}
export async function listCommissions(kind) {
  if (!can(session.role, 'internal_money')) deny();
  const list = scoped();
  if (kind === 'cp') return delay(list.filter((p) => p.cp).flatMap((p) => commissionLines([p], 'CPO')).map((l) => ({ ...l })));
  if (kind === 'install') return delay(list.filter((p) => item(p, 'supply', 'installation').status === 'done').map((p) => { const t = TEAMS.find((x) => x.id === p.team); const it = item(p, 'closure', 'inst_comm'); return { pid: p.id, crn: p.crn, name: p.name, party: `${t.name} (${t.kind})`, basis: `₹${t.rate}/kWp × ${p.kwp}`, amount: Math.round(t.rate * p.kwp), status: it.status, eligible: true }; }));
  return delay(list.filter((p) => item(p, 'supply', 'challan').status === 'done').flatMap((p) => VENDORS.slice(0, 2).map((v) => { const it = item(p, 'closure', 'vendor_comm'); return { pid: p.id, crn: p.crn, name: p.name, party: v.name, basis: `${v.rate}% · ${v.supplies}`, amount: Math.round(p.value * 0.55 * v.rate / 100), status: it.status, eligible: true }; })));
}
export async function setClosureItem(pid, key, status) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'money_edit')) deny();
  setItem(p, 'closure', key, status); persist(); return delay(true);
}
export async function listWarranty() {
  return delay(scoped().filter((p) => stageOf(p)==='completed').map((p) => ({ ...warrantyRecord(p), teamName: TEAMS.find((t) => t.id === p.team)?.name || '' })));
}
export async function saveWarranty(pid, fields) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  const cleaned = cleanWarranty(fields);
  const before = warrantyRecord(p);
  const changes = Object.keys(cleaned).filter((key) => String(before[key] ?? '') !== String(cleaned[key] ?? '')).map((field) => ({ field, before: before[field] ?? '', after: cleaned[field] }));
  p.warrantyHistory ||= [];
  p.warrantyHistory.push({ id: crypto.randomUUID(), at: nowIso(), by: auth?.name || identityLabel() || session.role, changes });
  p.warranty = { ...cleaned, savedAt: nowIso() };
  log(p, { type: 'note', text: 'Warranty and equipment details updated' });
  persist(); return delay(true);
}

// ---------- grid ----------
export async function listDiscomDocs() {
  return delay(scoped().filter((p) => item(p, 'grid', 'discom_docs').status !== 'not_started').map((p) => ({
    pid: p.id, crn: p.crn, name: p.name, discom: p.discom, kwp: p.kwp,
    docs: [
      { k: 'Application form (A1)', ok: true }, { k: 'Electricity bill', ok: p.drive.find((d) => d.slot === 'Electricity bill').present },
      { k: 'Aadhaar', ok: true }, { k: 'Name match declaration', ok: p.nameCheck.match || p.nameCheck.resolution === 'Accepted as same person' },
      { k: 'Agreement', ok: item(p, 'sales', 'agreement').status === 'done' }, { k: 'Site photos', ok: p.drive.find((d) => d.slot === 'Site survey photos').present },
      { k: 'Single-line diagram', ok: item(p, 'supply', 'bom').status === 'done' }, { k: 'Commissioning report', ok: item(p, 'grid', 'commissioning').status === 'done' },
    ],
    submission: item(p, 'grid', 'submission').status, inspection: item(p, 'grid', 'inspection').status,
    consumerNo: p.consumerNo, phone: p.phone, sign: signStatus(p),
  })));
}
// ---------- people / admin ----------
export async function listAttendance() { return delay(clone(load().attendance)); }
export async function listUsers() {
  if (!can(realRole(), 'users')) deny();
  if (!remote.enabled) return delay(STAFF.map((u) => ({ ...u, email: '', demo: true })));
  return remote.listProfiles();
}
const USER_FIELDS = ['name', 'role', 'branch', 'team', 'cpo_id', 'cp_id', 'dealer_id', 'technician', 'phone', 'active'];
const pickUser = (f) => Object.fromEntries(USER_FIELDS.filter((k) => k in f).map((k) => [k, f[k] === '' ? null : f[k]]));
/** Admin: creates a login (email + password) and its profile, saved by the login's UUID. */
export async function createUser(form) {
  if (realRole() !== 'Admin') deny();
  if (!remote.enabled) throw new Error('Connect Supabase to add real users');
  const name = String(form.name || '').trim();
  if (!name) throw new Error('Enter a name');
  if (String(form.password || '').length < 8) throw new Error('Password must be at least 8 characters');
  const { id, needsConfirm } = await remote.createUser({ name, email: cleanEmail(form.email), password: form.password });
  const prof = await remote.updateProfile(id, { ...pickUser({ ...form, name }), active: true, created_by: auth?.id || null });
  return { profile: prof, needsConfirm };
}
export async function updateUser(id, patch) {
  if (realRole() !== 'Admin') deny();
  const prof = await remote.updateProfile(id, pickUser(patch));
  if (id === auth?.id) { auth = { ...auth, name: prof.name }; listeners.forEach((fn) => fn()); }
  return prof;
}
export async function listActivity(limit = 120) {
  const ids = new Set(scoped().map((p) => p.id));
  return delay(load().activity.filter((a) => ids.has(a.pid)).slice(0, limit));
}
export async function resetDemo() {
  // The shared database is never wiped from a screen; with Supabase this only clears this browser's own extras.
  if (cloud()) { try { localStorage.removeItem(RECENT_KEY); } catch { /* */ } db.recent = {}; listeners.forEach((fn) => fn()); return delay(true); }
  localStorage.removeItem(DB_KEY); db = null; load(); persist(); return delay(true);
}
export const cloudStatus = () => (cloud() ? remote.getStatus() : { status: 'local', error: remote.enabled ? 'Supabase unavailable — using this browser only' : '' });
export const onCloudStatus = (fn) => remote.onStatus(fn);

// ---------- quotation ----------
export async function sendQuotation(pid, q) {
  if (!can(session.role, 'quote')) deny();
  const p = find(pid);
  if (!inScope(p)) deny();
  const version = p.quotation ? (p.quotation.status === 'approved' ? p.quotation.version : p.quotation.version + 1) : 1;
  p.quotation = { status: 'sent', sentAt: nowIso(), version, total: q.total, kwp: q.kwp };
  const it = item(p, 'sales', 'quotation');
  it.status = 'waiting_customer'; it.updatedAt = nowIso();
  log(p, { type: 'whatsapp', dir: 'out', text: `Quotation v${version}: ${q.kwp} kWp, ₹${Math.round(q.total).toLocaleString('en-IN')} — tap Approve or Request changes.` });
  log(p, { type: 'document', text: `Quotation_v${version}_${p.crn}.pdf saved to Drive.` });
  persist(); return delay(version);
}
export async function pickList() {
  return delay(scoped().map((p) => ({ stage: stageOf(p), paymentMethod: p.paymentMethod, scheme: p.scheme || '', portalId: p.portalId || '', id: p.id, crn: p.crn, name: p.name, kwp: p.kwp, type: p.type, city: p.city, discom: p.discom, q: p.quotation ? p.quotation.status : null })));
}

// ---------- team chat (one shared room for Admin and Office staff) ----------
const CHAT_ROLES = ['Admin', 'Office Staff'];
const CHAT_KEY = PREFIX + 'chat';
const chatListeners = new Set();
const localChat = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; } };
// Messages carry the person's real name and real role (the database checks the role matches the login).
const chatRole = () => (remote.enabled ? realRole() : session.role);
export const chatName = () => (remote.enabled && auth?.name ? auth.name : session.role === 'Admin' ? 'Admin' : identityLabel() || 'Office staff');
export const canChat = (role = chatRole()) => CHAT_ROLES.includes(role);
export async function listChat() {
  if (!canChat()) deny();
  return cloud() ? remote.listChat() : delay(localChat());
}
export async function postChat(text) {
  if (!canChat()) deny();
  const body = String(text || '').trim().slice(0, 2000);
  if (!body) return null;
  const msg = { author: chatName(), role: chatRole(), branch: session.branch === 'All' ? null : session.branch, body };
  if (cloud()) return remote.postChat(msg);
  const saved = { ...msg, id: Date.now(), at: new Date().toISOString() };
  try { localStorage.setItem(CHAT_KEY, JSON.stringify([...localChat(), saved].slice(-500))); } catch { /* */ }
  chatListeners.forEach((fn) => fn(saved));
  return saved;
}
/** Calls `fn(message)` for every new message, including ones from other people (live with Supabase). */
export function watchChat(fn) {
  if (cloud()) return remote.watchChat(fn);
  chatListeners.add(fn);
  return () => chatListeners.delete(fn);
}

// ---------- feasibility / agreement fields ----------
const DOC_FIELDS = ['roofShed', 'dcCable', 'acCable', 'frontLegHeight', 'rearLegHeight', 'materialNotes', 'email', 'fileNo', 'registrationDate', 'registeredBy', 'subDivision', 'bankBranch', 'loanBy', 'portalId', 'janSamarthNo', 'consumerNo', 'address', 'district', 'pincode', 'kwp', 'value'];
const DOC_FIELD_LABEL = { roofShed: 'Roof / shed', dcCable: 'DC cable (m)', acCable: 'AC cable (m)', frontLegHeight: 'Front leg height (ft)', rearLegHeight: 'Rear leg height (ft)', materialNotes: 'Material order notes', email: 'Email address', fileNo: 'File number', registrationDate: 'Registration date', registeredBy: 'Registered by', subDivision: 'DISCOM sub-division', bankBranch: 'Bank branch', loanBy: 'Loan handled by', portalId: 'PM Surya Ghar portal ID', janSamarthNo: 'Jan Samarth application no.', consumerNo: 'Consumer no.', address: 'Address', district: 'District', pincode: 'PIN code', kwp: 'kWp', value: 'Project cost' };
/** Saves document fields (portal ID, Jan Samarth no. and other details the feasibility report needs). */
export async function updateProjectFields(pid, patch) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  for (const k of ['dcCable','acCable','frontLegHeight','rearLegHeight']) {const v=patch?.[k];if(v!=null&&String(v).trim()!==''&&(!Number.isFinite(Number(v))||Number(v)<0))throw new Error('Enter a valid, non-negative material measurement');}
  for (const [k, raw] of Object.entries(patch || {})) {
    if (!DOC_FIELDS.includes(k)) continue;
    const v = k === 'kwp' || k === 'value' ? Number(String(raw).replace(/[^0-9.]/g, '')) || 0 : String(raw ?? '').trim();
    if ((p[k] ?? '') === v) continue;
    const before = p[k];
    p[k] = v;
    log(p, { type: 'note', text: `${DOC_FIELD_LABEL[k]} changed: ${before || '—'} → ${v || '—'}` });
  }
  persist(); return delay(summary(p));
}

// ---------- Sunpay's own stamp, signature and bank details (app_state 'company_assets') ----------
const ASSET_KEYS = ['stamp', 'sign', 'epc', 'account', 'ifsc'];
export async function getCompanyAssets() {
  if (!auth) deny('Please sign in');
  return delay(clone(load().company_assets || {}));
}
export async function saveCompanyAssets(patch) {
  if (session.role !== 'Admin') deny('Only Admin can change the company stamp and signature');
  const d = load();
  const next = { ...(d.company_assets || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (!ASSET_KEYS.includes(k)) continue;
    if (v === null || v === '') delete next[k]; else next[k] = typeof v === 'string' ? v.trim() : v;
  }
  next.updatedAt = new Date().toISOString();
  d.company_assets = next;
  persist(); return delay(clone(next));
}

// ---------- customer signing link (agreement) and proposal acceptance link ----------
const SIGN_DAYS = 7;
const signUrl = (token) => `${location.origin}${location.pathname}#/sign/${token}`;
/** The customer and link kind for a public token: { p, kind: 'agreement' | 'proposal', r }. */
function findByToken(token) {
  if (!token) return null;
  for (const p of load().projects) {
    if (p.signRequest && p.signRequest.token === token) return { p, kind: 'agreement', r: p.signRequest };
    if (p.proposalRequest && p.proposalRequest.token === token) return { p, kind: 'proposal', r: p.proposalRequest };
  }
  return null;
}
const expired = (r) => !r || new Date(r.expiresAt).getTime() < Date.now();
/** Status of a customer's signature, for lists: { state: 'signed' | 'sent' | 'expired' | 'none', at }. */
function signStatus(p) {
  if (p.signature?.png) return { state: 'signed', at: p.signature.at, method: p.signature.method };
  const r = p.signRequest;
  if (r && r.status === 'sent') return { state: expired(r) ? 'expired' : 'sent', at: r.createdAt, expiresAt: r.expiresAt };
  return { state: 'none' };
}
export async function getSignStatus(pid) { const p = find(pid); if (!inScope(p)) deny(); return delay(signStatus(p)); }
/** Makes a new signing link (replacing any older one) and returns its URL. */
export async function createSignLink(pid) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  const now = Date.now();
  p.signRequest = { token: crypto.randomUUID(), createdAt: new Date(now).toISOString(), expiresAt: new Date(now + SIGN_DAYS * DAY).toISOString(), status: 'sent' };
  log(p, { type: 'document', text: 'Signing link sent' });
  persist();
  return delay({ kind: 'agreement', url: signUrl(p.signRequest.token), expiresAt: p.signRequest.expiresAt, phone: p.phone, name: p.name });
}
/**
 * PUBLIC (no sign-in): what the link page may show.
 * Agreement: { kind, firstName, kwp, status, expired }. Proposal: the same plus { name, city, proposal } (the sent snapshot).
 * With Supabase this comes from the sign_request() database function (supabase/004_proposal.sql), which returns
 * exactly these fields. NOTE: in local (browser storage) mode the whole demo database is in the browser anyway.
 */
export async function getSignRequest(token) {
  if (remote.enabled) {
    const r = await remote.signRequest(token);
    return r ? { ...r, kind: r.kind || 'agreement', kwp: Number(r.kwp) || r.kwp } : { status: 'unknown' };
  }
  const hit = findByToken(token);
  if (!hit) return delay({ status: 'unknown' });
  const { p, kind, r } = hit;
  const base = { kind, firstName: String(p.name || '').split(/\s+/)[0], kwp: p.kwp, status: r.status === 'signed' || r.usedAt ? 'signed' : r.status, expired: expired(r) };
  if (kind === 'agreement') return delay(base);
  return delay({ ...base, kwp: p.proposal?.inputs?.kwp ?? p.kwp, name: p.name, city: p.city, proposal: clone(p.proposal || null) });
}
const linkError = (code, kind) => {
  const msg = kind === 'proposal'
    ? { used: 'This proposal is already accepted', expired: 'This proposal link has expired', unknown: 'This link is not valid' }
    : { used: 'This agreement is already signed', expired: 'This signing link has expired', unknown: 'This signing link is not valid' };
  const e = new Error(msg[code] || code); e.code = code; return e;
};
/** PUBLIC (no sign-in): stores the customer's signature (agreement) or acceptance (proposal) once, if the link is valid, unexpired and unused. */
export async function submitSignature(token, png, method) {
  if (remote.enabled) {
    // The public page has no CRM data loaded; the database function checks the link and saves the signature.
    if (!/^data:image\/png;base64,/.test(String(png || ''))) { const e = new Error('Signature is missing'); e.code = 'bad'; throw e; }
    const t = await trimToInk(png);
    if (t.empty) { const e = new Error('The signature is empty'); e.code = 'bad'; throw e; }
    try { return await remote.submitSignature(token, t.url, method === 'photo' ? 'photo' : 'drawn'); } catch (x) {
      const code = /already (signed|accepted)/i.test(x.message) ? 'used' : /expired/i.test(x.message) ? 'expired' : /unknown/i.test(x.message) ? 'unknown' : 'bad';
      if (code === 'bad') { const e = new Error(x.message); e.code = 'bad'; throw e; }
      throw linkError(code);
    }
  }
  const hit = findByToken(token);
  if (!hit) throw linkError('unknown');
  const { p, kind, r } = hit;
  if (r.status === 'signed' || r.usedAt) throw linkError('used', kind);
  if (expired(r)) throw linkError('expired', kind);
  if (!/^data:image\/png;base64,/.test(String(png || ''))) { const e = new Error('Signature is missing'); e.code = 'bad'; throw e; }
  const trimmed = await trimToInk(png);
  if (trimmed.empty) { const e = new Error('The signature is empty'); e.code = 'bad'; throw e; }
  const at = new Date().toISOString();
  const how = method === 'photo' ? 'photo' : 'drawn';
  if (kind === 'proposal') {
    if (!p.proposal) throw linkError('unknown', kind);
    p.proposal.accepted = { png: trimmed.url, at, method: how };
    p.proposalRequest = { ...r, status: 'signed', usedAt: at };
    p.quotation = { ...(p.quotation || { version: p.proposal.version, sentAt: p.proposal.createdAt }), status: 'approved', approvedAt: at };
    const q = item(p, 'sales', 'quotation');
    if (q) { q.status = 'done'; q.updatedAt = at; }
    log(p, { type: 'document', by: p.name, text: `Customer accepted proposal v${p.proposal.version} (${how})` });
    persist();
    return delay(true);
  }
  p.signature = { png: trimmed.url, at, method: how };
  p.signRequest = { ...r, status: 'signed', usedAt: at };
  log(p, { type: 'document', by: p.name, text: `Customer signed via link (${how})` });
  persist();
  return delay(true);
}

// ---------- residential proposal (settings in app_state 'proposal_settings') ----------
/** Proposal settings merged over the placeholder defaults; `placeholder` stays true until an Admin saves once. */
export async function getProposalSettings() {
  if (!auth) deny('Please sign in');
  return delay(mergeSettings(clone(load().proposal_settings || {})));
}
export async function saveProposalSettings(patch) {
  if (session.role !== 'Admin') deny('Only Admin can change the proposal settings');
  const d = load();
  const next = { ...(d.proposal_settings || {}), ...cleanSettings(patch || {}) };
  next.savedAt = new Date().toISOString();
  next.savedBy = auth?.name || auth?.email || 'Admin';
  d.proposal_settings = next;
  persist();
  return delay(mergeSettings(clone(next)));
}
/** Proposal state for lists and the Documents hub: { state: 'none' | 'sent' | 'expired' | 'accepted', version, at }. */
export function proposalStatus(p) {
  const pr = p?.proposal;
  if (!pr) return { state: 'none' };
  if (pr.accepted?.at) return { state: 'accepted', version: pr.version, at: pr.accepted.at, number: pr.number };
  const r = p.proposalRequest;
  return { state: r && r.status === 'sent' && expired(r) ? 'expired' : 'sent', version: pr.version, at: pr.createdAt, number: pr.number, expiresAt: r?.expiresAt };
}
/**
 * "Send for acceptance": saves a snapshot of the proposal on the customer (new version), makes a one-time
 * acceptance link valid for the proposal's validity days, and marks the quotation as sent (unless already approved).
 */
export async function sendProposal(pid, inputs) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  const model = computeProposal(inputs);
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const version = (p.proposal?.version || 0) + 1;
  if (p.proposal) {
    p.proposalHistory = [...(p.proposalHistory || []), { version: p.proposal.version, number: p.proposal.number, createdAt: p.proposal.createdAt, totals: p.proposal.totals, acceptedAt: p.proposal.accepted?.at || null }];
  }
  p.proposal = { version, number: proposalNumber(p.crn, version), createdAt, inputs: clone(inputs), totals: proposalTotals(model) };
  const days = Math.max(1, Number(inputs.validityDays) || 15);
  p.proposalRequest = { token: crypto.randomUUID(), createdAt, expiresAt: new Date(now + days * DAY).toISOString(), status: 'sent' };
  log(p, { type: 'document', text: `Proposal v${version} sent (${p.proposal.number}, ${inputs.kwp} kWp, ₹${Math.round(model.price).toLocaleString('en-IN')})` });
  if (!p.quotation || p.quotation.status !== 'approved') {
    p.quotation = { status: 'sent', version, sentAt: createdAt, total: model.price, kwp: inputs.kwp };
    const q = item(p, 'sales', 'quotation');
    if (q && q.status !== 'done') { q.status = 'waiting_customer'; q.updatedAt = nowIso(); }
  }
  persist();
  return delay({ kind: 'proposal', url: signUrl(p.proposalRequest.token), expiresAt: p.proposalRequest.expiresAt, phone: p.phone, name: p.name, kwp: inputs.kwp, version, number: p.proposal.number });
}

// ---------- documents uploaded to the customer's Drive folder ----------
// After downloading a document and uploading it to the customer's Google Drive folder, staff paste the file's
// link here; it then shows as an "Open in Drive" button. The matching Drive checklist slot is ticked too.
const DOC_SLOT = { quote: 'Quotation', proposal: 'Quotation', feas: 'Feasibility report', agreement: 'DISCOM application form', invoice: 'Invoice' };
export const DOC_TITLES = { quote: 'Quotation', proposal: 'Residential proposal', feas: 'Feasibility report', name: 'Name declaration', agreement: 'DISCOM submission', invoice: 'Bill / invoice' };
export async function setDocLink(pid, key, url) {
  const p = find(pid);
  if (!inScope(p) || !(can(session.role, 'edit') || can(session.role, 'link_docs'))) deny();
  const u = String(url || '').trim();
  if (u && !/^https:\/\/\S+$/i.test(u)) throw new Error('Paste the full link from Google Drive (it starts with https://)');
  p.docLinks = { ...(p.docLinks || {}) };
  if (u) p.docLinks[key] = { url: u, at: nowIso(), by: auth?.name || identityLabel() || session.role };
  else delete p.docLinks[key];
  const slot = DOC_SLOT[key] && (p.drive || []).find((d) => d.slot === DOC_SLOT[key]);
  if (slot) { slot.present = Boolean(u) || slot.present; if (u) { slot.url = u; slot.modified = nowIso(); } }
  log(p, { type: 'document', text: u ? `${DOC_TITLES[key] || key} uploaded to the Drive folder` : `${DOC_TITLES[key] || key}: Drive link removed` });
  persist();
  return delay(clone(p.docLinks));
}

// ---------- stages ----------
/** Moves a customer to one of the stages in lib/stages.js and notes it on their timeline. */
export async function setStage(pid, stageId) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  if (!STAGE_IDS.includes(stageId)) throw new Error('Unknown stage');
  const from = stageById(stageOf(p)).label;
  if (stageOf(p) === stageId && p.stage) return delay(summary(p));
  p.stage = stageId; p.stageAt = new Date().toISOString();
  log(p, { type: 'status', text: `Stage: ${from} → ${stageById(stageId).label}` });
  persist();
  return delay(summary(p));
}
/** How many of the customers this person can see are in each stage. */
export async function stageCounts() {
  const list = scoped();
  return delay(STAGES.map((s) => ({ id: s.id, label: s.label, count: list.filter((p) => stageOf(p) === s.id).length })));
}

export async function resetUserPassword(userId, password) {
  if (realRole() !== 'Admin') deny();
  if (!remote.enabled) throw new Error('Password changes require a connected account');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Password must be between 8 and 128 characters');
  return remote.resetUserPassword(userId, password);
}

export async function rescheduleInstallation(pid, date, reason = '', team = null) {
  const p = find(pid);
  if (!inScope(p) || !can(session.role, 'edit')) deny();
  if (item(p, 'supply', 'installation').status === 'done') throw new Error('This installation is already completed');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Choose a valid installation date');
  if (team && !TEAMS.some((t) => t.id === team)) throw new Error('Choose a valid installation team');
  if (date === p.installDate) {
    if (!team || team === p.team) throw new Error('Choose a different date or team');
    const before = p.team; p.team = team; log(p, { type: 'note', text: `Installation team changed: ${before || 'Unassigned'} → ${team}` }); persist(); return delay(true);
  }
  if (team) p.team = team;
  const previousDate = p.installDate || null;
  p.installDate = date;
  log(p, { type: previousDate ? 'installation_rescheduled' : 'note', previousDate, newDate: date, reason: String(reason).trim(), text: `Installation ${previousDate ? 'rescheduled from ' + previousDate : 'scheduled'} to ${date}${reason.trim() ? ': ' + reason.trim() : ''}` });
  persist();
  return delay(true);
}

let deliveryBusy = false;
async function deliveryState() {
  if (remote.enabled) {
    const state = await remote.fetchDeliveryStock();
    return state;
  }
  return { inventory: load().inventory, batches: load().delivery_batches || [] };
}
export async function listDeliveryBatches() {
  const state = await deliveryState();
  const ids = new Set(scoped().map((p) => p.id));
  return clone(state.batches.filter((b) => b.customers.every((c) => ids.has(c.id))));
}
export async function deliveryCandidates() {
  return delay(scoped().filter((p) => stageOf(p) === 'pending_installation' || p.installDate || item(p, 'supply', 'reservation').status !== 'not_started').map((p) => ({ ...summary(p), lines: bomFor(p) })));
}
export async function deliveryBatchAction(action, payload) {
  if (!['Admin', 'Office Staff'].includes(realRole()) || !apiDeliveryScope(payload, action)) deny();
  if (deliveryBusy) throw new Error('A delivery update is already being saved');
  deliveryBusy = true;
  try {
    const before = await deliveryState();
    if (action === 'create') {
      const customers = payload.customerIds.map((id) => find(id));
      if (!customers.length || customers.some((p) => !p || !inScope(p))) deny();
      if (!TEAMS.some((t) => t.id === payload.team)) throw new Error('Choose an installation team');
      payload = { id: crypto.randomUUID(), vehicle: String(payload.vehicle || '').trim().toUpperCase(), driver: String(payload.driver || '').trim(), team: payload.team, date: payload.date,
        customers: customers.map((p) => ({ id: p.id, name: p.name, crn: p.crn, city: p.city })), lines: combineBOM(customers.map((p) => ({ lines: bomFor(p) }))) };
    } else {
      const batch = before.batches.find((b) => b.id === payload.id);
      if (!batch || batch.customers.some((c) => !inScope(find(c.id)))) deny();
    }
    const after = changeDelivery(before, action, payload, nowIso());
    if (remote.enabled) await remote.commitDeliveryStock(before, after);
    load().inventory = after.inventory; load().delivery_batches = after.batches;
    persist();
    return true;
  } finally { deliveryBusy = false; }
}
function apiDeliveryScope(payload, action) { return action !== 'create' || Array.isArray(payload.customerIds); }

export async function saveWarrantyIssue(pid, issueId, input) {
  const p = find(pid);
  if (!p || !inScope(p) || !(can(session.role, 'edit')||can(session.role,'field'))) deny();
  const at = nowIso();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const by = auth?.name || identityLabel() || session.role;
  p.warrantyIssues = recordWarrantyIssue(p.warrantyIssues, issueId, input, { at, today, by, newId: crypto.randomUUID() });
  const issue = p.warrantyIssues.find((i) => i.id === issueId) || p.warrantyIssues[0];
  log(p, { type: 'warranty_issue', text: `Warranty issue ${issueId ? 'updated' : 'raised'}: ${issue.title} · ${issue.status.replace('_', ' ')}` });
  persist(); return delay(true);
}

export async function moveToNextStage(pid, expectedStage) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  const next = confirmedNextStage(STAGES,stageOf(p),expectedStage);
  return setStage(pid, next.id);
}
export async function getWarranty(pid) {
  const p = find(pid);
  if (!p || !inScope(p)) deny();
  return { ...warrantyRecord(p), teamName: TEAMS.find((t) => t.id === p.team)?.name || '' };
}

export async function saveDocumentWorkflow(pid, fields) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  if (!(fields.scheme === '' || operationsOptions(load().operations_settings||{},'schemes').some((o)=>o.value===fields.scheme)) || !operationsOptions(load().operations_settings||{},'payment_methods',true).some((o)=>o.value===fields.paymentMethod)) throw new Error('Choose a valid scheme and payment method');
  const previous = `${p.scheme || 'Not set'} / ${p.paymentMethod}`;
  p.scheme = fields.scheme; p.paymentMethod = fields.paymentMethod;
  log(p, { type: 'note', text: `Document requirements updated: ${previous} → ${p.scheme || 'Not set'} / ${p.paymentMethod}` });
  persist(); return delay(true);
}

export async function listFinanceTracking(kind) {
  if (!['subsidy','loan'].includes(kind) || !can(session.role, 'internal_money')) deny();
  return delay(scoped().filter((p) => eligibleTracking(p, kind)).map((p) => ({ ...summary(p), tracking: { ...(p.financeTracking?.[kind] || {}), status: trackingStatus(p, kind) }, legacyHistory: kind === 'subsidy' ? clone((p.subsidy || []).filter((event) => !event.trackingId)) : [], scheme: p.scheme || '', documentLinks: clone(p.docLinks || {}), hasProposal: !!p.proposal, hasSignature: !!p.signature?.png })));
}
export async function financeTrackingCounts() {
  if (!can(session.role, 'internal_money')) return {};
  return Object.fromEntries(['subsidy','loan'].map((kind) => {
    const rows = scoped().filter((p) => eligibleTracking(p, kind));
    return [kind, { all: rows.length, ...Object.fromEntries(TRACKING_STATUSES[kind].map(([key]) => [key, rows.filter((p) => trackingStatus(p, kind) === key).length])) }];
  }));
}
export async function updateFinanceTracking(pid, kind, form) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'money_edit') || !['subsidy','loan'].includes(kind) || !eligibleTracking(p, kind)) deny();
  const at = nowIso();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  p.financeTracking ||= {};
  p.financeTracking[kind] = appendTracking(p.financeTracking[kind], kind, form, { at, today, id: crypto.randomUUID(), by: auth?.name || identityLabel() || session.role, previousStatus: trackingStatus(p, kind) });
  if (kind === 'subsidy') {
    const label = TRACKING_STATUSES.subsidy.find(([key]) => key === form.status)[1];
    p.subsidy ||= []; p.subsidy.push({ at: form.date, status: label, trackingId: p.financeTracking.subsidy.history.at(-1).id });
    if (form.status === 'received') setItem(p, 'finance', 'subsidy', 'done');
  }
  log(p, { type: 'note', text: `${kind === 'subsidy' ? 'Subsidy' : 'Loan'} tracking: ${form.status.replaceAll('_',' ')} · ${form.date}${form.note ? ' · ' + form.note : ''}` });
  persist(); return delay(true);
}
export async function updateLoanDocument(pid, key, status, date, reference = '') {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'money_edit') || !eligibleTracking(p, 'loan') || !LOAN_DOCS.some(([k]) => k === key) || (key === 'pm_surya_ghar' && p.scheme !== 'pm_surya_ghar')) deny();
  if (!['pending','ready','submitted'].includes(status)) throw new Error('Choose a valid document status');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Choose a valid submission date');
  const previousStatus = trackingStatus(p, 'loan');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (date > today) throw new Error('Submission date cannot be in the future');
  p.financeTracking ||= {}; p.financeTracking.loan ||= {};
  const loan = p.financeTracking.loan;
  loan.documents ||= {};
  const entry = { status, date, reference: String(reference).trim(), at: nowIso(), by: auth?.name || session.role };
  const previous = loan.documents[key];
  loan.documents[key] = { ...entry, history: [...(previous?.history || []), entry] };
  const required = LOAN_DOCS.filter(([k]) => k !== 'pm_surya_ghar' || p.scheme === 'pm_surya_ghar');
  if (['documents_pending','documents_submitted'].includes(previousStatus)) {
    const nextStatus = required.every(([k]) => loan.documents[k]?.status === 'submitted') ? 'documents_submitted' : 'documents_pending';
    if (nextStatus !== previousStatus) p.financeTracking.loan = appendTracking(loan, 'loan', { status: nextStatus, date, reference, note: 'Updated from the loan document checklist' }, { at: nowIso(), today, id: crypto.randomUUID(), by: auth?.name || session.role, previousStatus });
  }
  log(p, { type: 'document', text: `Loan paperwork: ${LOAN_DOCS.find(([k]) => k === key)[1]} · ${status} · ${date}` });
  persist(); return delay(true);
}

export async function listProcurementCustomers() {
  return delay(scoped().filter((p) => ['material_procurement','pending_installation'].includes(stageOf(p)) || p.bomVersions?.length).map((p) => ({ ...summary(p), bom: clone(p.bomVersions?.at(-1) || null) })));
}
export async function saveCustomerBOM(pid, input) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  const versions = p.bomVersions || [];
  const version = makeBOMVersion(versions, input, load().inventory, auth?.name || identityLabel() || session.role, nowIso(), crypto.randomUUID());
  p.bomVersions = [...versions, version];
  setItem(p, 'supply', 'bom', 'done');
  log(p, { type: 'document', text: `Material procurement BOM v${version.version} saved · ${version.lines.length} materials` });
  persist(); return delay(clone(version));
}
export async function recordBOMAction(pid, versionId, action, input = {}) {
  const p = find(pid);
  if (!p || !inScope(p) || !(can(session.role, 'edit') || (action !== 'uploaded' && can(session.role, 'export')))) deny();
  p.bomVersions = changeBOMVersion(p.bomVersions, versionId, action, input, auth?.name || identityLabel() || session.role, nowIso());
  const version = p.bomVersions.find((v) => v.id === versionId);
  log(p, { type: 'document', text: `BOM v${version.version}: ${action.replaceAll('_',' ')}` });
  persist(); return delay(true);
}

export async function documentQueueCustomers() {
  if (!can(session.role, 'internal_money')) deny();
  return delay(scoped().map((p) => {
    const rules = documentRules({ ...p, summary: { stage: stageOf(p) } });
    const state = (key, request, signature) => {
      const link = p.docLinks?.[key];
      if (link && (!request || link.requestToken === request.token)) return 'File saved to customer';
      if (signature?.png) return 'Returned · download and save file';
      if (request) return p.documentDelivery?.[request.token] ? 'Link sent · awaiting customer' : 'Link prepared · ready to send';
      return 'Document to prepare';
    };
    return { ...summary(p), documents: DOCUMENT_TASKS.filter(([key]) => rules.classify(key).bucket === 'current' || preparedDocumentKeys(p).includes(key)).map(([key,title]) => ({key,title,state:documentTaskState(p,key),prepared:preparedDocumentKeys(p).includes(key),inbox:documentInboxEntry(p,key)})), queues: ['quote','feas','agreement'].filter((key) => rules.classify(key).bucket === 'current'), states: { quote: state('proposal', p.proposalRequest, p.proposal?.accepted), agreement: state('agreement', p.signRequest, p.signature), feas: state('feas') } };
  }));
}
export async function recordDocumentSent(pid, kind, token) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  const request = kind === 'proposal' ? p.proposalRequest : kind === 'agreement' ? p.signRequest : null;
  if (!request || request.token !== token) throw new Error('The document link changed. Reopen this document.');
  p.documentDelivery ||= {};
  p.documentDelivery[token] ||= { at: nowIso(), by: auth?.name || identityLabel() || session.role };
  log(p, { type: 'document', text: `${kind === 'proposal' ? 'Quotation acceptance' : 'DISCOM signature'} link marked as sent by staff` });
  persist(); return delay(true);
}
export async function saveReturnedDocument(pid, kind, token, url) {
  const p = find(pid);
  if (!p || !inScope(p) || !can(session.role, 'edit')) deny();
  const request = kind === 'proposal' ? p.proposalRequest : kind === 'agreement' ? p.signRequest : null;
  if (!request || request.token !== token) throw new Error('The document link changed. Reopen this document.');
  const returned = kind === 'proposal' ? p.proposal?.accepted : p.signature;
  if (!returned?.png) throw new Error('The customer has not completed this document yet');
  if (!String(url || '').trim()) throw new Error('Paste the uploaded signed PDF link');
  await setDocLink(pid,kind,url);
  if (p.docLinks?.[kind]) p.docLinks[kind].requestToken = token;
  persist(); return delay(true);
}

export async function financeDashboard() {
  if (!can(session.role,'internal_money')) deny();
  const projects=load().projects.filter(scopeFn(session)); const today=indiaDay();
  const receipts=projects.flatMap((p)=>(p.payments||[]).map((payment,index)=>({...payment,id:payment.id||p.id+'-'+index,pid:p.id,name:p.name,crn:p.crn,day:indiaDay(payment.date)}))).sort((a,b)=>b.day.localeCompare(a.day));
  const expected=projects.filter(p=>!p.deletedAt).flatMap((p)=>expectedReceipts(p).map((entry)=>({...entry,pid:p.id,name:p.name,crn:p.crn,dueNow:dueMilestones(p).some((m)=>m===p.schedule[entry.index])})));
  return {today,receipts,expected,receivedToday:Math.round(receipts.filter((r)=>r.day===today).reduce((s,r)=>s+r.amount,0)*100)/100,dueNow:projects.filter(p=>!p.deletedAt).reduce((s,p)=>s+dueNow(p),0),outstanding:projects.filter(p=>!p.deletedAt).reduce((s,p)=>s+Math.max(0,p.value-paid(p)),0),customers:projects.filter(p=>!p.deletedAt).map((p)=>({id:p.id,name:p.name,crn:p.crn,phone:p.phone,city:p.city,scheme:p.scheme||'',value:p.value,paid:paid(p),balance:Math.max(0,p.value-paid(p))}))};
}
export async function addCustomerReceipt(pid,form,requestId) {
  const p=find(pid);
  if (!p||!inScope(p)||!can(session.role,'money_edit')) deny();
  if (!requestId) throw new Error('Reopen the payment form');
  if (p.payments.some((payment)=>payment.requestId===requestId)) return delay(true);
  const receipt=cleanReceipt(form,Math.max(0,p.value-paid(p)),indiaDay(),operationsOptions(load().operations_settings||{},'receipt_modes',true).map((o)=>o.value));
  if (receipt.ref&&p.payments.some((payment)=>payment.ref===receipt.ref)) throw new Error('This payment reference is already recorded for this customer');
  const by=auth?.name||identityLabel()||session.role;
  const milestoneIndex = form.milestoneIndex === '' || form.milestoneIndex == null ? null : Number(form.milestoneIndex);
  if(milestoneIndex !== null) { const target = paymentMilestones(p).find((m)=>m.index===milestoneIndex); if(!target||receipt.amount>target.remaining+0.001)throw new Error('Payment exceeds the remaining amount for this milestone'); }
  p.payments.push({...receipt,...(milestoneIndex!==null?{milestoneIndex}:{}),id:crypto.randomUUID(),requestId,recordedAt:nowIso(),recordedBy:by});
  log(p,{type:'payment',text:`₹${receipt.amount.toLocaleString('en-IN')} received · ${receipt.mode}${receipt.ref?' · '+receipt.ref:''}${receipt.note?' · '+receipt.note:''}`});
  persist(); return delay(true);
}
export async function setExpectedPaymentDate(pid,index,date) {
  const p=find(pid);
  if (!p||!inScope(p)||!can(session.role,'money_edit')) deny();
  if (!p.schedule?.[index]||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date) throw new Error('Choose a valid expected payment date');
  p.schedule[index].expectedDate=date;
  log(p,{type:'note',text:`Expected payment date: ${p.schedule[index].label} → ${date}`});persist();return delay(true);
}
export async function getOperationsSettings() { if (!can(session.role,'internal_money')) deny(); const saved=load().operations_settings||{}; return delay({brands:clone(saved.brands||[]),models:clone(saved.models||[]),registrations:clone(saved.registrations||[])}); }
export async function addOperationsEntry(kind,entry) {
  if (!['Admin','Office Staff'].includes(realRole())) deny();
  if (!['brands','models','registrations'].includes(kind)) throw new Error('Unknown operations category');
  const savedSettings=load().operations_settings||{}; const settings={brands:savedSettings.brands||[],models:savedSettings.models||[],registrations:savedSettings.registrations||[]};
  const name=String(entry.name||'').trim(); if (!name) throw new Error('Enter a name');
  if (settings[kind].some((item)=>item.name.toLowerCase()===name.toLowerCase()&&item.type===entry.type)) throw new Error('This entry is already in the list');
  const saved={id:crypto.randomUUID(),name,type:['panel','inverter'].includes(entry.type)?entry.type:'registration',brand:String(entry.brand||'').trim(),rating:String(entry.rating||'').trim(),registrationType:String(entry.registrationType||'').trim(),registrationNumber:String(entry.registrationNumber||'').trim(),expiry:String(entry.expiry||'').trim(),notes:String(entry.notes||'').trim(),createdAt:nowIso(),createdBy:auth?.name||session.role};
  if (saved.expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(saved.expiry)||Number.isNaN(Date.parse(saved.expiry))||new Date(saved.expiry).toISOString().slice(0,10)!==saved.expiry)) throw new Error('Enter a valid expiry date');
  load().operations_settings={...savedSettings,...settings,[kind]:[...settings[kind],saved]}; persist(); return delay(true);
}

export async function recordDocumentDownload(pid,key,token) {
  const p=find(pid);
  if(!p||!inScope(p)||!(can(session.role,'edit')||can(session.role,'export')))deny();
  if(!['quote','agreement','feas','name'].includes(key))throw new Error('Unknown document');
  const request=key==='quote'?p.proposalRequest:key==='agreement'?p.signRequest:null;
  if(request&&request.token!==token)throw new Error('This document version changed. Download the latest version.');
  p.documentDownloads||={};
  p.documentDownloads[request?.token||key]={at:nowIso(),by:auth?.name||identityLabel()||session.role};
  log(p,{type:'document',text:`${key==='quote'?'Signed quotation':key==='feas'?'Feasibility report':key==='name'?'Name declaration':'Signed DISCOM document'} downloaded`});persist();return delay(true);
}

export async function getDropdownOptions(category) { return delay(operationsOptions(load().operations_settings||{},category)); }
export async function getOperationsCatalogue() {
  if(!can(session.role,'internal_money'))deny();
  const settings=load().operations_settings||{};
  return delay({categories:OPERATIONS_CATEGORIES.map((category)=>({...category,options:operationsOptions(settings,category.key,true)})),registrations:clone(settings.registrations||[]),history:clone(settings.history||[])});
}
export async function updateOperationsOption(category,action,input) {
  if(!['Admin','Office Staff'].includes(realRole()))deny();
  load().operations_settings=changeOperationsOption(load().operations_settings||{},category,action,input,auth?.name||session.role,nowIso(),crypto.randomUUID());
  persist();return delay(true);
}

export async function saveCustomerVerification(pid,key,checked) {
  const p=find(pid);if(!p||!inScope(p)||!can(session.role,'edit'))deny();
  if(!['consumer_number','account_name','bank_details','geo_photo'].includes(key))throw new Error('Unknown verification check');
  p.verification||={};p.verification[key]={checked:!!checked,at:nowIso(),by:auth?.name||identityLabel()||session.role};
  log(p,{type:'note',text:`Verification: ${key.replaceAll('_',' ')} ${checked?'checked':'reopened'}`});persist();return delay(true);
}
export async function saveCustomerPaymentPlan(pid,entries) {
  const p=find(pid);if(!p||!inScope(p)||!can(session.role,'money_edit'))deny();
  const plan=cleanPaymentPlan(entries,p.value);
  for(const payment of p.payments)if(Number.isInteger(payment.milestoneIndex)&&payment.milestoneIndex>=plan.length)throw new Error('Keep milestones that already have payments assigned');
  p.schedule=plan;log(p,{type:'note',text:`Payment plan updated · ${plan.length} milestones`});persist();return delay(true);
}

export async function saveLoanNameVerification(pid,input) {
 const p=find(pid);if(!p||!inScope(p)||!can(session.role,'edit'))deny();
 const checked=cleanNameVerification(input);const verifiedAt=nowIso(),verifiedBy=auth?.name||identityLabel()||session.role;
 p.nameCheck={...p.nameCheck,...checked,verifiedAt,verifiedBy};
 setItem(p,'grid','name_check',checked.match||checked.resolution?'done':'blocked');
 p.verification||={};p.verification.account_name={checked:!!(checked.match||checked.resolution),at:verifiedAt,by:verifiedBy};
 log(p,{type:'note',text:`Loan bill/bank name check: ${checked.match?'Names match':checked.resolution?'Verified as same customer':'Mismatch requires attention'}`});persist();return delay(true);
}

// Soft deletion retains the entire JSON record; restoring never recreates customer data.
export async function listTrash(){
 if(!['Admin','Office Staff','Finance'].includes(session.role))deny();
 return delay(load().projects.filter(p=>p.deletedAt&&scopeFn(session)(p)).map(p=>({id:p.id,name:p.name,crn:p.crn,deletedAt:p.deletedAt,deletedBy:p.deletedBy,reason:p.deletedReason})).sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt)));
}
export async function trashCustomer(pid,reason){
 const p=find(pid);if(!p||!inScope(p)||!['Admin','Office Staff'].includes(session.role))deny();
 Object.assign(p,archiveCustomer(p,{reason,at:nowIso(),by:auth?.name||identityLabel()||session.role}));
 log(p,{type:'status',text:`Moved to Trash: ${p.deletedReason}`});persist();return delay(true);
}
export async function restoreCustomer(pid){
 const p=find(pid);if(!p||!p.deletedAt||!scopeFn(session)(p)||!['Admin','Office Staff'].includes(session.role))deny();
 const restored=restoreArchivedCustomer(p,{at:nowIso(),by:auth?.name||session.role});delete p.deletedAt;delete p.deletedBy;delete p.deletedReason;Object.assign(p,restored);
 log(p,{type:'status',text:'Customer restored from Trash'});persist();return delay(true);
}

// Supporting documents reuse the customer Drive slots and existing generated-file links.
export async function saveCustomerDocument(pid,key,patch) {
  const p=find(pid);
  if(!inScope(p)||!(can(session.role,'edit')||can(session.role,'link_docs')))deny();
  const doc=documentDefinition(key),by=auth?.name||identityLabel()||session.role,at=nowIso();
  const drive=changeCustomerDocument(p,key,patch,by,at);
  if(patch.url!==undefined&&doc.generated)await setDocLink(pid,doc.generated==='quote'?'proposal':doc.generated,patch.url);
  p.drive=drive;
  log(p,{type:'document',text:`${doc.label}: ${patch.url!==undefined?'Drive file link saved':patch.checked?'marked received':'marked pending'}`});
  persist();return delay(true);
}
export async function saveCustomerResource(pid,kind,url) {
  const p=find(pid);
  if(!inScope(p)||!(can(session.role,'edit')||can(session.role,'link_docs')))deny();
  if(!['folder','location'].includes(kind))throw new Error('Unknown customer link');
  const field=kind==='folder'?'driveFolder':'siteLocation';
  p[field]=changeCustomerResource(p[field],url,kind,auth?.name||identityLabel()||session.role,nowIso());
  log(p,{type:'document',text:kind==='folder'?'Customer Drive folder link saved':'Customer Google Maps location saved'});
  persist();return delay(true);
}

export async function addDemoCustomers() {
  if(!auth||auth.role!=='Admin'||session.role!=='Admin')deny('Only Admin can add demo customers');
  const data=load();
  const candidates=missingDemoRecords(data.projects,createDemoExpansion(calibrate(generate()),STAGES));
  if(!candidates.length)return {added:0};
  const inserted=cloud()?await remote.insertDemoProjects(candidates):candidates;
  const additions=missingDemoRecords(data.projects,inserted);
  data.projects.push(...additions);
  for(const p of additions)data.activity.unshift({at:p.updatedAt,by:auth.name||'Admin',type:'note',pid:p.id,crn:p.crn,customer:p.name,text:'Synthetic demo customer added'});
  persist();return {added:inserted.length};
}
