const DAY = 86400000;
const FIRST = ['Aarav','Diya','Ishaan','Meera','Rohan','Anaya','Vivaan','Kavya','Aditya','Nisha','Arjun'];
const LAST = ['Patel','Shah','Desai','Mehta'];
const TASKS = [
 ['enquiry','survey','quotation','proposal','agreement','feasibility'],
 ['method','loan_docs','sanction','loan_agreement','disbursement','advance','name_check'],
 ['bom','reservation','challan','tally'],['team','installation'],['serials','discom_docs'],
 ['submission'],['net_meter'],['commissioning'],[],['inspection'],
];
export const DEMO_PACK = 'solar-crm-demo-v1';
export function createDemoExpansion(templates,stages,now=new Date().toISOString()) {
 if(!templates.length)throw new Error('Demo templates are unavailable');
 const stamp=new Date(now).getTime();
 const ago=n=>new Date(stamp-n*DAY).toISOString();
 return stages.flatMap((stage,index)=>Array.from({length:4},(_,variant)=>{
  const n=index*4+variant+1,num=String(n).padStart(4,'0');
  const loan=variant<2;
  const template=templates.find(p=>p.paymentMethod?.includes('Loan')===loan)||templates[n%templates.length];
  const p=structuredClone(template);
  const prefix=`DEMO-${num}`;
  Object.assign(p,{
   id:`PRJ-${DEMO_PACK}-${num}`,crn:`DEMO-CRM-${num}`,demoPack:DEMO_PACK,
   name:`Demo · ${FIRST[index%FIRST.length]} ${LAST[variant]}`,contact:null,phone:`000000${String(n).padStart(4,'0')}`,
   email:`customer${num}@example.invalid`,type:'Residential',kwp:[3,5,7,10][variant],
   stage:stage.id,stageAt:ago(variant+1),createdAt:ago(25+index*4),updatedAt:now,
   scheme:variant===3?'non_subsidy':'pm_surya_ghar',
   paymentMethod:loan?'Bank Solar Loan':'Cash',bank:loan?'Demo Bank':'Self-funded',
   address:`Demo site ${n}, Sample Solar Society, ${p.city}`,
   consumerNo:`DEMO-CONSUMER-${num}`,portalId:index?'DEMO-PORTAL-'+num:'',fileNo:'DEMO-FILE-'+num,
   subDivision:'Demo subdivision',registrationDate:index?ago(20).slice(0,10):'',registeredBy:'Demo office',registrationStatus:index?'Registered':'Pending',
   janSamarthNo:loan?'DEMO-JS-'+num:'',bankAccountName:`${FIRST[index%FIRST.length]} ${LAST[variant]}`,
   roofShed:variant%2?'Shed':'Roof',dcCable:40+variant*10,acCable:20+variant*5,frontLegHeight:3,rearLegHeight:6,
   materialNotes:'Synthetic demo material specifications',driveFolder:null,siteLocation:null,docLinks:{},documentDownloads:{},documentDelivery:{},
   quotation:null,proposal:null,proposalRequest:null,signRequest:null,signature:null,agreement:null,
   deletedAt:null,deletedBy:null,trashReason:null,bomVersions:[],notes:[],reminders:[],acted:{},
  });
  p.value=p.kwp*52000;
  p.nameCheck={discomName:p.bankAccountName,bankName:p.bankAccountName,aadhaarName:p.bankAccountName,match:true,resolution:null};
  for(const tasks of Object.values(p.tracks))for(const task of tasks){
   const taskStage=TASKS.findIndex(keys=>keys.includes(task.key));
   task.status=index===stages.length-1||taskStage>=0&&taskStage<index?'done':'not_started';
   task.updatedAt=task.status==='done'?ago(Math.max(2,(index-taskStage)*2)):null;
  }
  const current=Object.values(p.tracks).flat().find(t=>TASKS[index]?.includes(t.key));
  if(current&&stage.id!=='completed'){current.status=variant===2?'waiting_customer':variant===3?'blocked':'in_progress';current.updatedAt=ago(variant+1);}
  p.installDate=index>=4?ago(15).slice(0,10):index===3?new Date(stamp+variant*DAY).toISOString().slice(0,10):null;
  p.serials=index>=4?{modules:Array.from({length:Math.ceil(p.kwp*1000/550)},(_,i)=>`DEMO-PANEL-${num}-${String(i+1).padStart(2,'0')}`),inverter:`DEMO-INV-${num}`}:{modules:[],inverter:''};
  p.warranty={invoiceNumber:stage.id==='completed'?`DEMO-INV-${num}`:'',invoiceDate:stage.id==='completed'?ago(12).slice(0,10):'',startDate:stage.id==='completed'?ago(12).slice(0,10):'',moduleMake:['Waaree','Adani','Tata Power Solar','Vikram Solar'][variant],moduleModel:'Demo 550 W mono module',moduleWp:550,moduleProductYears:12,modulePerformanceYears:25,inverterMake:['Sungrow','Growatt','Solis','GoodWe'][variant],inverterModel:`Demo ${p.kwp} kW on-grid`,inverterCapacity:p.kwp,inverterPhase:p.kwp>5?'Three phase':'Single phase',inverterYears:5,structure:'Galvanised steel',structureYears:5,earthing:'AC/DC earthing and lightning protection',workmanshipYears:5,certificateNumber:index===10?`DEMO-WARRANTY-${num}`:'',certificateUrl:'',supportContact:'Demo service desk',notes:'Synthetic demo coverage for presentation purposes'};
  p.warrantyIssues=[];
  p.schedule=[{label:'Advance',amount:p.value*.2,due:ago(18)},{label:'Before installation',amount:p.value*.6,due:ago(8)},{label:'On commissioning',amount:p.value*.2,due:ago(1)}];
  const received=index>=8?3:index>=4?2:index>=2?1:0;
  p.payments=p.schedule.slice(0,received).map((part,i)=>({id:`${prefix}-PAY-${i}`,date:i===received-1?now:ago(15-i*5),amount:part.amount,mode:i%2?'Cheque':'Online Transfer',ref:`DEMO-RECEIPT-${num}-${i+1}`,note:'Synthetic demonstration receipt',by:'Demo Admin',loggedBy:'Demo Admin',loggedAt:now,recordedBy:'Demo Admin',recordedAt:now}));
  p.loan=loan?{bank:'Demo Bank',amount:p.value*.8,ref:`DEMO-LOAN-${num}`}:null;
  p.financeTracking={};
  if(loan)p.financeTracking.loan={status:index>1?'disbursed':['documents_pending','documents_submitted','applied','approved'][variant],updatedAt:now,history:[]};
  p.subsidy=[];
  if(p.scheme==='pm_surya_ghar'){
   const status=index===10?'received':index>=5?['applied','submitted','rejected','reapply'][variant]:'not_applied';
   p.financeTracking.subsidy={status,updatedAt:now,history:[{id:`${prefix}-SUB`,status,date:ago(2).slice(0,10),at:ago(2),by:'Demo Admin',reference:`DEMO-SUB-${num}`,note:status==='rejected'?'Demo: bank details need review':'Synthetic demonstration status',amount:status==='received'?78000:null}]};
  }
  p.drive=(p.drive||[]).map(d=>({...d,present:index>=2&&['Electricity bill','PAN card','Bank passbook / cheque'].includes(d.slot),url:'',by:'',at:'',versions:[],file:'',modified:now}));
  p.verification={};
  p.timeline=[{type:'note',at:now,by:'Demo Admin',text:'Synthetic demo customer added; no real customer data.'},{type:'status',at:p.stageAt,by:'Demo Admin',text:`Stage: ${stage.label}`}];
  return p;
 }));
}
export function missingDemoRecords(existing,candidates) {
 const ids=new Set(existing.map(p=>p.id)),crns=new Set(existing.map(p=>p.crn));
 return candidates.filter(p=>!ids.has(p.id)&&!crns.has(p.crn));
}
