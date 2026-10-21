import {
  IconTrash,IconClipboardList, IconTruckDelivery, IconReceipt, IconTool,
  IconHome, IconLayoutDashboard, IconTable, IconId, IconFileInvoice, IconSolarPanel2, IconScan, IconCalendarEvent, IconPackages, IconBolt,
  IconCurrencyRupee, IconShieldCheck, IconUsers, IconActivity, IconMessages, IconFiles, IconStack2, IconCoin, IconTruck,
} from '@tabler/icons-react';
import { pageAllowed } from './access.js';

// Main menu. Project Management expands its shared stage definitions. `page` refers to PAGES in access.js.
// `section` groups the side menu (shown with a header for office roles); `tone` colours the icon chip;
// `match` lists extra paths that light up the item; `soon` shows the item greyed with a "Soon" badge (not clickable).
export const NAV_SECTIONS = [
  { key: 'main', label: null },
  { key: 'ops', label: 'Operations' },
  { key: 'money', label: 'Finance' },
  { key: 'team', label: 'Team' },
  { key: 'archive', label: null },
];
export const MODULES = [
  { key: 'today', section: 'main', tone: 'orange', page: 'today', label: 'Today', to: '/today', icon: IconHome, chord: 't', desc: 'What is happening at Sunpay today, and your tasks' },
  { key: 'partner', section: 'main', tone: 'orange', page: 'partner', label: 'My home', to: '/partner', icon: IconHome, chord: 'h', desc: 'Your customers, what needs your action, your commission' },
  // My jobs is the crews' own home screen; office roles reach a job from the customer record instead.
  { key: 'field', section: 'main', tone: 'orange', page: 'field', label: 'My jobs', to: '/field', icon: IconScan, chord: 'f', desc: 'Installation jobs, checklist and serial scanning', only: ['Technician', 'Installation Team'] },
  { key: 'stamp', section: 'main', tone: 'violet', page: 'stamp', label: 'Signatures', to: '/stamp', icon: IconStack2, chord: 'q', only: ['Stamp Staff'], desc: 'Customer agreements awaiting signature' },
  { key: 'overview', section: 'main', tone: 'blue', page: 'overview', label: 'Overview', to: '/overview', icon: IconLayoutDashboard, chord: 'o', desc: 'Big picture: progress of all customers' },
  { key: 'projects', section: 'main', tone: 'violet', page: 'projects', label: 'Customers', to: '/projects', icon: IconUsers, chord: 'c', desc: 'Customer status and the next action', match: ['/p'] },
  // Quotation, Feasibility, Name check and DISCOM submission are documents: they open from Documents.
  { key:'project_management',section:'main',tone:'blue',page:'project_management',label:'Project Management',to:'/project-management',icon:IconTable,desc:'Follow every project from enquiry to handover'},
  { key: 'documents', section: 'main', tone: 'blue', page: 'documents', label: 'Documents', to: '/documents', icon: IconFiles, chord: 'z', desc: 'Every document for a customer in one place', match: ['/quotes', '/feasibility', '/grid', '/proposal'] },
  { key: 'my_commission', section: 'main', tone: 'green', page: 'my_commission', label: 'My commission', to: '/my-commission', icon: IconCoin, chord: 'm', desc: 'Commission earned, pending and paid' },
  { key: 'tally', section: 'main', tone: 'sun', page: 'tally', label: 'Truck tally', to: '/supply/tally', icon: IconTruck, chord: 'y', desc: 'Load check before the truck leaves', only: ['Installation Team'] },
  // Operations: installation schedule and stock.
  { key: 'installs', section: 'ops', tone: 'orange', page: 'installs', label: 'Materials & Delivery', pages: ['installs', 'inventory', 'bom', 'challan'], match: ['/supply/inventory', '/supply/bom', '/supply/challan'], to: '/installs', icon: IconCalendarEvent, chord: 'i', desc: 'Installation visits by day' },
  { key: 'inventory', workspaceOnly: true, section: 'ops', tone: 'sun', page: 'inventory', label: 'Inventory', to: '/supply/inventory', icon: IconPackages, chord: 's', desc: 'Stock in the warehouse and what is reserved' },
  { key: 'bom', workspaceOnly: true, section: 'ops', tone: 'violet', page: 'bom', label: 'Procurement', to: '/supply/bom', icon: IconClipboardList, chord: 'r', desc: 'Bill of materials and what to order for each job' },
  { key: 'dispatch', workspaceOnly: true, section: 'ops', tone: 'blue', page: 'challan', label: 'Dispatch', to: '/supply/challan', icon: IconTruckDelivery, chord: 'd', desc: 'Delivery challans and truck tally', match: ['/supply/tally'], except: ['Installation Team'] },
  { key: 'warranty', section: 'ops', tone: 'green', page: 'warranty', label: 'Completed', to: '/completed', match: ['/warranty'], icon: IconShieldCheck, chord: 'w', desc: 'Warranty dates and registration' },
  // { key: 'vendors', section: 'ops', tone: 'slate', page: 'inventory', label: 'Vendors', to: null, icon: IconBuildingFactory2, soon: true, desc: 'Vendor list and purchase orders (coming soon)' },
  { key: 'finance', section: 'money', tone: 'green', page: 'finance', label: 'Finance overview', to: '/finance', icon: IconCurrencyRupee, desc: 'Receipts, expected payments, loans and subsidy' },
  { key: 'payments_received', section: 'money', tone: 'green', page: 'finance', label: 'Payments received', to: '/finance/received', icon: IconReceipt },
  { key: 'payments_expected', section: 'money', tone: 'sun', page: 'finance', label: 'Expected payments', to: '/finance/expected', icon: IconCalendarEvent },
  { key: 'operations', section: 'ops', tone: 'blue', page: 'operations', label: 'Operations', to: '/operations', icon: IconPackages, desc: 'Equipment brands, models and registrations' },
  { key: 'name_check', section: 'ops', tone: 'blue', page: 'name_check', label: 'Name check', to: '/name-check', icon: IconId, desc: 'Electricity bill and bank name verification' },
  { key: 'subsidy_tracking', section: 'money', tone: 'green', page: 'subsidy_tracking', label: 'Subsidy tracking', to: '/money/subsidy', icon: IconCoin, trackingKind: 'subsidy' },
  { key: 'loan_tracking', section: 'money', tone: 'blue', page: 'loan_tracking', label: 'Loan tracking', to: '/money/loans', icon: IconCurrencyRupee, trackingKind: 'loan' },
  // Money (vendor commission stays removed).
  // { key: 'money', section: 'money', tone: 'green', page: 'invoices', label: 'Bills & invoices', to: '/money/invoices', icon: IconReceipt, chord: 'p', desc: 'Invoices for every customer' },
  { key: 'cp_comm', section: 'money', tone: 'sun', page: 'cp_comm', label: 'Partner commission', to: '/money/cp', icon: IconCoin, chord: 'k', desc: 'Commission for channel partners and dealers' },
  { key: 'inst_comm', section: 'money', tone: 'orange', page: 'inst_comm', label: 'Installation commission', to: '/money/install', icon: IconTool, chord: 'l', desc: 'Commission for installation teams' },
  {key:'trash',section:'archive',tone:'slate',page:'trash',label:'Trash',to:'/trash',icon:IconTrash,desc:'Recover removed customers'},
  // Team.
  { key: 'team', section: 'team', tone: 'blue', page: 'attendance', label: 'Team', to: '/team/attendance', icon: IconUsers, chord: 'u', desc: 'Attendance, users and roles', match: ['/team'] },
  { key: 'chat', section: 'team', tone: 'rose', page: 'chat', label: 'Team chat', to: '/chat', icon: IconMessages, chord: 'b', desc: 'Shared chat for Admin and Office staff' },
  { key: 'activity', section: 'team', tone: 'slate', page: 'activity', label: 'Activity log', to: '/activity', icon: IconActivity, chord: 'a', desc: 'Everything that changed, newest first' },
];

