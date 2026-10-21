import { useState } from 'react';
import { IconSignature, IconCopy, IconBrandWhatsapp, IconX, IconCheck } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useToast, fdate } from '../lib/hooks.jsx';

/** "Send signing link" button: makes a new link (the old one stops working) and shows it with Copy and WhatsApp. */
export function SignLinkButton({ pid, className = 'btn', label = 'Send signing link', small }) {
  const toast = useToast();
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!api.canDo('edit')) return null;
  const make = async (e) => {
    e?.stopPropagation();
    setBusy(true);
    try { setLink(await api.createSignLink(pid)); } catch (err) { toast(err.message); } finally { setBusy(false); }
  };
  return (
    <>
      <button className={className + (small ? ' sm' : '')} onClick={make} disabled={busy}><IconSignature size={small ? 14 : 15} /> {busy ? 'Making link…' : label}</button>
      {link && <SignLinkDialog link={link} onClose={() => setLink(null)} />}
    </>
  );
}

export function SignLinkDialog({ link, onClose }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const first = String(link.name || '').split(/\s+/)[0];
  const phone = String(link.phone || '').replace(/\D/g, '').slice(-10);
  const proposal = link.kind === 'proposal';
  const msg = proposal
    ? `Namaste ${first}, here is your Sunpay solar proposal for ${link.kwp} kW. Please review and accept here: ${link.url}`
    : `Namaste ${first}, please sign your Sunpay solar agreement here: ${link.url} — Sunpay Renewable Energy`;
  const wa = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); toast('Link copied'); } catch { toast('Could not copy — select the link and copy it'); }
  };
  return (
    <>
      <div className="overlay top" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="sl-dialog card" role="dialog" aria-label={proposal ? 'Proposal link' : 'Signing link'} onClick={(e) => e.stopPropagation()}>
        <div className="card-h"><IconSignature size={16} /> {proposal ? `Proposal ${link.number || ''} for` : 'Signing link for'} {link.name}<button className="btn sm ghost icon" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close"><IconX size={15} /></button></div>
        <div className="card-b stack" style={{ gap: 10 }}>
          <p className="small muted" style={{ margin: 0 }}>{proposal
            ? <>The customer opens this link on their phone, reads the proposal and accepts it by signing on screen or uploading a photo of their signature. It works once and stops working on {fdate(link.expiresAt)}. Sending a new version replaces this link.</>
            : <>The customer opens this link on their phone and signs on screen or uploads a photo of their signature. It works once and stops working on {fdate(link.expiresAt)}. Making a new link replaces this one.</>}</p>
          {proposal && <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>{msg}</p>}
          <input className="input mono" readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label={proposal ? 'Proposal link' : 'Signing link'} />
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn" onClick={copy}>{copied ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied ? 'Copied' : 'Copy link'}</button>
            <a className="btn primary" href={wa} target="_blank" rel="noopener noreferrer"><IconBrandWhatsapp size={15} /> Send on WhatsApp</a>
          </div>
        </div>
      </div>
    </>
  );
}

/** Plain words for a customer's signature state. */
export function signLabel(s) {
  if (!s || s.state === 'none') return 'Not signed';
  if (s.state === 'signed') return `Customer signed ${fdate(s.at)}`;
  if (s.state === 'expired') return 'Signing link expired';
  return 'Signing link sent';
}
