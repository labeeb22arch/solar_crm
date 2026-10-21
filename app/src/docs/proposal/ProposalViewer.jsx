import { docBaseName } from '../../lib/docName.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconZoomIn, IconZoomOut, IconDownload, IconLoader2, IconFileText } from '@tabler/icons-react';
import { ProposalPages, pageCount } from './Pages.jsx';

const safe = (v, d) => String(v || d).replace(/[^a-zA-Z0-9_-]+/g, '_');
// Named like every document: what it is first, the customer's name last.
export const proposalFileName = (snap) => docBaseName('Residential Proposal', snap.inputs?.customer?.name);

/** One JPEG per A4 page (html2canvas) into an A4 jsPDF — the same approach as the DISCOM agreement. */
export async function proposalPdf(container) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const pages = Array.from(container.querySelectorAll('.pp-page'));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    const shadow = page.style.boxShadow;
    page.style.boxShadow = 'none';
    const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: page.scrollWidth, windowHeight: page.scrollHeight });
    page.style.boxShadow = shadow;
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }
  return pdf;
}

/** Builder preview: page jumps, zoom and Download PDF around the live A4 pages. */
export function ProposalViewer({ snap, accepted, assets, extraActions, title }) {
  const [zoom, setZoom] = useState(80);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const scaleRef = useRef(null);
  const total = pageCount(snap.inputs);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    const el = scaleRef.current; const prev = el.style.transform;
    el.style.transform = 'none'; // capture at 100% whatever the screen zoom is
    try {
      const pdf = await proposalPdf(el);
      pdf.save(`${proposalFileName(snap)}.pdf`);
    } finally { el.style.transform = prev; setBusy(false); }
  };
  const jump = (n) => document.getElementById(`prp-page-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Shrink the reserved height to match the zoom so the scroll area ends with the last page.
  const [h, setH] = useState(null);
  useLayoutEffect(() => { const el = scaleRef.current; if (el) setH(el.offsetHeight * (zoom / 100)); });

  return (
    <div className="pp-viewer">
      <div className="ag-toolbar">
        <span className="row" style={{ fontWeight: 650 }}><IconFileText size={17} /> {title || `Proposal (${total} pages)`}</span>
        <div className="seg" role="group" aria-label="Go to page">{Array.from({ length: total }, (_, i) => <button key={i} onClick={() => jump(i + 1)} title={`Page ${i + 1}`}>{i + 1}</button>)}</div>
        <div className="ag-tools">
          <span className="row ag-ctl">
            <button className="btn sm ghost icon" onClick={() => setZoom(Math.max(40, zoom - 10))} aria-label="Zoom out"><IconZoomOut size={15} /></button>
            <span className="mono small" style={{ width: 38, textAlign: 'center' }}>{zoom}%</span>
            <button className="btn sm ghost icon" onClick={() => setZoom(Math.min(140, zoom + 10))} aria-label="Zoom in"><IconZoomIn size={15} /></button>
          </span>
          {extraActions}
          <button className="btn primary" onClick={download} disabled={busy}>{busy ? <IconLoader2 size={15} className="spin" /> : <IconDownload size={15} />} {busy ? 'Making PDF…' : 'Download PDF'}</button>
        </div>
      </div>
      <div ref={boxRef} className="pp-scroll">
        <div style={{ height: h || undefined }}>
          <div ref={scaleRef} className="pp-scale" style={{ transform: `scale(${zoom / 100})` }}>
            <ProposalPages snap={snap} accepted={accepted} assets={assets} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Customer's phone/desktop view: the A4 pages scaled down to the available width (never up). */
export function FitPages({ snap, accepted, assets }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(0);
  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const pagePx = inner.current.offsetWidth || 793.7;
      const s = Math.min(1, outer.current.clientWidth / pagePx);
      setScale(s); setH(inner.current.offsetHeight * s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current); ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="pp-fit" style={{ height: h || undefined }}>
      <div ref={inner} className="pp-fit-inner" style={{ transform: `scale(${scale})` }}>
        <ProposalPages snap={snap} accepted={accepted} assets={assets} idPrefix="pub-page-" />
      </div>
    </div>
  );
}
