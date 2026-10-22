import { useEffect, useMemo, useState } from 'react';
import { IconUserPlus, IconPencil, IconMailForward, IconSearch, IconX, IconEye, IconEyeOff, IconRefresh } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useSession, useToast, fdate } from '../lib/hooks.jsx';
import { PageHead, Pill, Empty } from '../components/ui.jsx';
import { SubNav } from './Ops.jsx';

// The roles an Admin can give today, with the names Solar CRM uses. (CPO-managed staff and dealers come later.)
const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin', help: 'Everything, including users and export' },
  { value: 'Office Staff', label: 'Staff', help: 'Day-to-day work for one branch' },
  { value: 'Finance', label: 'Accountant', help: 'Sees everything, cannot change anything; can export' },
  { value: 'Installation Team', label: 'Installation team', help: "Only their crew's jobs, on the phone" },
  { value: 'CPO', label: 'CPO', help: 'Channel Partner Office: their partners, dealers and commission' },
];
const roleLabel = (r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || (r === 'Pending' ? 'Not set up' : api.ROLE_INFO[r]?.long || r);
const EMPTY = { name: '', email: '', password: '', role: 'Office Staff', branch: 'Main Office', team: '', cpo_id: '', phone: '' };

function placeOf(u) {
  if (u.role === 'Office Staff') return u.branch || '—';
  if (u.role === 'Installation Team') return api.meta.TEAMS.find((t) => t.id === u.team)?.name || '—';
  if (u.role === 'CPO') return api.meta.CPOS.find((c) => c.id === u.cpo_id)?.name || '—';
  return 'All branches';
}
const strongPassword = () => {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(r, (n) => a[n % a.length]).join('');
};

/** Team → Users: Admin adds people (name, email, password, role) and changes their details at any time. */
export default function Users() {
  const session = useSession();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [editing, setEditing] = useState(null);   // null | 'new' | profile
  const [resetting, setResetting] = useState(null);
  const live = session.cloud;

  const reload = () => api.listUsers().then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { reload(); }, []); // eslint-disable-line

  const shown = useMemo(() => (rows || []).filter((u) => (roleF === 'all' || u.role === roleF)
    && (!q || `${u.name} ${u.email} ${roleLabel(u.role)} ${placeOf(u)}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, roleF]);
  const counts = useMemo(() => ({ active: (rows || []).filter((u) => u.active).length, off: (rows || []).filter((u) => !u.active).length }), [rows]);

  const toggleActive = async (u) => {
    try { await api.updateUser(u.id, { active: !u.active }); toast(u.active ? `${u.name} can no longer sign in` : `${u.name} can sign in again`); reload(); } catch (e) { toast(e.message); }
  };

  return (
    <div className="page">
      <PageHead title="Team" sub="Everyone who can sign in to Solar CRM, their role and where they work. Only Admin can add or change users.">
        {live && <button className="btn primary" onClick={() => setEditing('new')}><IconUserPlus size={16} />Add user</button>}
      </PageHead>
      <SubNav parent="team" />
      {!live && <div className="note-box">Demo mode: these are sample users. Connect Supabase to add real logins.</div>}
      {err && <div className="form-err" role="alert">{err}</div>}

      <div className="users-bar">
        <div className="search-in"><IconSearch size={15} /><input className="input" placeholder="Search name, email, role…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></div>
        <select className="select" value={roleF} onChange={(e) => setRoleF(e.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value="Pending">Not set up</option>
        </select>
        <span className="faint small">{counts.active} active · {counts.off} switched off</span>
      </div>

      <div className="card tbl-wrap">
        {rows === null && !err ? <div className="faint small" style={{ padding: 16 }}>Loading users…</div> : shown.length === 0 ? (
          <Empty hint={live ? 'Use “Add user” to give someone a login.' : ''}>No users match.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th className="hide-sm">Branch / crew / office</th><th className="hide-sm">Added</th><th>Status</th>{live && <th className="r">Actions</th>}</tr></thead>
            <tbody>{shown.map((u) => (
              <tr key={u.id}>
                <td><div style={{ fontWeight: 600 }}>{u.name || '—'}{u.id === session.user?.id && <span className="faint small"> (you)</span>}</div><div className="faint small">{u.email || 'no email'}</div></td>
                <td>{roleLabel(u.role)}</td>
                <td className="hide-sm">{placeOf(u)}</td>
                <td className="hide-sm small muted">{u.created_at ? fdate(u.created_at) : '—'}</td>
                <td>{u.active ? <Pill status="done">Active</Pill> : <Pill>{u.role === 'Pending' ? 'Not set up' : 'Switched off'}</Pill>}</td>
                {live && <td className="r" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><IconPencil size={14} /><span className="hide-sm">Edit</span></button>
                  <button className="btn sm ghost" onClick={() => setResetting(u)} aria-label={`Reset password for ${u.name}`} title="Reset password"><IconMailForward size={14} /><span className="hide-sm">Reset password</span></button>
                </td>}
              </tr>))}</tbody>
          </table>
        )}
      </div>
      {resetting && <PasswordReset user={resetting} onClose={() => setResetting(null)} onSaved={(message) => { setResetting(null); toast(message); }} />}
      {editing && <UserForm user={editing === 'new' ? null : editing} me={session.user?.id} onClose={() => setEditing(null)}
        onSaved={(msg) => { setEditing(null); toast(msg); reload(); }} onToggle={toggleActive} />}
    </div>
  );
}

function UserForm({ user, me, onClose, onSaved, onToggle }) {
  const isNew = !user;
  const [f, setF] = useState(() => (isNew ? { ...EMPTY } : { ...EMPTY, ...user, password: '' }));
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const role = ROLE_OPTIONS.find((o) => o.value === f.role);

  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const place = { branch: f.role === 'Office Staff' ? f.branch : null, team: f.role === 'Installation Team' ? (f.team || api.meta.TEAMS[0].id) : null, cpo_id: f.role === 'CPO' ? (f.cpo_id || api.meta.CPOS[0].id) : null };
    try {
      if (isNew) {
        const r = await api.createUser({ ...f, ...place });
        onSaved(r.needsConfirm ? `${f.name} added. They must confirm their email before signing in.` : `${f.name} added. They can sign in now with this email and password.`);
      } else {
        await api.updateUser(user.id, { name: f.name, role: f.role, phone: f.phone, ...place, ...(user.role === 'Pending' ? { active: true } : {}) });
        onSaved(`${f.name}'s details saved`);
      }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <form className="side-panel user-form" onSubmit={save} role="dialog" aria-label={isNew ? 'Add user' : `Edit ${user.name}`}>
        <div className="card-h">{isNew ? 'Add user' : 'Edit user'}<button type="button" className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close"><IconX size={15} /></button></div>
        <div className="user-form-body">
          <label className="fld" htmlFor="uf-name"><span>Name</span><input id="uf-name" className="input" value={f.name} onChange={set('name')} required autoComplete="off" /></label>
          <label className="fld" htmlFor="uf-email"><span>Email</span>
            <input id="uf-email" className="input" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} value={f.email} onChange={set('email')} required disabled={!isNew} autoComplete="off" />
            <small className="faint">{isNew ? 'They sign in with this email. “Forgot password” links are sent here too.' : 'The sign-in email can’t be changed here yet.'}</small>
          </label>
          {isNew && (
            <label className="fld" htmlFor="uf-pw"><span>Password</span>
              <div className="pw-wrap">
                <input id="uf-pw" className="input" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} required autoComplete="new-password" />
                <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <IconEyeOff size={17} /> : <IconEye size={17} />}</button>
              </div>
              <small className="faint">At least 8 characters. <button type="button" className="link-btn" onClick={() => { setF((x) => ({ ...x, password: strongPassword() })); setShow(true); }}><IconRefresh size={12} /> Make one for me</button></small>
            </label>
          )}
          <label className="fld" htmlFor="uf-role"><span>Role</span>
            <select id="uf-role" className="select" value={f.role === 'Pending' ? 'Office Staff' : f.role} onChange={set('role')} disabled={user?.id === me}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <small className="faint">{user?.id === me ? 'You can’t change your own role.' : role?.help}</small>
          </label>
          {f.role === 'Office Staff' && (
            <label className="fld" htmlFor="uf-branch"><span>Branch</span>
              <select id="uf-branch" className="select" value={f.branch || 'Main Office'} onChange={set('branch')}>
                {api.meta.BRANCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
          )}
          {f.role === 'Installation Team' && (
            <label className="fld" htmlFor="uf-team"><span>Crew</span>
              <select id="uf-team" className="select" value={f.team || api.meta.TEAMS[0].id} onChange={set('team')}>
                {api.meta.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
              </select>
            </label>
          )}
          {f.role === 'CPO' && (
            <label className="fld" htmlFor="uf-cpo"><span>Partner office</span>
              <select id="uf-cpo" className="select" value={f.cpo_id || api.meta.CPOS[0].id} onChange={set('cpo_id')}>
                {api.meta.CPOS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="fld" htmlFor="uf-phone"><span>Phone (optional)</span><input id="uf-phone" className="input" inputMode="tel" value={f.phone || ''} onChange={set('phone')} autoComplete="off" /></label>
          {err && <div className="form-err" role="alert">{err}</div>}
        </div>
        <div className="user-form-foot">
          {!isNew && user.id !== me && user.role !== 'Pending' && (
            <button type="button" className="btn" onClick={() => { onToggle(user); onClose(); }}>{user.active ? 'Switch off sign-in' : 'Switch sign-in back on'}</button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || !f.name || (isNew && (!f.email || !f.password))}>{busy ? 'Saving…' : isNew ? 'Add user' : 'Save'}</button>
        </div>
      </form>
    </>
  );
}

function PasswordReset({ user, onClose, onSaved }) {
  const [method, setMethod] = useState('email');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const escape = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [busy, onClose]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (method === 'direct' && password !== confirm) return setError('Passwords do not match');
    if (method === 'email' && !user.email) return setError('Add an email address for this user first');
    setBusy(true);
    try {
      if (method === 'email') {
        await api.sendPasswordReset(user.email);
        onSaved(`Password reset email requested for ${user.email}`);
      } else {
        await api.resetUserPassword(user.id, password);
        onSaved(`Password updated for ${user.name}`);
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <>
    <div className="overlay" onClick={() => { if (!busy) onClose(); }} />
    <form className="side-panel user-form" role="dialog" aria-modal="true" aria-labelledby="reset-title" onSubmit={submit}>
      <div className="card-h"><span id="reset-title">Reset password</span><button type="button" className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={onClose} disabled={busy} aria-label="Close"><IconX size={15} /></button></div>
      <div className="user-form-body">
        <div><b>{user.name}</b><div className="small faint">{user.email}</div></div>
        <label className="fld"><span>Reset method</span><select autoFocus className="select" value={method} disabled={busy} onChange={(e) => { setMethod(e.target.value); setError(''); setPassword(''); setConfirm(''); }}>
          <option value="email">Send reset email</option><option value="direct">Set new password</option>
        </select></label>
        {method === 'email' ? <p>A link will be emailed to this user so they can choose a new password.</p> : <>
          <label className="fld"><span>New password</span><input className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} disabled={busy} /><small className="faint">At least 8 characters</small></label>
          <label className="fld"><span>Confirm password</span><input className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} maxLength={128} disabled={busy} /></label>
          <label><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
        </>}
        {error && <div className="form-err" role="alert">{error}</div>}
      </div>
      <div className="user-form-foot"><button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="btn primary" disabled={busy || (method === 'email' && !user.email)}>{busy ? 'Saving…' : method === 'email' ? 'Send reset email' : 'Save new password'}</button></div>
    </form>
  </>;
}
