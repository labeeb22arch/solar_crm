const statuses = ['open', 'in_progress', 'resolved'];
const equipment = ['Panels', 'Inverter', 'Installation', 'Structure', 'Earthing / wiring', 'Other'];
const text = (v) => String(v ?? '').trim().slice(0, 5000);
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function recordWarrantyIssue(issues, id, input, { at, today, by, newId }) {
  const next = JSON.parse(JSON.stringify(issues || []));
  const existing = id ? next.find((issue) => issue.id === id) : null;
  if (id && !existing) throw new Error('Warranty issue not found');
  const status = input.status || 'open';
  if (!statuses.includes(status)) throw new Error('Choose a valid issue status');
  const raisedDate = existing?.raisedDate || text(input.raisedDate);
  if (!validDate(raisedDate) || raisedDate > today) throw new Error('Choose a valid date raised, up to today');
  const resolvedDate = status === 'resolved' ? text(input.resolvedDate) : '';
  const resolution = status === 'resolved' ? text(input.resolution) : '';
  if (status === 'resolved' && (!validDate(resolvedDate) || resolvedDate < raisedDate || resolvedDate > today)) throw new Error('Resolution date must be between the date raised and today');
  if (status === 'resolved' && !resolution) throw new Error('Record how the issue was resolved');
  const note = text(input.note);
  const assignedTo = text(input.assignedTo);
  if (existing && existing.status === status && existing.assignedTo === assignedTo && existing.resolvedDate === resolvedDate && existing.resolution === resolution && !note) throw new Error('Add a note or change the issue status or assignment');
  const issue = existing || { id: newId, title: text(input.title), description: text(input.description), equipment: input.equipment, serial: text(input.serial), reportedBy: text(input.reportedBy), raisedDate, createdAt: at, createdBy: by, history: [] };
  if (!issue.title || !issue.description || !equipment.includes(issue.equipment)) throw new Error('Enter a title, issue details and affected equipment');
  const event = { id: newId, at, by, kind: existing ? 'updated' : 'raised', status, assignedTo, resolvedDate, resolution, note, previousStatus: existing?.status || null };
  issue.status = status; issue.assignedTo = assignedTo; issue.resolvedDate = resolvedDate; issue.resolution = resolution; issue.updatedAt = at;
  issue.history.push(event);
  if (!existing) next.unshift(issue);
  return next;
}
