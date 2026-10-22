// Catalogue inspected in Watersun Final; aliases resolve to the existing CRM slots.
export const CUSTOMER_DOCUMENTS = [
  {key:'aadhaar_front',label:'Aadhaar card (front)',group:'Customer documents',aliases:['Aadhaar card (front)']},
  {key:'aadhaar_back',label:'Aadhaar card (back)',group:'Customer documents',aliases:['Aadhaar card (back)']},
  {key:'pan',label:'PAN card',group:'Customer documents',aliases:['PAN card']},
  {key:'light_bill',label:'Electricity / light bill',group:'Customer documents',aliases:['Electricity bill']},
  {key:'property_proof',label:'Vera Pavti / Aakarni / Index-2',group:'Customer documents',aliases:['Index-2 / Name match copy']},
  {key:'bank',label:'Bank passbook / cheque',group:'Customer documents',aliases:['Bank passbook / cheque']},
  {key:'house_photo',label:'House photo with geo tag',group:'Customer documents'},
  {key:'extra',label:'Extra documents',group:'Customer documents'},
  {key:'site_survey_photos',label:'Site survey photos',group:'Customer documents',aliases:['Site survey photos']},
  {key:'acknowledgment',label:'Application acknowledgment',group:'Registration & submission'},
  {key:'vendor_feasibility',label:'Vendor feasibility',group:'Registration & submission'},
  {key:'site_feasibility',label:'Site feasibility',group:'Registration & submission'},
  {key:'feasibility',label:'Feasibility document',group:'Registration & submission',aliases:['Feasibility report'],generated:'feas'},
  {key:'quotation',label:'Quotation',group:'Registration & submission',aliases:['Quotation'],generated:'quote'},
  {key:'signed_agreement',label:'Signed agreement',group:'Registration & submission',aliases:['Agreement (signed)']},
  {key:'discom_agreement',label:'PM Surya Ghar model agreement',group:'Registration & submission',aliases:['DISCOM application form'],generated:'agreement'},
  {key:'stamped_discom',label:'DISCOM submission (stamped)',group:'Registration & submission'},
  {key:'gpa',label:'PM Surya GPA stamp',group:'Registration & submission'},
  {key:'stamp_paper',label:'Stamp paper',group:'Registration & submission',aliases:['Stamp paper']},
  {key:'loan_sanction',label:'Loan sanction letter',group:'Registration & submission',aliases:['Loan sanction letter'],loanOnly:true},
  {key:'file_status',label:'File status document',group:'Registration & submission'},
  {key:'geo_photo',label:'Site / geo tag photo',group:'Installation & handover'},
  {key:'sfdc_photo',label:'SFDC photo',group:'Installation & handover'},
  {key:'installation_photos',label:'Installation photos',group:'Installation & handover',aliases:['Installation photos']},
  {key:'meter_photo',label:'Meter installation photo',group:'Installation & handover'},
  {key:'dcr',label:'DCR certificate',group:'Installation & handover'},
  {key:'pcr',label:'PCR certificate',group:'Installation & handover'},
  {key:'commissioning',label:'Plant commissioning report',group:'Installation & handover',aliases:['Commissioning certificate']},
  {key:'signature',label:'Customer signature',group:'Installation & handover'},
  {key:'vendor_stamp',label:'Vendor stamp',group:'Installation & handover'},
  {key:'warranty_card',label:'Warranty card',group:'Installation & handover'},
  {key:'insurance',label:'Insurance document',group:'Installation & handover'},
  {key:'subsidy_token',label:'Subsidy token photo',group:'Installation & handover'},
  {key:'digital_certificate',label:'Digital certificate',group:'Installation & handover'},
];
const normal = s => String(s||'').trim().toLowerCase();
export function documentDefinition(key) {
  const doc=CUSTOMER_DOCUMENTS.find(d=>d.key===key);
  if(!doc)throw new Error('Unknown customer document');
  return doc;
}
export function findDocument(project,doc) {
  const slot=(project.drive||[]).find(row=>row.key===doc.key||[doc.label,...(doc.aliases||[])].some(label=>normal(label)===normal(row.slot)));
  const generated=doc.generated==='quote'?(project.docLinks?.proposal||project.docLinks?.quote):project.docLinks?.[doc.generated];
  return {...(slot||{}),url:generated?.url||slot?.url||'',by:generated?.by||slot?.by||'',at:generated?.at||slot?.at||'',present:!!(slot?.present||generated?.url||slot?.url)};
}
export function cleanDocumentUrl(raw,kind='file') {
  let url;try{url=new URL(String(raw||'').trim());}catch{throw new Error('Paste a complete Google link');}
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use a secure Google link');
  const host=url.hostname.toLowerCase();
  const valid=kind==='location'?(host==='maps.app.goo.gl'||host==='maps.google.com'||host==='goo.gl'&&url.pathname.startsWith('/maps')||['google.com','www.google.com'].includes(host)&&url.pathname.startsWith('/maps')):kind==='folder'?host==='drive.google.com'&&/^\/drive\/(?:u\/\d+\/)?folders\/[\w-]+/.test(url.pathname):['drive.google.com','docs.google.com'].includes(host);
  if(!valid)throw new Error(kind==='location'?'Paste a Google Maps location link':kind==='folder'?'Paste the customer’s Google Drive folder link':'Paste a Google Drive or Google Docs file link');
  return url.href;
}
export function changeCustomerDocument(project,key,patch,actor,at) {
  const doc=documentDefinition(key), previous=findDocument(project,doc);
  const url=patch.url===undefined?previous.url:cleanDocumentUrl(patch.url);
  if(patch.checked===false&&url)throw new Error('A linked file is already marked received');
  const present=url?true:patch.checked===undefined?previous.present:!!patch.checked;
  const row={...previous,key,slot:previous.slot||doc.aliases?.[0]||doc.label,url,present,by:actor,at,modified:at};
  if(patch.url!==undefined&&url!==previous.url)row.versions=[...(previous.versions||[]),...(previous.url?[{url:previous.url,by:previous.by,at:previous.at}]:[])];
  const drive=(project.drive||[]).map(r=>({...r}));
  const index=drive.findIndex(r=>r.key===key||[doc.label,...(doc.aliases||[])].some(label=>normal(label)===normal(r.slot)));
  if(index<0)drive.push(row);else drive[index]=row;
  return drive;
}

export function changeCustomerResource(previous,raw,kind,actor,at) {
  const url=cleanDocumentUrl(raw,kind);
  return {url,by:actor,at,versions:[...(previous?.versions||[]),...(previous?.url&&previous.url!==url?[{url:previous.url,by:previous.by,at:previous.at}]:[])]};
}
