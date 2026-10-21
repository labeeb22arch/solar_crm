export function lastCustomerUpdate(project, now = Date.now()) {
  const dates=[project.updatedAt,project.createdAt,project.stageAt,...(project.timeline||[]).map((entry)=>entry.at),...Object.values(project.tracks||{}).flat().map((task)=>task.updatedAt),...(project.payments||[]).map((payment)=>payment.recordedAt||payment.date),project.warranty?.savedAt];
  const times=dates.map((date)=>Date.parse(date)).filter((time)=>Number.isFinite(time)&&time<=now);
  return times.length?new Date(Math.max(...times)).toISOString():null;
}
