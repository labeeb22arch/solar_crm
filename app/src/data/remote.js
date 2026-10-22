// Supabase connection. api.js keeps all the CRM logic and works on an in-memory copy of the data;
// this file loads that copy from Supabase at start-up, saves whatever changed, and passes on live
// changes made by other people. Without the two VITE_SUPABASE_* settings the app stays on browser storage.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const enabled = Boolean(URL && KEY);
// The signed-in user's session is kept in this browser and refreshed automatically. PKCE puts the
// password-reset code in the query string (?code=…), so it never collides with the app's #/ routes.
export const sb = enabled ? createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'solarcrm.auth' },
}) : null;

// ---------- connection status (shown as a small dot in the top bar) ----------
let status = enabled ? 'connecting' : 'local';
let lastError = '';
const statusListeners = new Set();
const setStatus = (s, err = '') => { status = s; lastError = err; statusListeners.forEach((fn) => fn(status, lastError)); };
export const getStatus = () => ({ status, error: lastError });
export function onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }

const fail = (where, error) => { const msg = `${where}: ${error.message || error}`; setStatus('error', msg); return new Error(msg); };

// ---------- load ----------
async function pageAll(table, columns, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(columns).range(from, from + 999);
    if (order) q = q.order(order.col, { ascending: order.asc });
    const { data, error } = await q;
    if (error) throw fail(`Loading ${table}`, error);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** Everything the app needs at start-up. `projects` is empty on a brand-new database. */
export async function fetchAll() {
  const [projects, activity, state] = await Promise.all([
    pageAll('projects', 'data', { col: 'id', asc: true }),
    sb.from('activity').select('data').order('at', { ascending: false }).limit(500),
    sb.from('app_state').select('key,data'),
  ]);
  if (activity.error) throw fail('Loading activity', activity.error);
  if (state.error) throw fail('Loading settings', state.error);
  return {
    projects: projects.map((r) => r.data),
    activity: activity.data.map((r) => r.data),
    state: Object.fromEntries(state.data.map((r) => [r.key, r.data])),
  };
}

// ---------- save ----------
const sentProjects = new Map();          // project id → JSON last saved / received
let syncedActivity = new WeakSet();      // activity entries already in the database
const sentState = new Map();             // app_state key → JSON last saved
const STATE_KEYS = ['inventory', 'attendance', 'views', 'company_assets', 'proposal_settings', 'operations_settings'];
// app_state.data is NOT NULL, so an unset setting (e.g. no saved views yet) is stored as an empty list
// (or an empty object for settings that are objects).
const OBJECT_KEYS = ['company_assets', 'proposal_settings', 'operations_settings'];
const stateVal = (db, k) => db[k] ?? (OBJECT_KEYS.includes(k) ? {} : []);

const projectRow = (p) => ({
  id: p.id, crn: p.crn, name: p.name, phone: p.phone, city: p.city, branch: p.branch, segment: p.type,
  cp: p.cp, dealer: p.dealer, team: p.team, technician: p.technician, data: p, updated_at: new Date().toISOString(),
});

/** Marks the current in-memory data as matching the database (after loading or seeding). */
export function markSynced(db) {
  sentProjects.clear();
  db.projects.forEach((p) => sentProjects.set(p.id, JSON.stringify(p)));
  syncedActivity = new WeakSet(db.activity);
  STATE_KEYS.forEach((k) => sentState.set(k, JSON.stringify(stateVal(db, k))));
}

/** True if the database has any customer at all (an Admin sees every row, so this is reliable for Admins). */
export async function hasAnyProject() {
  const { count, error } = await sb.from('projects').select('id', { count: 'exact', head: true });
  if (error) throw fail('Checking customers', error);
  return (count || 0) > 0;
}

/** First run on an empty database: upload the generated demo data. */
export async function seed(db) {
  setStatus('saving');
  for (let i = 0; i < db.projects.length; i += 100) {
    const { error } = await sb.from('projects').upsert(db.projects.slice(i, i + 100).map(projectRow));
    if (error) throw fail('Uploading demo customers', error);
  }
  const acts = db.activity.slice(0, 500).reverse().map((e) => ({ at: e.at, project: e.pid || null, data: e }));
  for (let i = 0; i < acts.length; i += 250) {
    const { error } = await sb.from('activity').insert(acts.slice(i, i + 250));
    if (error) throw fail('Uploading activity', error);
  }
  const { error } = await sb.from('app_state').upsert(STATE_KEYS.map((k) => ({ key: k, data: stateVal(db, k) })));
  if (error) throw fail('Uploading settings', error);
  markSynced(db);
  setStatus('online');
}

let timer = null;
let pendingDb = null;
let chain = Promise.resolve();
/** Called after every change; batches changes for a moment, then saves only what differs. */
export function scheduleSave(db) {
  pendingDb = db;
  clearTimeout(timer);
  timer = setTimeout(() => { chain = chain.then(() => flush(pendingDb)).catch(() => {}); }, 250);
}
async function flush(db) {
  const changed = db.projects.filter((p) => sentProjects.get(p.id) !== JSON.stringify(p));
  const newActs = db.activity.filter((e) => !syncedActivity.has(e));
  const changedState = STATE_KEYS.filter((k) => k !== 'inventory' && sentState.get(k) !== JSON.stringify(stateVal(db, k)));
  if (!changed.length && !newActs.length && !changedState.length) return;
  setStatus('saving');
  if (changed.length) {
    const { error } = await sb.from('projects').upsert(changed.map(projectRow));
    if (error) throw fail('Saving customers', error);
    changed.forEach((p) => sentProjects.set(p.id, JSON.stringify(p)));
  }
  if (newActs.length) {
    const { error } = await sb.from('activity').insert(newActs.slice().reverse().map((e) => ({ at: new Date().toISOString(), project: e.pid || null, data: e })));
    if (error) throw fail('Saving activity', error);
    newActs.forEach((e) => syncedActivity.add(e));
  }
  if (changedState.length) {
    const { error } = await sb.from('app_state').upsert(changedState.map((k) => ({ key: k, data: stateVal(db, k), updated_at: new Date().toISOString() })));
    if (error) throw fail('Saving settings', error);
    changedState.forEach((k) => sentState.set(k, JSON.stringify(stateVal(db, k))));
  }
  setStatus('online');
}

/** Next CRN / Project ID number, handed out by the database so two people never get the same one. */
export async function nextProjectNumber() {
  const { data, error } = await sb.rpc('next_project_number');
  if (error) throw fail('Getting the next CRN', error);
  return Number(data);
}

// ---------- live changes from other people ----------
/** Calls `fn(project)` when someone else adds or changes a customer. */
export function watchProjects(fn) {
  const ch = sb.channel('projects-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (msg) => {
      const p = msg.new?.data;
      if (!p) return;
      const json = JSON.stringify(p);
      if (sentProjects.get(p.id) === json) return;           // our own save coming back
      sentProjects.set(p.id, json);
      fn(p);
    })
    .subscribe();
  return () => sb.removeChannel(ch);
}

