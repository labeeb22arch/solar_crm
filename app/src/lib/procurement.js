export function makeBOMVersion(versions, input, inventory, actor, at, id) {
  if (!Array.isArray(input.lines) || !input.lines.length) throw new Error('Add at least one material');
  const seen = new Set();
  const lines = input.lines.map((line) => {
    const stock = inventory.find((item) => item.sku === line.sku);
    const qty = Number(line.qty);
    if (!stock || seen.has(line.sku) || !Number.isFinite(qty) || qty <= 0 || (['pcs','kit','set','pair'].includes(stock.unit) && !Number.isInteger(qty))) throw new Error('Choose unique materials and valid positive quantities');
    seen.add(line.sku);
    return { sku: stock.sku, name: stock.name, unit: stock.unit, qty, note: String(line.note || '').trim() };
  });
  return { id, version: (versions?.at(-1)?.version || 0) + 1, lines, notes: String(input.notes || '').trim(), createdAt: at, createdBy: actor, events: [], upload: null, uploadHistory: [] };
}
export function changeBOMVersion(versions, id, action, input, actor, at) {
  const next = JSON.parse(JSON.stringify(versions || []));
  const version = next.find((entry) => entry.id === id);
  if (!version) throw new Error('BOM version not found');
  if (!['downloaded','print_requested','uploaded'].includes(action)) throw new Error('Unknown BOM action');
  const event = { action, by: actor, at };
  if (action === 'uploaded') {
    let url; try { url = new URL(input.url); } catch { throw new Error('Enter the uploaded file link'); }
    if (!['https:','http:'].includes(url.protocol)) throw new Error('Use an http or https file link');
    version.upload = { url: url.href, by: actor, at };
    version.uploadHistory ||= []; version.uploadHistory.push(version.upload);
    event.url = url.href;
  }
  version.events.push(event);
  return next;
}
export function pendingBOMUpload(version) {
  const downloads = (version?.events || []).filter((event) => event.action === 'downloaded');
  return downloads.length && !version.upload ? downloads.at(-1) : null;
}
