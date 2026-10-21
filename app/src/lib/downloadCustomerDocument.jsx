import { downloadNameDeclaration } from '../docs/nameDeclaration.js';
import * as api from '../data/api.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ProposalPages } from '../docs/proposal/Pages.jsx';
import { proposalPdf } from '../docs/proposal/ProposalViewer.jsx';
import { agreementPdf } from '../docs/agreement/AgreementPreview.jsx';
import { Page1 } from '../docs/agreement/Page1.jsx';
import { Page2 } from '../docs/agreement/Page2.jsx';
import { Page3 } from '../docs/agreement/Page3.jsx';
import { Page4 } from '../docs/agreement/Page4.jsx';
import { agreementData } from '../docs/agreement/data.js';
import { docFileName } from './docName.js';
import { createFeasibilityPdf,mapFeasibilityReport,getMissingFeasibilityFields,vendorFrom } from '../docs/feasibility.js';
export async function downloadCustomerDocument(p,key,assets) {
  if(key==='name')return downloadNameDeclaration({...p,...p.nameCheck},api.meta.COMPANY);
  if(key==='feas') {
    const data=mapFeasibilityReport(p);const missing=getMissingFeasibilityFields(data);
    if(missing.length)throw new Error(`Complete ${missing.map((m)=>m.field).join(', ')} in Edit details first.`);
    const blob=await createFeasibilityPdf(data,{stampUrl:assets.stamp,signUrl:assets.sign,vendor:vendorFrom(assets)});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=docFileName('Feasibility Report',p.name);a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;
  }
  const container=document.createElement('div');container.style.cssText='position:absolute;left:-12000px;top:0;width:794px;background:white;color:black;';document.body.appendChild(container);
  const root=createRoot(container);
  try {
    const data=key==='agreement'?agreementData(p,assets,{showHighlights:false}):null;
    flushSync(()=>root.render(key==='quote'?<ProposalPages snap={p.proposal} accepted={p.proposal?.accepted} assets={assets}/>:<div className="ag-preview">{[Page1,Page2,Page3,Page4].map((Page,i)=><div key={i} id={`crm-agreement-page-direct-${i}`}><Page data={data} fontSizeClass="ag-fs-17"/></div>)}</div>));
    await document.fonts.ready;
    await Promise.all([...container.querySelectorAll('img')].map((img)=>img.decode?.().catch(()=>{})||Promise.resolve()));
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(key==='quote') {const pdf=await proposalPdf(container);pdf.save(docFileName('Signed quotation',p.name));}
    else {const blob=await agreementPdf(container);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=docFileName('DISCOM Submission',p.name);a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  } finally {root.unmount();container.remove();}
}
