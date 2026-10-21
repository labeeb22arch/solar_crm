import { docBaseName } from '../../lib/docName.js';
import { useRef, useState } from 'react';
import { IconPrinter, IconZoomIn, IconZoomOut, IconFileText, IconEye, IconEyeOff, IconTypography, IconDownload, IconLoader2 } from '@tabler/icons-react';
import { Page1 } from './Page1.jsx';
import { Page2 } from './Page2.jsx';
import { Page3 } from './Page3.jsx';
import { Page4 } from './Page4.jsx';
import './agreement.css';

const FONT_SIZES = [['ag-fs-14', 'Small (14px)'], ['ag-fs-16', 'Medium (16px)'], ['ag-fs-17', 'Standard (17px)'], ['ag-fs-19', 'Large (19px)']];
const safe = (v, d) => (v || d).replace(/[^a-zA-Z0-9_-]/g, '_');
// Named like every document: what it is first, the customer's name last.
export const agreementFileName = (data) => docBaseName('DISCOM Submission', data?.consumerName);

/** Builds the 4-page PDF exactly like SolarFlow (html2canvas per page → JPEG → jsPDF A4), highlights removed. */
export async function agreementPdf(container) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const pageElements = Array.from(container.querySelectorAll('[id^="crm-agreement-page-"]'));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  for (let index = 0; index < pageElements.length; index += 1) {
    const page = pageElements[index];
    const highlights = Array.from(page.querySelectorAll('[style*="background-color"]'));
    const previousBackgrounds = highlights.map((element) => element.style.backgroundColor);
    highlights.forEach((element) => { element.style.backgroundColor = 'transparent'; });
    const canvas = await html2canvas(page, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });
    highlights.forEach((element, position) => { element.style.backgroundColor = previousBackgrounds[position]; });
    if (index > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export function AgreementPreview({ data, onChange, extraActions }) {
  const [zoom, setZoom] = useState(100);
  const [fontSize, setFontSize] = useState('ag-fs-17');
  const [busy, setBusy] = useState(false);
  const containerRef = useRef(null);
  const scaleRef = useRef(null);

  const download = async () => {
    if (busy || !containerRef.current) return;
    setBusy(true);
    const scaler = scaleRef.current;
    const prev = scaler.style.transform;
    scaler.style.transform = 'none'; // capture at 100% whatever the screen zoom is
    try {
      const blob = await agreementPdf(containerRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${agreementFileName(data)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      scaler.style.transform = prev;
      setBusy(false);
    }
  };

  const print = () => {
    const box = containerRef.current;
    if (!box) return;
    const parentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map((t) => t.outerHTML).join('\n');
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', opacity: '0' });
    document.body.appendChild(iframe);
    const docTitle = agreementFileName(data);
    const prevTitle = document.title;
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>${docTitle}</title><meta charset="utf-8">${parentStyles}
      <style>
        @media print { @page { size: A4 portrait; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; background: white !important; } }
        html, body { background: white !important; margin: 0; padding: 0; }
        .ag-page { margin: 0 auto !important; box-shadow: none !important; page-break-after: always !important; break-after: page !important; }
        .ag-scale { transform: none !important; }
        .ag-gap { height: 0 !important; }
      </style></head><body>${box.innerHTML}</body></html>`);
    doc.close();
    let done = false;
    const go = () => {
      if (done) return; done = true;
      document.title = docTitle;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => { document.title = prevTitle; iframe.remove(); }, 1000);
    };
    iframe.contentWindow.onload = go;
    setTimeout(go, 600);
  };

  const jump = (n) => document.getElementById(`crm-agreement-page-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="ag-viewer">
      <div className="ag-toolbar">
        <span className="row" style={{ fontWeight: 650 }}><IconFileText size={17} /> PM Surya Ghar Agreement (4 Pages)</span>
        <div className="seg" role="group" aria-label="Go to page">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => jump(n)}>Page {n}</button>)}</div>
        <div className="ag-tools">
          <button className={'btn' + (data.showHighlights ? ' on-hl' : '')} onClick={() => onChange({ ...data, showHighlights: !data.showHighlights })} aria-pressed={!!data.showHighlights}>
            {data.showHighlights ? <IconEye size={15} /> : <IconEyeOff size={15} />} {data.showHighlights ? 'Highlights On' : 'Highlights Off'}
          </button>
          <label className="row ag-ctl"><IconTypography size={15} /><select className="select" value={fontSize} onChange={(e) => setFontSize(e.target.value)} aria-label="Font size">{FONT_SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <span className="row ag-ctl">
            <button className="btn sm ghost icon" onClick={() => setZoom(Math.max(60, zoom - 10))} aria-label="Zoom out"><IconZoomOut size={15} /></button>
            <span className="mono small" style={{ width: 38, textAlign: 'center' }}>{zoom}%</span>
            <button className="btn sm ghost icon" onClick={() => setZoom(Math.min(140, zoom + 10))} aria-label="Zoom in"><IconZoomIn size={15} /></button>
          </span>
          {extraActions}
          <button className="btn" onClick={print}><IconPrinter size={15} /> Print</button>
          <button className="btn primary" onClick={download} disabled={busy}>{busy ? <IconLoader2 size={15} className="spin" /> : <IconDownload size={15} />} {busy ? 'Making PDF…' : 'Download PDF'}</button>
        </div>
      </div>
      <div ref={containerRef} className="ag-scroll">
        <div ref={scaleRef} className="ag-scale" style={{ transform: `scale(${zoom / 100})`, width: '210mm', transformOrigin: 'top center', margin: '0 auto' }}>
          <div id="crm-agreement-page-1"><Page1 data={data} fontSizeClass={fontSize} /></div>
          <div className="ag-gap" />
          <div id="crm-agreement-page-2"><Page2 data={data} fontSizeClass={fontSize} /></div>
          <div className="ag-gap" />
          <div id="crm-agreement-page-3"><Page3 data={data} fontSizeClass={fontSize} /></div>
          <div className="ag-gap" />
          <div id="crm-agreement-page-4"><Page4 data={data} fontSizeClass={fontSize} /></div>
        </div>
      </div>
    </div>
  );
}