/** Uploads any shared setting the database does not have yet (e.g. after an interrupted first run). */
export async function fillMissingState(db, haveKeys) {
  const missing = STATE_KEYS.filter((k) => !haveKeys.includes(k));
  if (!missing.length) return;
  const { error } = await sb.from('app_state').upsert(missing.map((k) => ({ key: k, data: stateVal(db, k) })));
  if (error) throw fail('Uploading settings', error);
}

/** Finished loading: marks the connection as working. */
export const ready = () => setStatus('online');

// ---------- team chat ----------
export async function listChat(limit = 200) {
  const { data, error } = await sb.from('chat_messages').select('*').order('at', { ascending: false }).limit(limit);
  if (error) throw fail('Loading chat', error);
  return data.reverse();
}
export async function postChat(msg) {
  const { data, error } = await sb.from('chat_messages').insert(msg).select().single();
  if (error) throw fail('Sending message', error);
  return data;
}
export function watchChat(fn) {
  const ch = sb.channel('chat-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (msg) => fn(msg.new))
    .subscribe();
  return () => sb.removeChannel(ch);
}

// ---------- sign-in and user accounts ----------
// A reset link signs the user in with a special "recovery" session; remember it so the app can ask for a new
// password. Listening here (at load) catches the event even if it fires before the app has started.
let recoveryHit = false;
const recoveryListeners = new Set();
if (sb) sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') { recoveryHit = true; recoveryListeners.forEach((fn) => fn()); } });
export function onRecovery(fn) { if (recoveryHit) fn(); recoveryListeners.add(fn); return () => recoveryListeners.delete(fn); }
const authFail = (error) => new Error(error.message || String(error));
export async function getAuthSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw authFail(error);
  return data.session;
}
/** `fn(event, session)` on sign-in, sign-out, token refresh and PASSWORD_RECOVERY (user came from a reset email). */
export function onAuthChange(fn) {
  const { data } = sb.auth.onAuthStateChange((event, session) => fn(event, session));
  return () => data.subscription.unsubscribe();
}
export async function signInWithPassword(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw authFail(error);
  return data.session;
}
export async function signOut() { await sb.auth.signOut(); }
/** Emails a reset link; the link comes back to this app, which then asks for a new password. */
export async function sendPasswordReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
  if (error) throw authFail(error);
}
export async function setOwnPassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw authFail(error);
}
export async function hasAdmin() {
  const { data, error } = await sb.rpc('has_admin');
  if (error) throw fail('Checking accounts', error);
  return Boolean(data);
}
/** First run only: creates the company's first account, which the database makes the active Admin. */
export async function createFirstAdmin({ name, email, password }) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw authFail(error);
  return { session: data.session, needsConfirm: !data.session };
}

