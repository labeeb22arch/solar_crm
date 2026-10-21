// Pure stock transition: validate everything on a copy before committing any changes.
export function changeDelivery(state, action, payload, at) {
  const next = JSON.parse(JSON.stringify(state));
  next.batches ||= [];
  if (action === 'create') {
    const batch = payload;
    if (!batch.id || !batch.vehicle?.trim() || !batch.team || !/^\d{4}-\d{2}-\d{2}$/.test(batch.date || '') || !batch.customers?.length || !batch.lines?.length) throw new Error('Choose customers, a truck, team and delivery date');
    if (next.batches.some((b) => b.id === batch.id)) return next;
    const assigned = new Set(next.batches.filter((b) => b.status !== 'cancelled').flatMap((b) => b.customers.map((c) => c.id)));
    if (batch.customers.some((c) => assigned.has(c.id))) throw new Error('A selected customer already has a delivery batch');
    const seen = new Set();
    for (const line of batch.lines) {
      if (seen.has(line.sku) || !Number.isFinite(line.qty) || line.qty <= 0) throw new Error('Invalid BOM quantities');
      seen.add(line.sku);
      const stock = next.inventory.find((i) => i.sku === line.sku);
      if (!stock || stock.stock - stock.reserved < line.qty) throw new Error(`Not enough free stock: ${line.name || line.sku}`);
      stock.reserved += line.qty;
    }
    next.batches.unshift({ ...batch, status: 'planned', createdAt: at, history: [{ status: 'planned', at }] });
    return next;
  }
  const batch = next.batches.find((b) => b.id === payload.id);
  if (!batch) throw new Error('Batch not found');
  if (batch.status === action || (action === 'loaded' && batch.status === 'delivered')) return next;
  const allowed = { loaded: 'planned', delivered: 'loaded', cancelled: 'planned' };
  if (!allowed[action] || allowed[action] !== batch.status) throw new Error('This batch cannot move to that status');
  if (action === 'loaded' && batch.lines.some((l) => !payload.checked?.includes(l.sku))) throw new Error('Check every material before confirming the truck is loaded');
  if (action === 'loaded' || action === 'cancelled') {
    for (const line of batch.lines) {
      const stock = next.inventory.find((i) => i.sku === line.sku);
      if (!stock || stock.reserved < line.qty || (action === 'loaded' && stock.stock < line.qty)) throw new Error(`Stock changed: ${line.name}. Reload and check the batch.`);
      stock.reserved -= line.qty;
      if (action === 'loaded') stock.stock -= line.qty;
    }
  }
  batch.status = action;
  batch[action + 'At'] = at;
  batch.history.push({ status: action, at });
  return next;
}
export function combineBOM(customers) {
  const lines = new Map();
  for (const customer of customers) for (const line of customer.lines) {
    lines.set(line.sku, { ...line, qty: (lines.get(line.sku)?.qty || 0) + line.qty });
  }
  return [...lines.values()];
}
