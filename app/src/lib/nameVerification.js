export function nameFromText(text) {
 const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++) {
  const match=lines[i].match(/^(?:consumer\s*name|customer\s*name|account\s*holder(?:\s*name)?|name\s*of\s*(?:the\s*)?(?:consumer|customer|account\s*holder)|name)\s*[:.\-]?\s*(.*)$/i);
  if(match){const value=(match[1]||lines[i+1]||'').trim();if(value.length>2&&!/\d/.test(value))return value.slice(0,180);}
 }
 return '';
}
export function cleanNameVerification(input) {
 const discomName=String(input.discomName||'').trim().slice(0,180),bankName=String(input.bankName||'').trim().slice(0,180);
 if(!discomName||!bankName)throw new Error('Enter both names as printed on the documents');
 if(!input.bankConfirmed)throw new Error('Confirm the bank account holder name');
 const normal=v=>v.normalize('NFKC').toLowerCase().replace(/[\s.,]+/g,' ').trim();
 const match=normal(discomName)===normal(bankName);
 return {discomName,bankName,match,bankConfirmed:true,resolution:match?null:input.samePerson?'Accepted as same person':null,billFile:String(input.billFile||'').slice(0,255),bankFile:String(input.bankFile||'').slice(0,255)};
}
