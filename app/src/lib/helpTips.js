// One short "how this works" tip per office screen, plus the first-login tour (intuitiveness audit 2026-11-08).
// Pure data so it can be tested; storage helpers never throw.

export const TIPS = [
  { id: 'today', path: /^\/today$/, title: 'Your work list', text: 'Customers who need you today are listed first. Open one to see its next step and do the work there.' },
  { id: 'customers', path: /^\/projects$/, title: 'Find any customer', text: 'Type a name, phone or CRN in the search box, or tap a stage to filter. Completed and Trash are tabs on this page.' },
  { id: 'record', path: /^\/p\//, title: 'Everything about one customer', text: 'The orange box shows the current step and what to do next. Use the tabs for money, documents and history. Call or WhatsApp from the top.' },
  { id: 'overview', path: /^\/overview$/, title: 'The big picture', text: 'Each row is a stage of the project. Tap a stage to see its customers. Red numbers need attention.' },
  { id: 'documents', path: /^\/documents$/, title: 'Documents', text: 'Pick a customer to prepare a quotation, feasibility report or DISCOM file. Name check is the next tab.' },
  { id: 'finance', path: /^\/(finance|money)/, title: 'Money', text: 'Payments, loans, subsidy and commissions are tabs at the top. To add a payment, open the customer and use the Finance tab.' },
  { id: 'materials', path: /^\/(installs|supply)/, title: 'Materials & delivery', text: 'Plan installations, check stock, prepare materials and send delivery batches using the tabs at the top.' },
  { id: 'team', path: /^\/(team|chat|activity)/, title: 'Team', text: 'Attendance, users, team chat and the activity log are tabs at the top.' },
];

export const TOUR = [
  { title: 'Welcome to Solar CRM', text: 'A 30-second tour of where things are. You can skip it and open it again from your name menu.' },
  { title: 'Search finds anyone', text: 'The search box at the top finds a customer by name, phone number or CRN from any screen.' },
  { title: 'Today is your work list', text: 'Every morning, start on Today. It lists who is late, who is waiting and today’s installations.' },
  { title: 'One page per customer', text: 'Open a customer to call, WhatsApp, prepare a quotation, add a payment or move them to the next stage.' },
  { title: 'The menu', text: 'Overview shows the whole pipeline. Documents, Materials, Finance and Team hold the office work. Each has tabs at the top.' },
];

export const tipFor = (path) => TIPS.find((t) => t.path.test(path)) || null;

const TIP_KEY = 'solarcrm.tips.hidden';
const TOUR_KEY = 'solarcrm.tour.done';
const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const hiddenTips = () => read(TIP_KEY, []);
export const hideTip = (id) => write(TIP_KEY, [...new Set([...hiddenTips(), id])]);
export const tourDone = () => read(TOUR_KEY, false) === true;
export const finishTour = () => write(TOUR_KEY, true);
/** "Show tips again" in the name menu. */
export const resetHelp = () => { write(TIP_KEY, []); write(TOUR_KEY, false); window.dispatchEvent(new Event('solarcrm-help-reset')); };
