import { useEffect, useState } from 'react';
import { IconLogin, IconAlertCircle, IconMailForward, IconEye, IconEyeOff, IconCircleCheck, IconBrandGoogleDrive, IconShieldLock, IconBrandWhatsapp } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../data/api.js';
import { homeFor } from '../lib/access.js';
import { AppBrand } from '../components/ui.jsx';

/**
 * Half-and-half sign-in layout: a brand panel on the left (what Solar CRM is for), the form on the right.
 * On phones the panel shrinks to a short band above the form.
 */
function LoginFrame({ children }) {
  return (
    <div className="login split">
      <aside className="login-hero" aria-label="About Solar CRM">
        <div className="lh-brand"><AppBrand size={30} /></div>
        <div className="lh-main">
          <div className="lh-eyebrow">Solar project management</div>
          <h2 className="lh-head">Every customer.<br />Every stage.<br /><span>One place.</span></h2>
          <p className="lh-sub">Leads, loans, installations and DISCOM paperwork for every rooftop, from the first call to commissioning.</p>
        </div>
        <ul className="lh-points">
          <li><IconBrandGoogleDrive size={17} /><span><b>Files stay in your Google Drive</b>Documents are linked, never copied.</span></li>
          <li><IconBrandWhatsapp size={17} /><span><b>Customers sign on their phone</b>Proposals and agreements by WhatsApp link.</span></li>
          <li><IconShieldLock size={17} /><span><b>Everyone sees only their work</b>Staff, accounts, crews and partners each get their own view.</span></li>
        </ul>
      </aside>
      <div className="login-side">{children}</div>
    </div>
  );
}

function PasswordField({ id, label = 'Password', value, onChange, autoComplete = 'current-password', hint }) {
  const [show, setShow] = useState(false);
  return (
    <label className="fld" htmlFor={id}><span>{label}</span>
      <div className="pw-wrap">
        <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <IconEyeOff size={17} /> : <IconEye size={17} />}</button>
      </div>
      {hint && <small className="faint">{hint}</small>}
    </label>
  );
}
const Err = ({ text }) => (text ? <div className="form-err" role="alert"><IconAlertCircle size={16} /> {text}</div> : null);