export const SUBPAGES = [
  { page: 'inventory', label: 'Inventory', to: '/supply/inventory', parent: 'supply' },
  { page: 'bom', label: 'BOM maker', to: '/supply/bom', parent: 'supply' },
  { page: 'challan', label: 'Delivery challans', to: '/supply/challan', parent: 'supply' },
  { page: 'tally', label: 'Truck tally checklist', to: '/supply/tally', parent: 'supply' },
  { page: 'discom_docs', label: 'DISCOM submission documents', to: '/grid/docs', parent: 'grid' },
  // { page: 'invoices', label: 'Bills & invoices', to: '/money/invoices', parent: 'money' },
  { page: 'cp_comm', label: 'Partner commission', to: '/money/cp', parent: 'money' },
  { page: 'inst_comm', label: 'Installation commission', to: '/money/install', parent: 'money' },
  { page: 'attendance', label: 'Attendance', to: '/team/attendance', parent: 'team' },
  { page: 'users', label: 'Users & roles', to: '/team/users', parent: 'team' },
  // { page: 'company', label: 'Company sign & stamp', to: '/team/company', parent: 'team' },
  // { page: 'proposal_settings', label: 'Proposal settings', to: '/team/proposal-settings', parent: 'team' },
];

export const modulesFor = (role, { withSoon = false } = {}) => MODULES.filter((m) => !m.workspaceOnly && (m.pages ? m.pages.some((p) => pageAllowed(p, role)) : pageAllowed(m.page, role)) && (!m.only || m.only.includes(role)) && !(m.except || []).includes(role) && (withSoon || !m.soon));
/** Is this menu item the current page? Exact address, a sub-address, or one of its `match` prefixes. */
export const isModuleActive = (m, path) => m.key==='finance' ? path==='/finance' : !!m.to && [m.to, ...(m.match || [])].some((t) => path === t || path.startsWith(t + '/'));
export const subpagesFor = (role, parent) => SUBPAGES.filter((s) => s.parent === parent && pageAllowed(s.page, role));
