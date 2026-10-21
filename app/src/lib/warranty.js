export const WARRANTY_FIELDS = ['invoiceNumber', 'invoiceDate', 'startDate', 'moduleMake', 'moduleModel', 'moduleWp', 'inverterMake', 'inverterModel', 'inverterCapacity', 'inverterPhase', 'structure', 'earthing', 'certificateNumber', 'certificateUrl', 'supportContact', 'notes', 'workmanshipYears', 'moduleProductYears', 'modulePerformanceYears', 'inverterYears', 'structureYears'];
export function warrantyEnd(start, years) {
  if (!start || years === '' || years == null || !Number.isFinite(Number(years))) return null;
  const date = new Date(start.slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return null;
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + Number(years));
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
export function warrantyRecord(p) {
  const task = (track, key) => p.tracks?.[track]?.find((t) => t.key === key);
  const completed = (track, key) => task(track, key)?.status === 'done' ? task(track, key)?.updatedAt?.slice(0, 10) || '' : '';
  const saved = p.warranty || {};
  const installDate = completed('supply', 'installation');
  const commissioningDate = completed('grid', 'commissioning');
  const invoiceDate = saved.invoiceDate || completed('closure', 'invoice');
  const startDate = saved.startDate || invoiceDate || installDate || commissioningDate;
  const fields = Object.fromEntries(WARRANTY_FIELDS.map((k) => [k, saved[k] ?? (k === 'workmanshipYears' ? 5 : '')]));
  fields.invoiceDate = invoiceDate; fields.startDate = startDate;
  const terms = [ ['Installation / workmanship', 'workmanshipYears'], ['Panel product', 'moduleProductYears'], ['Panel performance', 'modulePerformanceYears'], ['Inverter', 'inverterYears'], ['Mounting structure', 'structureYears'] ].map(([label, key]) => ({ label, key, years: fields[key], until: warrantyEnd(startDate, fields[key]) }));
  return { ...fields, pid: p.id, crn: p.crn, name: p.name, city: p.city, kwp: p.kwp, phone: p.phone, address: p.address,
    installDate, commissioningDate, team: p.team, technician: p.technician, registered: task('closure', 'warranty')?.status === 'done',
    issues: p.warrantyIssues || [], warrantyHistory: p.warrantyHistory || [], moduleSerials: p.serials?.modules || [], inverterSerial: p.serials?.inverter || '', terms, savedAt: saved.savedAt || null };
}
export function cleanWarranty(input) {
  const out = {};
  for (const key of WARRANTY_FIELDS) {
    const value = String(input[key] ?? '').trim();
    if (key.endsWith('Years') || ['moduleWp', 'inverterCapacity'].includes(key)) {
      if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (key.endsWith('Years') && (!Number.isInteger(Number(value)) || Number(value) > 100)))) throw new Error('Enter valid equipment ratings and warranty years');
      out[key] = value === '' ? '' : Number(value);
    } else {
      if (key.endsWith('Date') && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error('Enter valid warranty dates');
      if (key === 'certificateUrl' && value && !/^https?:\/\//i.test(value)) throw new Error('Use an http or https certificate link');
      out[key] = value.slice(0, 5000);
    }
  }
  return out;
}
