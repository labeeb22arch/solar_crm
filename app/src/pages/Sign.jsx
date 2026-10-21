// Public customer link page (#/sign/<token>). Works without signing in and never shows the app menu.
// Two kinds of link: the agreement signing link (learns only first name, kW size and link state) and the
// proposal acceptance link (also gets the sent proposal snapshot, rendered read-only, then "Accept this proposal").
import { useEffect, useRef, useState } from 'react';
import { IconPencil, IconCamera, IconEraser, IconCircleCheck, IconAlertCircle, IconRefresh, IconPhone } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { SunMark } from '../components/ui.jsx';
import { cleanImage, readFile } from '../lib/cleanImage.js';
import { FitPages } from '../docs/proposal/ProposalViewer.jsx';

function Pad({ onChange }) {
  const ref = useRef(null);
  const st = useRef({ drawing: false, pts: [], has: false });
  useEffect(() => {
    const c = ref.current;
    const fit = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return; // hidden (other tab open): keep the drawing as it is
      const keep = st.current.has ? c.toDataURL() : null;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
      if (keep) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = keep; }
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c);
    return () => ro.disconnect();
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5 }; };
  const down = (e) => {
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    st.current.drawing = true; st.current.pts = [pos(e)];
    const ctx = ref.current.getContext('2d');
    const p = st.current.pts[0];
    ctx.beginPath(); ctx.fillStyle = '#111827'; ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
  };
  const move = (e) => {
    const s = st.current;
    if (!s.drawing) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const ctx = ref.current.getContext('2d');
    for (const ev of (evs.length ? evs : [e])) {
      s.pts.push(pos(ev));
      const n = s.pts.length;
      if (n < 3) continue;
      // Quadratic curve through midpoints keeps the line smooth.
      const [a, b, c] = [s.pts[n - 3], s.pts[n - 2], s.pts[n - 1]];
      const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      const speed = Math.hypot(c.x - b.x, c.y - b.y);
      ctx.lineWidth = Math.max(1.6, Math.min(3.4, 3.6 - speed * 0.08));
      ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(b.x, b.y, m2.x, m2.y); ctx.stroke();
    }
    if (!s.has) { s.has = true; onChange(true); }
  };
  const up = () => { st.current.drawing = false; st.current.pts = []; };
  return (
    <canvas ref={ref} className="sg-pad" aria-label="Signature area: sign here with your finger"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    />
  );
}

/**
 * Draw-or-photo signature capture, shared by the agreement signing link and the proposal acceptance link.
 * Calls onSubmit(png, 'drawn' | 'photo'); a thrown error with a link code (used / expired / unknown) goes to onLinkError.
 */
