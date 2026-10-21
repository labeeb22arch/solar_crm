/** Presentation helpers: retain stored stages while explaining outstanding work. */
export const isInstalled = (r) => r.installStatus === 'done' || !!r.milestones?.find((m) => m.key === 'installed' && m.reached);
export const needsAttention = (r) => !!r.next?.overdue || r.tone === 'red' || r.worst === 'blocked';
export function customerStage(r) {
  if (r.stage === 'completed' && r.next) return `Installed · ${r.next.track === 'finance' && r.next.key === 'subsidy' ? 'Subsidy pending' : 'Follow-up pending'}`;
  return r.stageLabel || 'New enquiry';
}
