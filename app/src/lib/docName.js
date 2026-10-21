// Every downloaded document is named the same way: the document first, the customer's name last,
// e.g. "Quotation_Ramesh_Kantilal_Patel.pdf". One place, so all generators stay consistent.
const clean = (s) => String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export const docBaseName = (doc, customer) => `${clean(doc)}_${clean(customer) || 'Customer'}`;
export const docFileName = (doc, customer) => `${docBaseName(doc, customer)}.pdf`;