function SignatureCapture({ onSubmit, onLinkError, submitLabel = 'Submit signature', fineprint }) {
  const [tab, setTab] = useState('draw');
  const [review,setReview]=useState(null);
  const [confirming,setConfirming]=useState(false);
  const reviewHeading=useRef(null);
  useEffect(()=>{if(review)reviewHeading.current?.focus();},[review,confirming]);
  const [hasInk, setHasInk] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [photo, setPhoto] = useState(null); // { url } cleaned
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const padWrap = useRef(null);
  const fileRef = useRef(null);

  const clear = () => { setPadKey((k) => k + 1); setHasInk(false); };
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setPhotoBusy(true); setPhoto(null);
    try {
      const r = await cleanImage(await readFile(f), { strength: 0.5, ink: 'black' });
      if (r.empty) setErr('We could not find a signature in that photo. Please sign on plain white paper and try again.');
      else setPhoto(r);
    } catch (x) { setErr(x.message); } finally { setPhotoBusy(false); }
  };
  const submit = async () => {
    setErr('');
    if (!review?.png) return;
    setBusy(true);
    try { await onSubmit(review.png, review.method); }
    catch (x) {
      if (x.code === 'used' || x.code === 'expired' || x.code === 'unknown') onLinkError(x.code);
      else setErr(x.message);
    } finally { setBusy(false); }
  };
  return (
    <>
      <ol className="signature-progress" aria-label="Signing progress">{['Sign','Preview','Submit'].map((label,i)=><li key={label} aria-current={(confirming?2:review?1:0)===i?'step':undefined} className={(confirming?2:review?1:0)>=i?'active':''}><span>{i+1}</span>{label}</li>)}</ol>
      <div className="signature-entry" hidden={!!review}>
      <div className="sg-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'draw'} className={tab === 'draw' ? 'on' : ''} onClick={() => { setTab('draw'); setErr(''); }}><IconPencil size={20} /> Sign on screen</button>
        <button role="tab" aria-selected={tab === 'photo'} className={tab === 'photo' ? 'on' : ''} onClick={() => { setTab('photo'); setErr(''); }}><IconCamera size={20} /> Upload a photo</button>
      </div>
      <div className="sg-panel" hidden={tab !== 'draw'}>
          <p className="sg-help">Sign inside the box with your finger.</p>
          <div ref={padWrap} className="sg-pad-wrap"><Pad key={padKey} onChange={setHasInk} /><span className="sg-line" aria-hidden="true" /></div>
          <button className="sg-btn ghost" onClick={clear} disabled={!hasInk}><IconEraser size={20} /> Clear</button>
      </div>
      <div className="sg-panel" hidden={tab !== 'photo'}>
          <p className="sg-help">Sign on plain white paper with a dark pen, then take a clear photo of it.</p>
          {photo ? (
            <>
              <div className="sg-photo checker"><img src={photo.url} alt="Your signature" /></div>
              <button className="sg-btn ghost" onClick={() => fileRef.current?.click()}><IconRefresh size={20} /> Retake</button>
            </>
          ) : (
            <button className="sg-btn ghost big" onClick={() => fileRef.current?.click()} disabled={photoBusy}><IconCamera size={24} /> {photoBusy ? 'Cleaning the photo…' : 'Take or choose a photo'}</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
      </div>
      {err && <p className="sg-err">{err}</p>}
      <button className="sg-btn primary" onClick={()=>{setErr('');const png=tab==='draw'?padWrap.current?.querySelector('canvas')?.toDataURL('image/png'):photo?.url;if(png)setReview({png,method:tab==='draw'?'drawn':'photo'});}} disabled={busy || (tab === 'draw' ? !hasInk : !photo)}>Review signature</button>
      </div>
      {review&&<section className="signature-review" aria-label={confirming?'Submit signature':'Preview signature'}><h2 ref={reviewHeading} tabIndex={-1}>{confirming?'Ready to submit?':'Preview your signature'}</h2><p className="sg-help">{confirming?'Your signature will be sent to Sunpay with this document.':'Check that your signature is clear and complete.'}</p><div className="sg-photo"><img src={review.png} alt="Your signature preview"/></div>{err&&<p className="sg-err" role="alert">{err}</p>}
      {confirming?<><p className="sg-small">{fineprint}</p><button className="sg-btn primary" disabled={busy} onClick={submit}>{busy?'Submitting…':submitLabel==='Submit signature'?'Submit signature':submitLabel}</button><button className="sg-btn ghost" disabled={busy} onClick={()=>setConfirming(false)}>Back to preview</button></>:<><div className="signature-edit-actions"><button className="sg-btn ghost" disabled={busy} onClick={()=>{setReview(null);setConfirming(false);setErr('');}}>Change signature</button><button className="sg-btn ghost" disabled={busy} onClick={()=>{clear();setPhoto(null);setReview(null);setConfirming(false);setErr('');}}>Try again</button></div><button className="sg-btn primary" disabled={busy} onClick={()=>setConfirming(true)}>Continue to submit</button><p className="sg-small">Nothing is sent until you submit on the next step.</p></>}
      </section>}
    </>
  );
}

const inr = (v) => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');

export default function SignPage({ token }) {
  const [req, setReq] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { api.getSignRequest(token).then(setReq); }, [token]);
  const isProposal = req?.kind === 'proposal';
  useEffect(() => { document.title = isProposal ? 'Your solar proposal · Sunpay' : 'Sign your agreement · Sunpay'; }, [isProposal]);

  const phone = api.meta.COMPANY.phone;
  const head = (
    <header className="sg-head">
      <SunMark size={34} />
      <div><div className="sg-co">Sunpay Renewable Energy LLP</div><div className="sg-co-sub">{isProposal ? 'Solar proposal · secure link' : 'Solar CRM · secure signing'}</div></div>
    </header>
  );
  const contact = <a className="sg-call" href={'tel:' + phone.replace(/\s/g, '')}><IconPhone size={18} /> Call Sunpay: {phone}</a>;
  const linkError = (code) => setReq((r) => ({ ...(r || {}), status: code === 'used' ? 'signed' : code, expired: code === 'expired' }));

  let body;
  if (!req) body = <p className="sg-lead">Loading…</p>;
  else if (isProposal) body = <ProposalBody req={req} token={token} done={done} setDone={setDone} setReq={setReq} linkError={linkError} contact={contact} />;
  else if (done) {
    body = (
      <div className="sg-msg ok">
        <IconCircleCheck size={48} />
        <h1>Thank you, {req.firstName}!</h1>
        <p>Your signature has been received. Sunpay will add it to your agreement and DISCOM documents. You can close this page now.</p>
      </div>
    );
  } else if (req.status === 'unknown' || req.status === 'signed' || req.expired) {
    const t = req.status === 'signed' ? ['This agreement is already signed', 'This link has already been used, so nothing more is needed from you. If you think something is wrong, please contact Sunpay.']
      : req.status === 'unknown' ? ['This link does not work', 'The link may be incomplete, or a newer link has been sent to you. Please contact Sunpay for a new link.']
        : ['This link has expired', 'Signing links work for 7 days. Please contact Sunpay and we will send you a new one.'];
    body = (
      <div className={'sg-msg' + (req.status === 'signed' ? ' ok' : '')}>
        {req.status === 'signed' ? <IconCircleCheck size={44} /> : <IconAlertCircle size={44} />}
        <h1>{t[0]}</h1>
        <p>{t[1]}</p>
        {contact}
      </div>
    );
  } else {
    body = (
      <>
        <h1 className="sg-title">Namaste {req.firstName},</h1>
        <p className="sg-lead">Please sign the <b>PM Surya Ghar agreement and DISCOM documents for your {req.kwp} kW solar system</b>. Your signature will be placed on the agreement with Sunpay.</p>
        <SignatureCapture
          onSubmit={async (png, how) => { await api.submitSignature(token, png, how); setDone(true); }}
          onLinkError={linkError}
          fineprint="By submitting, you agree that this signature is yours and may be printed on your solar agreement with Sunpay Renewable Energy LLP."
        />
      </>
    );
  }
  return (
    <div className="sg-page">
      <main className={'sg-card' + (isProposal ? ' wide' : '')}>{head}{body}</main>
    </div>
  );
}

