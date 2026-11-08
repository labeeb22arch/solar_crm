export function lastCustomerUpdate(project, now = Date.now()) {
  const dates=[project.updatedAt,project.createdAt,project.stageAt,...(project.timeline||[]).map((entry)=>entry.at),...Object.values(project.tracks||{}).flat().map((task)=>task.updatedAt),...(project.payments||[]).map((payment)=>payment.recordedAt||payment.date),project.warranty?.savedAt];
  const times=dates.map((date)=>Date.parse(date)).filter((time)=>Number.isFinite(time)&&time<=now);
  return times.length?new Date(Math.max(...times)).toISOString():null;
}
export function lastCustomerUpdater(project,now=Date.now()) {
 const latest=Date.parse(lastCustomerUpdate(project,now));
 if(!Number.isFinite(latest))return null;
 const candidates=[{at:project.updatedAt,by:project.updatedBy},...(project.timeline||[]),...(project.payments||[]).map(p=>({at:p.recordedAt||p.loggedAt,by:p.recordedBy||p.loggedBy||p.by})),{at:project.warranty?.savedAt,by:project.warranty?.savedBy}];
 return candidates.find(entry=>Date.parse(entry.at)===latest&&String(entry.by||'').trim())?.by||null;
}