/** Sign-in screen. With Supabase: email + password, forgot password, and a one-time "first Admin" setup. */
export default function Login() {
  const [mode, setMode] = useState('signin');           // signin | forgot | sent | first
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [noAdmin, setNoAdmin] = useState(false);
  const nav = useNavigate();
  const real = api.passwordSignIn();

  useEffect(() => { if (real) api.hasAdmin().then((h) => setNoAdmin(!h)).catch(() => {}); }, [real]);
  const run = async (fn) => { setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const go = () => nav(homeFor(api.getSession().role), { replace: true });

  const signin = (e) => { e.preventDefault(); run(async () => { await api.signIn(email, password); go(); }); };
  const forgot = (e) => { e.preventDefault(); run(async () => { await api.sendPasswordReset(email); setMode('sent'); }); };
  const first = (e) => {
    e.preventDefault();
    run(async () => {
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      const r = await api.createFirstAdmin({ name, email, password });
      if (r.needsConfirm) { setNote('Account created. Open the confirmation email we sent, then sign in here.'); setMode('signin'); setNoAdmin(false); } else go();
    });
  };

  return (
    <LoginFrame>
      <form className="login-card" onSubmit={mode === 'forgot' ? forgot : mode === 'first' ? first : signin} noValidate>
        <div className="login-logo"><AppBrand size={34} big /></div>
        {mode === 'signin' && <>
          <h1>Sign in</h1>
          <p className="muted small">{real ? 'Use your work email and password.' : 'Enter your work email.'}</p>
          {note && <div className="form-ok"><IconCircleCheck size={16} /> {note}</div>}
          <label className="fld" htmlFor="li-email"><span>Email</span>
            <input id="li-email" className="input" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {real && <PasswordField id="li-pw" value={password} onChange={setPassword} />}
          <Err text={err} />
          <button className="btn primary big-btn" type="submit" disabled={busy || !email || (real && !password)}><IconLogin size={17} /> {busy ? 'Signing in…' : 'Sign in'}</button>
          {real && <button type="button" className="link-btn" onClick={() => { setErr(''); setMode('forgot'); }}>Forgot password?</button>}
          {real && noAdmin && <button type="button" className="link-btn" onClick={() => { setErr(''); setMode('first'); }}>First time here? Create the Admin account</button>}
          {!real && <p className="faint small" style={{ margin: 0 }}>Demo prototype: no password, sign-in is checked in the browser only.</p>}
        </>}
        {mode === 'forgot' && <>
          <h1>Reset your password</h1>
          <p className="muted small">Enter the email on your account. We'll send a link to set a new password.</p>
          <label className="fld" htmlFor="fp-email"><span>Email</span>
            <input id="fp-email" className="input" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <Err text={err} />
          <button className="btn primary big-btn" type="submit" disabled={busy || !email}><IconMailForward size={17} /> {busy ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" className="link-btn" onClick={() => setMode('signin')}>Back to sign in</button>
        </>}
        {mode === 'sent' && <>
          <h1>Check your inbox</h1>
          <p className="muted small">If <b>{email}</b> has an account, a reset link is on its way. Open it on this device to set a new password.</p>
          <button type="button" className="btn big-btn" onClick={() => setMode('signin')}>Back to sign in</button>
        </>}
        {mode === 'first' && <>
          <h1>Create the Admin account</h1>
          <p className="muted small">This is the company's first account and becomes the Admin. The Admin then adds everyone else from Team → Users.</p>
          <label className="fld" htmlFor="fa-name"><span>Your name</span><input id="fa-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
          <label className="fld" htmlFor="fa-email"><span>Email</span>
            <input id="fa-email" className="input" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <PasswordField id="fa-pw" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
          <Err text={err} />
          <button className="btn primary big-btn" type="submit" disabled={busy || !name || !email || !password}>{busy ? 'Creating…' : 'Create Admin account'}</button>
          <button type="button" className="link-btn" onClick={() => setMode('signin')}>Back to sign in</button>
        </>}
      </form>
    </LoginFrame>
  );
}

/** Shown after following a password-reset email: choose a new password, then continue into the app. */
export function SetNewPassword() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const save = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters');
    if (pw !== pw2) return setErr('The two passwords do not match');
    setBusy(true);
    try { await api.finishPasswordReset(pw); nav(homeFor(api.getSession().role), { replace: true }); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <LoginFrame>
      <form className="login-card" onSubmit={save} noValidate>
        <div className="login-logo"><AppBrand size={34} big /></div>
        <h1>Set a new password</h1>
        <p className="muted small">Choose a new password for your account.</p>
        <PasswordField id="np-1" label="New password" value={pw} onChange={setPw} autoComplete="new-password" hint="At least 8 characters." />
        <PasswordField id="np-2" label="Type it again" value={pw2} onChange={setPw2} autoComplete="new-password" />
        <Err text={err} />
        <button className="btn primary big-btn" type="submit" disabled={busy || !pw || !pw2}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </LoginFrame>
  );
}

/** While the signed-in user's data loads, or if it could not be loaded. */
export function Loading({ error }) {
  return (
    <LoginFrame>
      <div className="login-card">
        <div className="login-logo"><AppBrand size={34} big /></div>
        {error ? <>
          <h1>Couldn't open Solar CRM</h1>
          <Err text={error} />
          <button className="btn primary big-btn" onClick={() => api.retryStart()}>Try again</button>
          <button className="link-btn" onClick={() => api.signOut()}>Sign out</button>
        </> : <p className="muted" role="status">Loading your customers…</p>}
      </div>
    </LoginFrame>
  );
}
