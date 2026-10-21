export function documentInboxEntry(project,key,now=Date.now()) {
 if(!['quote','agreement'].includes(key))return null;
 const kind=key==='quote'?'proposal':'agreement';
 const request=key==='quote'?project.proposalRequest:project.signRequest;
 const returned=key==='quote'?project.proposal?.accepted:project.signature;
 const delivery=request?.token?project.documentDelivery?.[request.token]:null;
 const file=project.docLinks?.[kind]||(key==='quote'?project.docLinks?.quote:null);
 if(!request?.token)return null;
 if(returned?.png)return {bucket:'received',sentAt:delivery?.at||'',receivedAt:returned.at||request.usedAt||'',saved:!!file&&file.requestToken===request.token,expired:false};
 if(!delivery)return null;
 return {bucket:'waiting',sentAt:delivery.at||'',receivedAt:'',saved:false,expired:Date.parse(request.expiresAt)<now};
}
