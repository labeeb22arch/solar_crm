import { useEffect, useRef, useState } from 'react';
import { IconBulb, IconX } from '@tabler/icons-react';
import { useModalFocus } from '../lib/useModalFocus.js';
import { TOUR, tipFor, hiddenTips, hideTip, tourDone, finishTour } from '../lib/helpTips.js';

const useHelpReset = () => { const [n, setN] = useState(0); useEffect(() => { const h = () => setN((x) => x + 1); window.addEventListener('solarcrm-help-reset', h); return () => window.removeEventListener('solarcrm-help-reset', h); }, []); return n; };

/** Small dismissible tip at the top of each office screen. */
export function PageTip({ path }) {
  const reset = useHelpReset();
  const tip = tipFor(path);
  const [hidden, setHidden] = useState(hiddenTips);
  useEffect(() => setHidden(hiddenTips()), [reset]);
  if (!tip || hidden.includes(tip.id)) return null;
  return <aside className="page-tip" aria-label="Tip"><IconBulb size={18} aria-hidden="true" /><p><b>{tip.title}.</b> {tip.text}</p>
    <button type="button" className="btn icon ghost" aria-label="Hide this tip" title="Hide this tip" onClick={() => { hideTip(tip.id); setHidden(hiddenTips()); }}><IconX size={16} /></button></aside>;
}

/** Five-step tour, shown once after the first sign-in. */
export function FirstTour() {
  const reset = useHelpReset();
  const [open, setOpen] = useState(() => !tourDone());
  const [step, setStep] = useState(0);
  const box = useRef(null);
  useEffect(() => { if (reset) { setStep(0); setOpen(true); } }, [reset]);
  const close = () => { finishTour(); setOpen(false); };
  useModalFocus(box, close, false, open);
  if (!open) return null;
  const s = TOUR[step]; const last = step === TOUR.length - 1;
  return <><div className="overlay" onClick={close} />
    <section ref={box} className="decision-dialog card card-b tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <p className="small faint">Step {step + 1} of {TOUR.length}</p>
      <h2 id="tour-title">{s.title}</h2>
      <p>{s.text}</p>
      <div className="tour-dots" aria-hidden="true">{TOUR.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}</div>
      <div className="tour-actions">
        <button type="button" className="btn ghost" onClick={close}>Skip tour</button>
        {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        <button type="button" className="btn primary" onClick={() => (last ? close() : setStep(step + 1))}>{last ? 'Start working' : 'Next'}</button>
      </div>
    </section></>;
}
