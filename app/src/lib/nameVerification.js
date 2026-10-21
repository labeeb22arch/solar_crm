export function namesMatch(a,b) {
 const normal=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s.,]+/g,' ').trim();
 return !!normal(a)&&normal(a)===normal(b);
}
export function cleanNameVerification(input) {
 const discomName=String(input.discomName||'').trim().slice(0,180),bankName=String(input.bankName||'').trim().slice(0,180);
 if(!discomName||!bankName)throw new Error('Enter both names as printed on the documents');
 if(!input.bankConfirmed)throw new Error('Confirm that you checked both names against the documents');
 const exact=namesMatch(discomName,bankName);
 const reviewStatus=input.reviewStatus||(exact||input.samePerson?'matches':'change_needed');
 if(!['matches','change_needed'].includes(reviewStatus))throw new Error('Choose Matches or Change needed');
 const links={};
 for(const key of ['billUrl','bankUrl']){const value=String(input[key]||'').trim();if(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch{throw new Error('Use a valid http or https document link');}}links[key]=value;}
 return {discomName,bankName,...links,reviewStatus,match:reviewStatus==='matches'&&exact,bankConfirmed:true,resolution:reviewStatus==='matches'&&!exact?'Accepted as same person':null};
}
