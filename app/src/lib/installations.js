export function installationInfo(project, stage, task) {
  const changes = (project.timeline || []).filter((entry) => entry.type === 'installation_rescheduled' || /^installDate changed: (?!—|null)(\d{4}-\d{2}-\d{2}) → \d{4}-\d{2}-\d{2}/.test(entry.text || ''));
  const last = changes[changes.length - 1];
  const completed = task.status === 'done';
  return {
    included: stage === 'pending_installation' || !!project.installDate || completed || changes.length > 0,
    installationView: completed ? 'completed' : last ? 'rescheduled' : 'current',
    rescheduledAt: last?.at || null,
    previousInstallDate: last?.previousDate || last?.text?.match(/^installDate changed: (\d{4}-\d{2}-\d{2})/)?.[1] || null,
    rescheduleReason: last?.reason || '',
    installCompletedAt: completed ? task.updatedAt : null,
  };
}
