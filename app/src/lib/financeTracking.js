// Reference: SolarFlow Admin customer Loan and Subsidy panels, inspected 2026-10-26.
export const TRACKING_STATUSES = {
 subsidy: [['not_applied','No tag'],['inprocess','Inprocess'],['redeemed','Redeemed'],['returned','Returned'],['approved','Approved'],['received','Received'],['rejected','Rejected']],
 loan: [['not_applied','No tag'],['inprocess','Inprocess'],['sanctioned','Sanctioned'],['returned','Returned'],['rejected','Rejected'],['first_payment','1st Payment'],['second_payment','2nd Payment'],['total_received','Total Received']],
};
const LEGACY = {subsidy:{applied:'inprocess',submitted:'inprocess',reapply:'inprocess'},loan:{documents_pending:'inprocess',documents_submitted:'inprocess',applied:'inprocess',approved:'sanctioned',disbursed:'total_received',reapply:'inprocess'}};
export const normalizeTrackingStatus=(kind,status)=>LEGACY[kind]?.[status]||status;
export const trackingLabel=(kind,status)=>TRACKING_STATUSES[kind]?.find(([key])=>key===status)?.[1]||String(status||'No tag').replaceAll('_',' ');
export function trackingStatus(p, kind) {
 if(p.financeTracking?.[kind]?.status)return normalizeTrackingStatus(kind,p.financeTracking[kind].status);
 const done=key=>p.tracks?.finance?.find(t=>t.key===key)?.status==='done';
 if(kind==='loan')return done('disbursement')?'total_received':done('sanction')?'sanctioned':'inprocess';
 const last=p.subsidy?.at(-1)?.status?.toLowerCase()||'';
 return /received|credited/.test(last)||done('subsidy')?'received':/reject/.test(last)?'rejected':/return/.test(last)?'returned':/redeem/.test(last)?'redeemed':/approv/.test(last)?'approved':/submit|appl|process/.test(last)?'inprocess':'not_applied';
}
export function eligibleTracking(p, kind) {
  return kind === 'loan' ? ['Bank Solar Loan','Personal Loan'].includes(p.paymentMethod) : p.scheme === 'pm_surya_ghar' || !!p.subsidy?.length || !!p.financeTracking?.subsidy;
}
export function appendTracking(current, kind, form, context) {
  if (!TRACKING_STATUSES[kind]?.some(([key]) => key === form.status) && !Object.hasOwn(LEGACY[kind]||{},form.status)) throw new Error('Choose a valid status');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '') || Number.isNaN(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0,10) !== form.date || form.date > context.today) throw new Error('Choose a valid date up to today');
  if (form.status === 'reapply' && !['rejected','returned','reapply'].includes(context.previousStatus)) throw new Error('Apply again is available after a rejection');
  const amount = form.amount === '' || form.amount == null ? null : Number(form.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error('Enter a valid amount');
  if (form.status === 'rejected' && !String(form.note || '').trim()) throw new Error('Record the rejection reason');
  const entry = { id: context.id, at: context.at, by: context.by, status: form.status, date: form.date, reference: String(form.reference || '').trim(), note: String(form.note || '').trim(), amount };
  return { ...current, status: entry.status, updatedAt: context.at, history: [...(current?.history || []), entry] };
}
export const LOAN_DOCS = [['feasibility','Vendor Feasibility'],['site_feasibility','Site Feasibility'],['digital_certificate','Digital Certificate']];
