export function paymentMilestones(project) {
 const schedule=(project.schedule||[]).filter(Boolean).map((entry,index)=>({...entry,index,receipts:[],received:0,remaining:Number(entry.amount)||0}));
 for(const payment of project.payments||[]) {
  let rest=Number(payment.amount)||0;
  const target=Number.isInteger(payment.milestoneIndex)?schedule.find((m)=>m.index===payment.milestoneIndex):null;
  const destinations=target?[target,...schedule.filter((m)=>m!==target)]:schedule;
  for(const milestone of destinations){const amount=Math.min(rest,Math.max(0,milestone.remaining));if(amount<=0)continue;milestone.receipts.push({...payment,allocatedAmount:amount});milestone.received=Math.round((milestone.received+amount)*100)/100;milestone.remaining=Math.round((milestone.remaining-amount)*100)/100;rest=Math.round((rest-amount)*100)/100;}
 }
 return schedule;
}
export function cleanPaymentPlan(entries,value) {
 if(!Array.isArray(entries)||entries.length<3||entries.length>5)throw new Error('Use between 3 and 5 payment milestones');
 const plan=entries.map((entry)=>{const label=String(entry.label||'').trim();const amount=Number(entry.amount);if(!label||!Number.isFinite(amount)||amount<0)throw new Error('Enter a name and valid amount for every milestone');return {label,amount:Math.round(amount*100)/100,due:entry.due||null,expectedDate:entry.expectedDate||null};});
 if(Math.abs(plan.reduce((sum,m)=>sum+m.amount,0)-Number(value))>0.01)throw new Error('Milestone amounts must add up to the project value');
 return plan;
}
