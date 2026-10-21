import { useEffect, useRef, useState } from 'react';
import { IconUpload, IconRotateClockwise, IconCheck, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useToast, fdateY } from '../lib/hooks.jsx';
import { PageHead } from '../components/ui.jsx';
import { SubNav } from './Ops.jsx';
import { cleanImage, readFile } from '../lib/cleanImage.js';

/** Upload a photo, remove the paper behind it, check before/after, then use it. */
function ImageCleaner({ title, hint, ink, saved, onUse, onRemove }) {
  const [orig, setOrig] = useState(null);
  const [strength, setStrength] = useState(0.5);
  const [rotate, setRotate] = useState(0);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!orig) return undefined;
    let alive = true;
    setBusy(true);
    const t = setTimeout(() => {
      cleanImage(orig, { strength, ink, rotate })
        .then((r) => { if (alive) { setOut(r); setErr(r.empty ? 'No ink found — lower the cleaning strength or use a clearer photo.' : ''); } })
        .catch((e) => alive && setErr(e.message))
        .finally(() => alive && setBusy(false));
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [orig, strength, rotate, ink]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setRotate(0); setOut(null);
    try { setOrig(await readFile(f)); } catch (x) { setErr(x.message); }
  };
  const use = async () => { if (!out || out.empty) return; await onUse(out.url); setOrig(null); setOut(null); };

  return (
    <div className="card">
      <div className="card-h">{title}<span className="muted small">{hint}</span></div>
      <div className="card-b stack" style={{ gap: 12 }}>
        {orig ? (
          <>
            <div className="cl-pair">
              <figure><figcaption className="faint small">Your photo</figcaption><div className="cl-box"><img src={orig} alt="Original upload" style={{ transform: `rotate(${rotate}deg)` }} /></div></figure>
              <figure><figcaption className="faint small">Cleaned (see-through background)</figcaption><div className="cl-box checker">{out && !out.empty ? <img src={out.url} alt="Cleaned result" /> : <span className="faint small">{busy ? 'Cleaning…' : '—'}</span>}</div></figure>
            </div>
            <label className="stack" style={{ gap: 4 }}>
              <span className="faint small">Cleaning strength: {Math.round(strength * 100)}% <span className="faint">(raise it if paper or shadows remain, lower it if the ink gets patchy)</span></span>
              <input type="range" min="0" max="1" step="0.05" value={strength} onChange={(e) => setStrength(+e.target.value)} aria-label="Cleaning strength" />
            </label>
            {err && <div className="small" style={{ color: 'var(--coral)' }}>{err}</div>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setRotate((r) => (r + 90) % 360)}><IconRotateClockwise size={15} /> Rotate 90°</button>
              <button className="btn primary" onClick={use} disabled={!out || out.empty || busy}><IconCheck size={15} /> Use this</button>
              <button className="btn ghost" onClick={() => { setOrig(null); setOut(null); }}>Cancel</button>
              {out && !out.empty && <span className="small faint">{out.width}×{out.height} px · {Math.round(out.url.length * 0.75 / 1024)} KB</span>}
            </div>
          </>
        ) : saved ? (
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div className="cl-box checker" style={{ width: 220 }}><img src={saved} alt={title} /></div>
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn" onClick={() => fileRef.current?.click()}><IconUpload size={15} /> Replace photo</button>
              <button className="btn ghost" onClick={onRemove}><IconTrash size={15} /> Remove</button>
            </div>
          </div>
        ) : (
          <button className="drop cl-drop" onClick={() => fileRef.current?.click()}><IconUpload size={20} /> Upload a photo<span className="faint small">Take it on plain white paper, in good light, from straight above</span></button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    </div>
  );
}

export default function Company() {
  const [assets] = useData(() => api.getCompanyAssets(), []);
  const toast = useToast();
  const [form, setForm] = useState(null);
  useEffect(() => { if (assets && !form) setForm({ epc: assets.epc || '', account: assets.account || '', ifsc: assets.ifsc || '' }); }, [assets]); // eslint-disable-line
  const save = async (patch, msg) => { try { await api.saveCompanyAssets(patch); toast(msg); } catch (e) { toast(e.message); } };
  if (!assets || !form) return <div className="page" />;
  const dirty = ['epc', 'account', 'ifsc'].some((k) => form[k].trim() !== (assets[k] || ''));
  return (
    <div className="page">
      <PageHead title="Company sign & stamp" sub="Sunpay's stamp, authorised signature and registration details. They are printed on the feasibility report and the DISCOM agreement. Only Admin can change them." />
      <SubNav parent="team" />
      <div className="grid2 company-grid">
        <ImageCleaner title="Company stamp" hint="keeps the stamp's own colour" ink="keep" saved={assets.stamp} onUse={(url) => save({ stamp: url }, 'Company stamp saved')} onRemove={() => save({ stamp: null }, 'Company stamp removed')} />
        <ImageCleaner title="Authorised signature" hint="signed on plain paper" ink="keep" saved={assets.sign} onUse={(url) => save({ sign: url }, 'Signature saved')} onRemove={() => save({ sign: null }, 'Signature removed')} />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h">Registration and bank details<span className="muted small">left blank on the documents until filled in</span></div>
        <div className="card-b">
          <div className="grid3 company-fields">
            <label className="stack" style={{ gap: 4 }}><span className="faint small">EPC code</span><input className="input" value={form.epc} onChange={(e) => setForm({ ...form, epc: e.target.value })} /></label>
            <label className="stack" style={{ gap: 4 }}><span className="faint small">Bank A/c no.</span><input className="input mono" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} /></label>
            <label className="stack" style={{ gap: 4 }}><span className="faint small">IFSC</span><input className="input mono" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} /></label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={!dirty} onClick={() => save({ epc: form.epc, account: form.account, ifsc: form.ifsc }, 'Details saved')}><IconDeviceFloppy size={15} /> Save details</button>
            {assets.updatedAt && <span className="small faint">Last changed {fdateY(assets.updatedAt)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