/** Proposal link: the proposal pages (read-only, from the sent snapshot), then "Accept this proposal". */
function ProposalBody({ req, token, done, setDone, setReq, linkError, contact }) {
  const pr = req.proposal;
  if (req.status === 'unknown' || !pr) {
    return (
      <div className="sg-msg"><IconAlertCircle size={44} /><h1>This link does not work</h1><p>The link may be incomplete, or a newer version of your proposal has been sent to you. Please contact Sunpay for the latest link.</p>{contact}</div>
    );
  }
  const t = pr.totals || {};
  const accepted = pr.accepted || null;
  const signed = req.status === 'signed' || !!accepted;
  const open = !signed && !req.expired;
  const submit = async (png, how) => {
    await api.submitSignature(token, png, how);
    setReq(await api.getSignRequest(token));
    setDone(true);
    setTimeout(() => {
      // Scroll the window (not the clipped page box) to the acceptance page, which now shows the signature.
      const pages = document.querySelectorAll('.pp-fit .pp-page');
      const last = pages[pages.length - 1];
      if (last) window.scrollTo({ top: window.scrollY + last.getBoundingClientRect().top - 12, behavior: 'smooth' });
    }, 300);
  };
  return (
    <>
      {done ? (
        <div className="sg-msg ok"><IconCircleCheck size={48} /><h1>Thank you, {req.firstName}!</h1><p>You have accepted proposal {pr.number}. Your signature is now on the acceptance page below. Sunpay will call you about the next steps.</p></div>
      ) : (
        <>
          <h1 className="sg-title">Namaste {req.firstName},</h1>
          <p className="sg-lead">Here is your <b>{req.kwp} kW rooftop solar proposal</b> from Sunpay ({pr.number}).{open ? ' Please read it, then accept it at the bottom of this page.' : ''}</p>
        </>
      )}
      {signed && !done && <div className="sg-msg ok" style={{ padding: '4px 0' }}><IconCircleCheck size={36} /><p><b>You accepted this proposal{accepted?.at ? ` on ${new Date(accepted.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.</b> Nothing more is needed from you.</p></div>}
      {!signed && req.expired && <div className="sg-msg"><IconAlertCircle size={40} /><h1>This proposal has expired</h1><p>Prices are valid for a limited time. Please contact Sunpay and we will send you an updated proposal.</p>{contact}</div>}
      <div className="sg-sum">
        <div><span>System</span><b>{t.kwp ?? req.kwp} kW</b></div>
        <div><span>Price incl. GST</span><b>{inr(t.price)}</b></div>
        <div><span>Govt. subsidy (to your bank)</span><b>{inr(t.subsidy)}</b></div>
        <div><span>Effective cost</span><b>{inr(t.effectiveCost)}</b></div>
      </div>
      <div className="sg-doc"><FitPages snap={pr} accepted={accepted} assets={null} /></div>
      {open && (
        <section className="sg-accept" aria-label="Accept this proposal">
          <h2 className="sg-title" style={{ fontSize: 22 }}>Accept this proposal</h2>
          <p className="sg-lead">Sign below to accept proposal {pr.number} for your {req.kwp} kW solar system.</p>
          <SignatureCapture
            onSubmit={submit}
            onLinkError={linkError}
            submitLabel="Accept this proposal"
            fineprint="By accepting, you agree to this proposal and its terms, and that this signature is yours and may be printed on the proposal from Sunpay Renewable Energy LLP."
          />
        </section>
      )}
      {!open && contact}
    </>
  );
}
