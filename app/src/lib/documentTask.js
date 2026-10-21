export function documentTaskState(p,key,now=Date.now()) {
  const kind=key==='quote'?'proposal':key;
  const request=key==='quote'?p.proposalRequest:key==='agreement'?p.signRequest:null;
  const returned=key==='quote'?p.proposal?.accepted:key==='agreement'?p.signature:null;
  const file=p.docLinks?.[kind]||(key==='quote'?p.docLinks?.quote:null);
  if(file&&(!request||file.requestToken===request.token))return 'saved';
  if(returned?.png)return p.documentDownloads?.[request?.token||key]?'upload':'download';
  if(['feas','name'].includes(key))return p.documentDownloads?.[key]?'upload':'prepare';
  if(!request||Date.parse(request.expiresAt)<now)return 'prepare';
  return p.documentDelivery?.[request.token]?'waiting':'share';
}
export const DOCUMENT_TASKS=[['quote','Quotation'],['feas','Loan feasibility'],['agreement','DISCOM submission']];
export function preparedDocumentKeys(p) {
  return DOCUMENT_TASKS.map(([key])=>key).filter((key)=>key==='quote'?!!(p.quotation||p.proposal||p.proposalRequest||p.docLinks?.proposal||p.docLinks?.quote):key==='agreement'?!!(p.signRequest||p.signature||p.docLinks?.agreement):!!(p.documentDownloads?.[key]||p.docLinks?.[key]));
}
