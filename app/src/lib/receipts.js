export function indiaDay(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function cleanReceipt(form, balance, today, modes = ['Cash','UPI','Bank transfer','Cheque','Card']) {
  const amount=Number(form.amount);
  if (!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.00001) throw new Error('Enter a positive payment amount with at most two decimal places');
  if (amount>balance+0.001) throw new Error('Payment exceeds this customer’s outstanding balance');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date||'')||Number.isNaN(Date.parse(form.date))||new Date(form.date).toISOString().slice(0,10)!==form.date||form.date>today) throw new Error('Choose a valid received date up to today');
  if (!modes.includes(form.mode)) throw new Error('Choose a payment mode');
  return { amount:Math.round(amount*100)/100,date:form.date,mode:form.mode,ref:String(form.ref||'').trim(),tag:String(form.tag||'').trim(),note:String(form.note||'').trim() };
}
export function expectedReceipts(project) {
  let received=Math.round((project.payments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0)*100);
  return (project.schedule||[]).filter(Boolean).map((milestone,index)=>{
    const amount=Math.max(0,Math.round(Number(milestone.amount||0)*100));
    const allocated=Math.min(amount,received); received-=allocated;
    return {index,label:milestone.label,amount:(amount-allocated)/100,date:(milestone.expectedDate||milestone.due)?indiaDay(milestone.expectedDate||milestone.due):''};
  }).filter((entry)=>entry.amount>0);
}