export async function myProfile(userId) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw fail('Loading your profile', error);
  return data;
}
export async function listProfiles() {
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
  if (error) throw fail('Loading users', error);
  return data;
}
export async function updateProfile(id, patch) {
  const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw authFail(error);
  return data;
}
/**
 * Admin adds a user. A separate, non-persisting client does the sign-up so the Admin stays signed in; the
 * database creates a Pending profile for the new login id (UUID), which the Admin then fills in and activates.
 */
export async function createUser({ name, email, password }) {
  const temp = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'solarcrm.signup' } });
  const { data, error } = await temp.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw authFail(error);
  if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
    throw new Error('An account with this email already exists');
  }
  return { id: data.user.id, needsConfirm: !data.session };
}

// ---------- customer signing link (public, by token, through database functions) ----------
export async function signRequest(token) {
  const { data, error } = await sb.rpc('sign_request', { p_token: token });
  if (error) throw authFail(error);
  return data;
}
export async function submitSignature(token, png, method) {
  const { error } = await sb.rpc('submit_signature', { p_token: token, p_png: png, p_method: method });
  if (error) throw authFail(error);
  return true;
}

/** Admin-only server function; the service key never enters the browser. */
export async function resetUserPassword(userId, password) {
  const { data, error } = await sb.functions.invoke('admin-reset-password', { body: { userId, password } });
  if (error) {
    let message = 'Could not reset password. Try sending a reset email instead.';
    try { message = (await error.context.json()).error || message; } catch { /* transport error */ }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || 'Password could not be updated');
}

export async function fetchDeliveryStock() {
  const { data, error } = await sb.from('app_state').select('key,data').in('key', ['inventory', 'delivery_batches']);
  if (error) throw new Error(error.message);
  const state = Object.fromEntries(data.map((r) => [r.key, r.data]));
  if (!Array.isArray(state.inventory)) throw new Error('Inventory is not initialized');
  return { inventory: state.inventory, batches: state.delivery_batches || [] };
}
export async function commitDeliveryStock(before, after) {
  const { error } = await sb.rpc('commit_delivery_stock', { expected_inventory: before.inventory, expected_batches: before.batches, next_inventory: after.inventory, next_batches: after.batches });
  if (error) throw new Error(error.code === 'PGRST202' ? 'Delivery stock setup is required. Contact your administrator.' : error.message);
  sentState.set('inventory', JSON.stringify(after.inventory));
}

/** Additive demo pack: ignore existing IDs and confirm the server's saved records. */
export async function insertDemoProjects(projects) {
  const {error}=await sb.from('projects').upsert(projects.map(projectRow),{onConflict:'id',ignoreDuplicates:true});
  if(error)throw fail('Adding demo customers',error);
  const {data,error:readError}=await sb.from('projects').select('data').in('id',projects.map(p=>p.id));
  if(readError)throw fail('Checking demo customers',readError);
  const saved=(data||[]).map(row=>row.data);
  if(saved.length!==projects.length)throw new Error('Some demo customers could not be verified. Reload and try again.');
  saved.forEach(p=>sentProjects.set(p.id,JSON.stringify(p)));
  return saved;
}
