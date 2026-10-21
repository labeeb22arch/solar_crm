// Single source of truth for the role matrix: who sees which page and who can do what.
// Pure data — used by the data layer (api.js) for enforcement and by the UI for menus and guards.

export const ROLES = ['Admin', 'Office Staff', 'Finance', 'CPO', 'CP', 'Dealer', 'Technician', 'Installation Team', 'Stamp Staff'];
export const PARTNER_ROLES = ['CPO', 'CP', 'Dealer'];
export const FIELD_ROLES = ['Technician', 'Installation Team'];

export const ROLE_INFO = {
  Admin: { label: 'Admin', long: 'Admin', home: '/today', sees: 'Every customer in all branches', does: 'Everything, including users and export' },
  'Office Staff': { label: 'Office Staff', long: 'Office staff', home: '/today', sees: 'Customers of their branch (some desks may switch branch)', does: 'Day-to-day operations; no user management or export' },
  Finance: { label: 'Finance', long: 'Finance (read-only)', home: '/overview', sees: 'Every customer in all branches', does: 'Read-only: can look at everything and export, cannot change anything' },
  CPO: { label: 'CPO', long: 'Channel Partner Office', home: '/partner', sees: 'Customers of all channel partners and dealers under this office, and their commissions', does: 'Add leads, follow up, view documents; no payment changes' },
  CP: { label: 'CP', long: 'Channel Partner', home: '/partner', sees: 'Own customers plus customers of their dealers, own commission', does: 'Add leads, link documents, follow up' },
  Dealer: { label: 'Dealer', long: 'Dealer', home: '/partner', sees: 'Only their own customers and own commission', does: 'Add leads, follow up' },
  Technician: { label: 'Technician', long: 'Technician', home: '/field', sees: 'Only jobs assigned to them', does: 'Scan serials, checklist, photos, mark installed, report an issue' },
  'Installation Team': { label: 'Installation Team', long: 'Installation team', home: '/field', sees: "Only their crew's jobs", does: 'Same as technician, plus truck tally checklist' },
  'Stamp Staff': { label: 'Stamp Staff', long: 'Stamp staff', home: '/stamp', sees: 'Only the agreement and stamp-paper queue', does: 'Mark agreements signed and stamp paper ready' },
};

// Capabilities
const CAPS = {
  Admin: ['*'],
  'Office Staff': ['edit', 'note', 'add_lead', 'link_docs', 'field', 'tally', 'stamp', 'money_edit', 'quote', 'internal_money'],
  Finance: ['export', 'internal_money', 'readonly'],
  CPO: ['note', 'add_lead', 'view_docs', 'own_commission'],
  CP: ['note', 'add_lead', 'link_docs', 'view_docs', 'own_commission'],
  Dealer: ['note', 'add_lead', 'own_commission'],
  Technician: ['field', 'report_issue'],
  'Installation Team': ['field', 'report_issue', 'tally'],
  'Stamp Staff': ['stamp'],
};
export function can(role, cap) {
  const c = CAPS[role] || [];
  if (c.includes('*')) return cap !== 'readonly' && cap !== 'own_commission';
  return c.includes(cap);
}
export const isReadOnly = (role) => can(role, 'readonly');

const OFFICE = ['Admin', 'Office Staff', 'Finance'];
const ALL = ROLES;

// Pages. Every route is wrapped in a guard that uses this table.
export const PAGES = {
  finance: { label: 'Finance', roles: OFFICE },
  operations: { label: 'Operations', roles: OFFICE },
  subsidy_tracking: { label: 'Subsidy tracking', roles: OFFICE },
  loan_tracking: { label: 'Loan tracking', roles: OFFICE },
  today: { label: 'Today', roles: OFFICE },
  overview: { label: 'Overview', roles: ['Admin', 'Office Staff', 'Finance', 'CPO'] },
  projects: { label: 'Customers list', roles: OFFICE },
  record: { label: 'Customer record', roles: ALL },
  partner: { label: 'Partner home', roles: ['CPO', 'CP', 'Dealer'] },
  add_lead: { label: 'Add lead', roles: ['Admin', 'Office Staff', 'CPO', 'CP', 'Dealer'] },
  my_commission: { label: 'My commission', roles: ['CPO', 'CP', 'Dealer'] },
  stamp: { label: 'Stamp queue', roles: ['Admin', 'Office Staff', 'Stamp Staff'] },
  field: { label: 'Field jobs', roles: ['Admin', 'Office Staff', 'Technician', 'Installation Team'] },
  installs: { label: 'Installation schedule', roles: ['Admin', 'Office Staff', 'Finance', 'Technician', 'Installation Team'] },
  name_check: { label: 'Name check', roles: OFFICE },
  documents: { label: 'Documents', roles: OFFICE },
  quotes: { label: 'Quotation maker', roles: OFFICE },
  proposal: { label: 'Residential proposal', roles: OFFICE },
  // proposal_settings: { label: 'Proposal settings', roles: ['Admin'] },
  feasibility: { label: 'Feasibility report', roles: ['Admin', 'Office Staff', 'Finance', 'Technician'] },
  inventory: { label: 'Inventory', roles: OFFICE },
  bom: { label: 'BOM maker', roles: OFFICE },
  challan: { label: 'Delivery challans', roles: OFFICE },
  tally: { label: 'Truck tally checklist', roles: [...OFFICE, 'Installation Team'] },
  discom_docs: { label: 'DISCOM documents', roles: OFFICE },
  // invoices: { label: 'Bills & invoices', roles: OFFICE },
  cp_comm: { label: 'Partner commission', roles: OFFICE },
  inst_comm: { label: 'Installation commission', roles: OFFICE },
  warranty: { label: 'Warranty', roles: OFFICE },
  attendance: { label: 'Attendance', roles: ['Admin', 'Office Staff'] },
  users: { label: 'Users & roles', roles: ['Admin'] },
  // company: { label: 'Company sign & stamp', roles: ['Admin'] },
  activity: { label: 'Activity log', roles: OFFICE },
  chat: { label: 'Team chat', roles: ['Admin', 'Office Staff'] },
  more: { label: 'All pages', roles: ALL },
};
export const pageAllowed = (page, role) => !!PAGES[page] && PAGES[page].roles.includes(role);
export const homeFor = (role) => (ROLE_INFO[role] || ROLE_INFO.Admin).home;
