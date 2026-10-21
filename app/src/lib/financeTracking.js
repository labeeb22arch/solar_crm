export const TRACKING_STATUSES = {
  subsidy: [['not_applied','To apply'],['applied','Applied'],['submitted','Submitted'],['rejected','Rejected'],['reapply','Apply again'],['received','Subsidy received']],
  loan: [['documents_pending','Documents pending'],['documents_submitted','Papers submitted'],['applied','Applied'],['approved','Approved'],['rejected','Rejected'],['reapply','Apply again'],['disbursed','Disbursed']],
};
export function trackingStatus(p, kind) {
  if (p.financeTracking?.[kind]?.status) return p.financeTracking[kind].status;
  const done = (key) => p.tracks?.finance?.find((t) => t.key === key)?.status === 'done';
  if (kind === 'loan') return done('disbursement') ? 'disbursed' : done('sanction') ? 'approved' : 'documents_pending';
  const last = p.subsidy?.[p.subsidy.length - 1]?.status?.toLowerCase() || '';
  return /received|credited/.test(last) || done('subsidy') ? 'received' : /reject/.test(last) ? 'rejected' : /submit/.test(last) ? 'submitted' : /appl/.test(last) ? 'applied' : 'not_applied';
}
export function eligibleTracking(p, kind) {
  return kind === 'loan' ? ['Bank Solar Loan','Personal Loan'].includes(p.paymentMethod) : p.scheme === 'pm_surya_ghar' || !!p.subsidy?.length || !!p.financeTracking?.subsidy;
}
export function appendTracking(current, kind, form, context) {
  if (!TRACKING_STATUSES[kind]?.some(([key]) => key === form.status)) throw new Error('Choose a valid status');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '') || Number.isNaN(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0,10) !== form.date || form.date > context.today) throw new Error('Choose a valid date up to today');
  if (form.status === 'reapply' && !['rejected','reapply'].includes(context.previousStatus)) throw new Error('Apply again is available after a rejection');
  const amount = form.amount === '' || form.amount == null ? null : Number(form.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error('Enter a valid amount');
  if (form.status === 'rejected' && !String(form.note || '').trim()) throw new Error('Record the rejection reason');
  const entry = { id: context.id, at: context.at, by: context.by, status: form.status, date: form.date, reference: String(form.reference || '').trim(), note: String(form.note || '').trim(), amount };
  return { ...current, status: entry.status, updatedAt: context.at, history: [...(current?.history || []), entry] };
}
export const LOAN_DOCS = [['quotation','Quotation'],['feasibility','Feasibility report'],['pm_surya_ghar','PM Surya Ghar papers'],['identity','Identity & bank papers']];
