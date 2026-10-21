export function filterPayments(rows,{query='',customer='',from='',to='',mode=''}={}) {
 const q=query.trim().toLowerCase();
 return rows.filter(r=>(!customer||r.pid===customer)&&(!from||r.day>=from)&&(!to||r.day<=to)&&(!mode||r.mode===mode)&&(!q||[r.name,r.crn,r.ref,r.note,r.recordedBy,r.mode,r.amount].join(' ').toLowerCase().includes(q)));
}
