import {createDemoExpansion} from './demoExpansion.js';
import {proposalInputs,mergeSettings} from '../docs/proposal/settings.js';
import {computeProposal,proposalTotals} from '../docs/proposal/calc.js';
import {DEMO_RETURN_IMAGE} from './demoReturnImage.js';

export const SHOWCASE_PACK='solar-crm-showcase-v2';
const DAY=86400000;
const SURNAMES=['Patel','Shah','Desai','Mehta','Joshi','Parmar'];
const LOAN_STEPS=['inprocess','sanctioned','first_payment','second_payment','total_received'];
const SUBSIDY_STEPS=['inprocess','approved','redeemed','received'];

/** Additive, explicitly synthetic fixtures. Tokens are deliberately non-live. */
export function createDemoShowcase(templates,stages,now=new Date().toISOString()) {
 const base=createDemoExpansion(templates,stages,now),stamp=Date.parse(now);
 const ago=days=>new Date(stamp-days*DAY).toISOString();
 return stages.flatMap((stage,index)=>Array.from({length:6},(_,variant)=>{
  const p=structuredClone(base[index*4+variant%4]);
  const n=index*6+variant+1,num=String(n).padStart(4,'0');
  const loan=variant<4;
  Object.assign(p,{id:`PRJ-${SHOWCASE_PACK}-${num}`,crn:`DEMO-V2-${num}`,demoPack:SHOWCASE_PACK,demoOnly:true,
   name:p.name.replace(/\S+$/,SURNAMES[variant]),phone:`000002${num}`,email:`showcase${num}@example.invalid`,
   paymentMethod:loan?'Bank Solar Loan':'Cash',bank:loan?'Demo Bank':'Self-funded',scheme:variant===5?'non_subsidy':'pm_surya_ghar',
   address:`Demo house ${n}, Sample Solar Society, ${p.city}`,consumerNo:`DEMO-V2-CONSUMER-${num}`,
   portalId:index?`DEMO-V2-PORTAL-${num}`:'',fileNo:`DEMO-V2-FILE-${num}`,janSamarthNo:loan?`DEMO-V2-JS-${num}`:'',
   notes:[{at:ago(3),by:'Demo Admin',text:'DEMO: site survey completed; roof access and electricity connection reviewed.'},{at:ago(1),by:'Demo Office',text:'DEMO: customer follow-up completed. Next action and assigned team checked.'}],
   materialNotes:'DEMO: module layout, cable route, earthing and inverter position reviewed with installation crew.',
   financeTracking:{},subsidy:[],proposal:null,proposalRequest:null,quotation:null,signRequest:null,signature:null,documentDelivery:{},documentDownloads:{},docLinks:{},
  });
  const history=(kind,steps)=>steps.map((status,i)=>({id:`DEMO-V2-${num}-${kind}-${i}`,status,date:ago(8-i).slice(0,10),at:ago(8-i),by:i%2?'Demo Finance':'Demo Admin',reference:`DEMO-${kind.toUpperCase()}-${num}`,note:status==='returned'?'DEMO: bank requested a corrected document.':status==='rejected'?'DEMO: application needs a corrected account name.':`DEMO: ${kind} ${status.replaceAll('_',' ')} confirmed for walkthrough.`,amount:null}));
  if(loan){
   let steps=LOAN_STEPS.slice(0,Math.min(5,Math.max(1,index)));
   if(variant===2&&index<4)steps=['inprocess','returned'];
   if(variant===3&&index<4)steps=['inprocess','rejected'];
   p.financeTracking.loan={status:steps.at(-1),history:history('loan',steps),updatedAt:ago(1),documents:Object.fromEntries(['feasibility','site_feasibility','digital_certificate'].map(key=>[key,{status:index>1?'submitted':'ready',date:ago(5).slice(0,10),reference:`DEMO-BANK-${num}`,history:[]}]))};
   p.loan={bank:'Demo Bank',amount:p.value*.8,ref:`DEMO-V2-LOAN-${num}`};
  }else p.loan=null;
  if(p.scheme==='pm_surya_ghar'){
   const steps=index<4?['not_applied']:SUBSIDY_STEPS.slice(0,Math.min(4,index-3));
   if(variant===2&&index>=5)steps.splice(1,steps.length,'returned');
   p.financeTracking.subsidy={status:steps.at(-1),history:history('subsidy',steps),updatedAt:ago(1)};
  }
  if(p.serials.modules.length)p.serials={modules:p.serials.modules.map((_,i)=>`DEMO-V2-PANEL-${num}-${String(i+1).padStart(2,'0')}`),inverter:`DEMO-V2-INVERTER-${num}`};
  p.warranty.invoiceNumber=p.stage==='completed'?`DEMO-V2-INVOICE-${num}`:'';
  p.warranty.certificateNumber=p.stage==='completed'?`DEMO-V2-WARRANTY-${num}`:'';
  p.payments=p.payments.map((r,i)=>({...r,id:`DEMO-V2-${num}-PAY-${i}`,ref:`DEMO-V2-RECEIPT-${num}-${i+1}`}));
  // Prepared, sent, returned and expired examples all use the normal document store.
  const prepared=index>0||variant>0;
  if(prepared){
   const inputs={...proposalInputs(p,mergeSettings()),price:p.value};
   if(p.scheme==='non_subsidy'){inputs.subsidy=0;inputs.subsidyAuto=false;}
   const token=`demo-only-${num}-proposal`,createdAt=ago(4);
   const returned=index>1||variant===3||variant===4;
   p.proposal={version:1,number:`DEMO-PRP-V2-${num}`,createdAt,inputs,totals:proposalTotals(computeProposal(inputs))};
   p.proposalRequest={token,demoOnly:true,createdAt,expiresAt:variant===5?ago(1):new Date(stamp+7*DAY).toISOString(),status:returned?'signed':'sent',...(returned?{usedAt:ago(2)}:{})};
   p.quotation={version:1,status:returned?'approved':'sent',sentAt:createdAt,total:p.value,kwp:p.kwp};
   if(variant!==1||index>0)p.documentDelivery[token]={at:ago(3),by:'Demo Admin',channel:'WhatsApp · demo example',demoOnly:true};
   if(returned)p.proposal.accepted={png:DEMO_RETURN_IMAGE,at:ago(2),method:'demo',demoOnly:true};
  }
  if(p.scheme==='pm_surya_ghar'&&index>=4){
   const token=`demo-only-${num}-agreement`,returned=variant%3!==0;
   p.signRequest={token,demoOnly:true,createdAt:ago(3),expiresAt:new Date(stamp+5*DAY).toISOString(),status:returned?'signed':'sent',...(returned?{usedAt:ago(1)}:{})};
   p.documentDelivery[token]={at:ago(2),by:'Demo Office',channel:'WhatsApp · demo example',demoOnly:true};
   if(returned)p.signature={png:DEMO_RETURN_IMAGE,at:ago(1),method:'demo',demoOnly:true};
  }
  if(loan&&index>0)p.documentDownloads.feas={at:ago(3),by:'Demo Office',demoOnly:true};
  p.timeline=[...p.timeline.map(e=>({...e,text:e.text.replace('Synthetic demo customer added; no real customer data.','Synthetic showcase customer; no real customer data.')})),
   ...Object.values(p.documentDelivery).map(e=>({type:'document',at:e.at,by:e.by,text:'DEMO: document link shared on WhatsApp (simulated)'})),
   ...(p.proposal?.accepted?[{type:'document',at:p.proposal.accepted.at,by:'Demo customer',text:'DEMO: quotation accepted; sample return image only'}]:[]),
   ...(p.signature?[{type:'document',at:p.signature.at,by:'Demo customer',text:'DEMO: DISCOM agreement returned; sample image only'}]:[])];
  return p;
 }));
}
