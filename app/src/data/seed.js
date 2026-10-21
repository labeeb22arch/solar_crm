// Deterministic fake data generator. Only api.js imports this file.
// "Today" is the real date in India (Asia/Kolkata), taken when the app opens. Demo data is generated relative to it.
export const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const T0 = new Date(TODAY + 'T10:00:00').getTime();
const DAY = 86400000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261018);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const int = (a, b) => a + Math.floor(R() * (b - a + 1));
const chance = (p) => R() < p;
export const iso = (ms) => new Date(ms).toISOString();
const daysAgo = (d, h = 10) => T0 - d * DAY + (h - 10) * 3600000;

export const STATUSES = ['not_started', 'in_progress', 'waiting_customer', 'waiting_third', 'blocked', 'done'];

export const TRACKS = [
  { key: 'sales', label: 'Booking & agreement', short: 'Booking' },
  { key: 'finance', label: 'Payments & loan', short: 'Payments' },
  { key: 'supply', label: 'Material & installation', short: 'Installation' },
  { key: 'grid', label: 'Electricity board (DISCOM)', short: 'DISCOM' },
  { key: 'closure', label: 'Handover & commission', short: 'Handover' },
];

const ITEM_LABELS = {
  enquiry: 'Enquiry logged', survey: 'Site survey', feasibility: 'Feasibility report', quotation: 'Quotation approval (WhatsApp)',
  proposal: 'Commercial proposal', agreement: 'Agreement signed by link', stamp: 'Stamp paper',
  method: 'Payment method confirmed', loan_docs: 'Loan documents', sanction: 'Bank sanction', loan_agreement: 'Loan agreement signed',
  disbursement: 'Loan disbursement', advance: 'Advance received', balance: 'Balance collected', subsidy: 'Govt. subsidy',
  bom: 'BOM prepared', reservation: 'Inventory reserved', challan: 'Delivery challan', tally: 'Truck tally checklist',
  team: 'Installation team assigned', installation: 'Installation', serials: 'Module & inverter serials',
  discom_docs: 'DISCOM documents', name_check: 'DISCOM vs bank name check', submission: 'DISCOM submission', inspection: 'DISCOM inspection',
  net_meter: 'Net-meter installation', commissioning: 'Commissioning',
  payout: 'Final payout / clearance', invoice: 'Bill / invoice', cp_comm: 'Channel partner commission', dealer_comm: 'Dealer commission', inst_comm: 'Installation commission',
  vendor_comm: 'Vendor commission', warranty: 'Warranty started',
};
export { ITEM_LABELS };

const FIRST = ['Ramesh', 'Mahesh', 'Kiran', 'Jignesh', 'Hetal', 'Bhavesh', 'Nirav', 'Dipika', 'Paresh', 'Alpesh', 'Komal', 'Hiren', 'Sejal', 'Ketan', 'Mitesh', 'Pooja', 'Rajesh', 'Nikita', 'Chirag', 'Falguni', 'Tushar', 'Varsha', 'Sanjay', 'Jayesh', 'Rina', 'Dhaval', 'Bhavna', 'Pratik', 'Manisha', 'Vipul', 'Hemant', 'Kinjal', 'Yogesh', 'Sneha', 'Ashok', 'Daksha'];
const FATHER = ['Kantilal', 'Babubhai', 'Natvarlal', 'Ramanlal', 'Chandulal', 'Dahyabhai', 'Manubhai', 'Jayantilal', 'Ishwarbhai', 'Shantilal', 'Govindbhai', 'Vallabhbhai'];
const LAST = ['Patel', 'Shah', 'Desai', 'Mehta', 'Joshi', 'Trivedi', 'Parmar', 'Solanki', 'Chauhan', 'Rathod', 'Panchal', 'Vyas', 'Bhatt', 'Modi', 'Thakkar', 'Prajapati', 'Gohil', 'Dave'];
const FACTORIES = ['Banas Agro Processors Pvt Ltd', 'Deesa Potato Cold Chain', 'Shree Ambaji Castings', 'Palanpur Marble Works', 'Mehsana Dairy Packaging', 'Sabar Polymers Pvt Ltd', 'Krishna Edible Oils', 'Unity Cotton Ginning', 'Gayatri Pipes & Fittings', 'Vraj Textiles Industries'];
const COMPANIES = ['Shreeji Textiles Pvt Ltd', 'Navkar Plastics', 'Om Sai Cold Storage', 'Kesar Dairy Co-op', 'Umiya Ceramics', 'Ambica Agro Foods', 'Riddhi Packaging LLP', 'Mahalaxmi Polymers', 'Sahjanand Engineering', 'Gokul Rice Mill', 'Jalaram Steel Works', 'Vrundavan School Trust'];

// Company settings (single source for document headers and the sign-in footer). Confirmed public business details.
export const COMPANY = { name: 'Sunpay Renewable Energy LLP', tagline: 'Solar EPC company · Residential, Commercial, Industrial', address: 'Deesa Bus Station, Jalaram Mandir, Gulbani Nagar, Deesa, Gujarat 385535', web: 'www.sunpays.in', phone: '+91 63559 59622', email: 'urvesh@sunpays.in', gstin: '24XXXXX0000X1ZX (demo)' };
export const BRANCHES = ['Main Office', 'North Division', 'South Division'];
// Sunpay is based in Deesa (Banaskantha). Main Office = Deesa; customers weighted towards North Gujarat.
const CITY_BRANCH = {
  Deesa: 'Main Office', Palanpur: 'Main Office', Dhanera: 'Main Office', Tharad: 'Main Office', Bhabhar: 'Main Office', Kankrej: 'Main Office',
  Patan: 'North Division', Siddhpur: 'North Division', Mehsana: 'North Division', Unjha: 'North Division', Himmatnagar: 'North Division',
  Ahmedabad: 'South Division', Gandhinagar: 'South Division', Vadodara: 'South Division', Anand: 'South Division', Surat: 'South Division',
};
const CITY_DISCOM = {
  Deesa: 'UGVCL', Palanpur: 'UGVCL', Dhanera: 'UGVCL', Tharad: 'UGVCL', Bhabhar: 'UGVCL', Kankrej: 'UGVCL', Patan: 'UGVCL', Siddhpur: 'UGVCL', Mehsana: 'UGVCL', Unjha: 'UGVCL', Himmatnagar: 'UGVCL',
  Ahmedabad: 'Torrent Power', Gandhinagar: 'UGVCL', Vadodara: 'MGVCL', Anand: 'MGVCL', Surat: 'DGVCL',
};
export { CITY_BRANCH, CITY_DISCOM };
const CITIES = Object.keys(CITY_BRANCH);
export const DISCOMS = ['UGVCL', 'MGVCL', 'DGVCL', 'PGVCL', 'Torrent Power'];
export const BANKS = ['SBI', 'Bank of Baroda', 'HDFC Bank', 'ICICI Bank', 'Union Bank', 'Axis Bank', 'Kotak Mahindra'];
export const PAY_METHODS = ['Online Transfer', 'Cash', 'Cheque', 'Bank Solar Loan', 'Personal Loan'];

// Partner hierarchy: Channel Partner Office (CPO) -> Channel Partner (CP) -> Dealer
export const CPOS = [
  { id: 'CPO-1', name: 'Suryakiran Partner Office', office: 'Deesa · Highway' },
  { id: 'CPO-2', name: 'Banas Solar Network', office: 'Palanpur · Abu Rd' },
  { id: 'CPO-3', name: 'Uttar Gujarat Partner Hub', office: 'Mehsana · Highway' },
];
export const CHANNEL_PARTNERS = [
  { id: 'CP-01', cpoId: 'CPO-1', name: 'Ujala Energy Point', office: 'Surat · Varachha', rate: 3.0 },
  { id: 'CP-02', cpoId: 'CPO-1', name: 'GreenRoof Partners', office: 'Dhanera · Station Rd', rate: 2.5 },
  { id: 'CP-03', cpoId: 'CPO-1', name: 'Tejas Renewables', office: 'Tharad · Market Yard', rate: 2.5 },
  { id: 'CP-04', cpoId: 'CPO-2', name: 'Prakash Power Solutions', office: 'Palanpur · Delhi Gate', rate: 3.0 },
  { id: 'CP-05', cpoId: 'CPO-2', name: 'Suryoday Solar Services', office: 'Himmatnagar · Motipura', rate: 2.0 },
  { id: 'CP-06', cpoId: 'CPO-2', name: 'Kiran Rooftop Co', office: 'Ahmedabad · Naroda', rate: 2.5 },
  { id: 'CP-07', cpoId: 'CPO-3', name: 'Arka Energy Associates', office: 'Mehsana · Modhera Rd', rate: 3.0 },
  { id: 'CP-08', cpoId: 'CPO-3', name: 'Navdeep Solar Point', office: 'Patan · Rani ki Vav Rd', rate: 2.0 },
];
export const DEALERS = [
  { id: 'DL-01', cpId: 'CP-01', name: 'Shiv Electricals', town: 'Surat', rate: 1.0 },
  { id: 'DL-02', cpId: 'CP-01', name: 'Om Traders', town: 'Surat', rate: 1.0 },
  { id: 'DL-03', cpId: 'CP-02', name: 'Jay Ambe Electric', town: 'Dhanera', rate: 1.2 },
  { id: 'DL-04', cpId: 'CP-03', name: 'Maruti Solar Shop', town: 'Tharad', rate: 1.0 },
  { id: 'DL-05', cpId: 'CP-04', name: 'Khodiyar Enterprise', town: 'Palanpur', rate: 1.5 },
  { id: 'DL-06', cpId: 'CP-04', name: 'Ganesh Power House', town: 'Palanpur', rate: 1.0 },
  { id: 'DL-07', cpId: 'CP-05', name: 'Balaji Electricals', town: 'Himmatnagar', rate: 1.0 },
  { id: 'DL-08', cpId: 'CP-06', name: 'Sai Krupa Agency', town: 'Palanpur', rate: 1.2 },
  { id: 'DL-09', cpId: 'CP-07', name: 'Hari Om Solar', town: 'Mehsana', rate: 1.5 },
  { id: 'DL-10', cpId: 'CP-07', name: 'Ma Umiya Electric', town: 'Mehsana', rate: 1.0 },
  { id: 'DL-11', cpId: 'CP-08', name: 'Radhe Krishna Energy', town: 'Patan', rate: 1.0 },
  { id: 'DL-12', cpId: 'CP-08', name: 'Vishwas Electricals', town: 'Palanpur', rate: 1.2 },
];
export const TEAMS = [
  { id: 'T-A', name: 'Crew Alpha', kind: 'in-house', lead: 'Hardik Parmar', rate: 1800 },
  { id: 'T-B', name: 'Crew Beta', kind: 'in-house', lead: 'Sagar Rathod', rate: 1800 },
  { id: 'T-R', name: 'Rudra Installers', kind: 'third-party', lead: 'Vijay Gohil', rate: 2200 },
  { id: 'T-M', name: 'BrightMount Services', kind: 'third-party', lead: 'Imran Shaikh', rate: 2300 },
];
export const TECHNICIANS = ['Nayan Solanki', 'Ravi Chauhan', 'Akash Prajapati', 'Deep Vyas', 'Mehul Panchal', 'Jay Thakkar'];
export const VENDORS = [
  { id: 'V-01', name: 'Helios Modules India', supplies: 'PV modules', rate: 1.2 },
  { id: 'V-02', name: 'Invicta Inverters', supplies: 'Inverters', rate: 1.5 },
  { id: 'V-03', name: 'SteelSpan Structures', supplies: 'Mounting structures', rate: 1.0 },
  { id: 'V-04', name: 'Kabel Wires & Cables', supplies: 'DC/AC cables, BOS', rate: 0.8 },
];
// Office staff desks: `branches[0]` is home branch; more than one = allowed to switch.
export const OFFICE_USERS = [
  { id: 'OS-MAIN', name: 'Office desk · Main Office', branches: ['Main Office'] },
  { id: 'OS-NORTH', name: 'Office desk · North Division', branches: ['North Division'] },
  { id: 'OS-SOUTH', name: 'Office desk · South (covers Main)', branches: ['South Division', 'Main Office'] },
];
export const STAFF = [
  { id: 'U-01', name: 'Admin (demo)', role: 'Admin', branch: 'All', active: true },
  ...OFFICE_USERS.map((o, i) => ({ id: 'U-0' + (2 + i), name: o.name, role: 'Office Staff', branch: o.branches.join(' + '), active: true })),
  { id: 'U-05', name: 'Finance desk', role: 'Finance', branch: 'All', active: true },
  { id: 'U-06', name: 'Stamp desk', role: 'Stamp Staff', branch: 'Main Office', active: true },
  ...TECHNICIANS.map((n, i) => ({ id: 'U-1' + i, name: n, role: 'Technician', branch: BRANCHES[i % 3], active: i !== 5 })),
  ...TEAMS.map((t, i) => ({ id: 'U-2' + i, name: t.lead + ' (' + t.name + ')', role: 'Installation Team', branch: BRANCHES[i % 3], active: true })),
  ...CPOS.map((c, i) => ({ id: 'U-3' + i, name: c.name, role: 'CPO', branch: c.office, active: true })),
  ...CHANNEL_PARTNERS.map((c, i) => ({ id: 'U-4' + i, name: c.name, role: 'CP', branch: c.office, active: true })),
  ...DEALERS.map((d, i) => ({ id: 'U-5' + String(i).padStart(2, '0'), name: d.name, role: 'Dealer', branch: d.town, active: true })),
];
export const INVENTORY = [
  { sku: 'MOD-540-MONO', name: 'Mono PERC module 540 Wp', unit: 'pcs', stock: 612, reserved: 384, reorder: 200, vendor: 'V-01' },
  { sku: 'MOD-550-TOPC', name: 'TOPCon bifacial module 550 Wp', unit: 'pcs', stock: 248, reserved: 176, reorder: 150, vendor: 'V-01' },
  { sku: 'INV-3K-1PH', name: 'On-grid inverter 3 kW 1-ph', unit: 'pcs', stock: 22, reserved: 14, reorder: 10, vendor: 'V-02' },
  { sku: 'INV-5K-1PH', name: 'On-grid inverter 5 kW 1-ph', unit: 'pcs', stock: 18, reserved: 15, reorder: 10, vendor: 'V-02' },
  { sku: 'INV-10K-3PH', name: 'On-grid inverter 10 kW 3-ph', unit: 'pcs', stock: 6, reserved: 5, reorder: 6, vendor: 'V-02' },
  { sku: 'INV-50K-3PH', name: 'String inverter 50 kW 3-ph', unit: 'pcs', stock: 3, reserved: 2, reorder: 2, vendor: 'V-02' },
  { sku: 'STR-GI-KIT', name: 'GI mounting structure kit (per kWp)', unit: 'kit', stock: 340, reserved: 210, reorder: 120, vendor: 'V-03' },
  { sku: 'CBL-DC-4', name: 'DC cable 4 sq mm', unit: 'm', stock: 8200, reserved: 4100, reorder: 3000, vendor: 'V-04' },
  { sku: 'CBL-AC-6', name: 'AC cable 6 sq mm', unit: 'm', stock: 2900, reserved: 2300, reorder: 1500, vendor: 'V-04' },
  { sku: 'ACDB-1PH', name: 'ACDB single phase', unit: 'pcs', stock: 41, reserved: 29, reorder: 20, vendor: 'V-04' },
  { sku: 'DCDB-2S', name: 'DCDB 2 string', unit: 'pcs', stock: 37, reserved: 30, reorder: 20, vendor: 'V-04' },
  { sku: 'EARTH-KIT', name: 'Earthing kit + LA', unit: 'set', stock: 55, reserved: 33, reorder: 25, vendor: 'V-04' },
  { sku: 'MC4-PAIR', name: 'MC4 connector pair', unit: 'pair', stock: 1200, reserved: 640, reorder: 400, vendor: 'V-04' },
  { sku: 'NETM-BI', name: 'Bi-directional net meter (DISCOM)', unit: 'pcs', stock: 0, reserved: 0, reorder: 0, vendor: '—' },
];

const SOCIETIES = ['Shanti Nagar Society', 'Gokul Park', 'Sardar Patel Colony', 'Shreeji Residency', 'Ambika Township', 'Sahjanand Bungalows', 'Krishna Kunj', 'Parshwanath Nagar', 'Riddhi Siddhi Flats', 'Swaminarayan Park', 'GIDC Estate, Plot', 'Navrangpura Lane'];
export const SLOTS = ['Aadhaar card', 'PAN card', 'Electricity bill', 'Bank passbook / cheque', 'Site survey photos', 'Feasibility report', 'Quotation', 'Agreement (signed)', 'Stamp paper', 'Loan sanction letter', 'DISCOM application form', 'Installation photos', 'Commissioning certificate', 'Invoice'];

function variantName(first, father, last) {
  const forms = [
    `${first}bhai ${father[0]} ${last}`,
    `${first} ${father} ${last}`,
    `${first} ${last}`,
    `${last} ${first} ${father}`,
    `${first.toUpperCase()} ${father[0]}. ${last.toUpperCase()}`,
  ];
  return forms;
}

export function itemsFor(p) {
  const loan = p.paymentMethod.includes('Loan');
  return {
    sales: ['enquiry', 'survey', 'feasibility', 'quotation', ...(p.type !== 'Residential' ? ['proposal'] : []), 'agreement', 'stamp'],
    finance: ['method', ...(loan ? ['loan_docs', 'sanction', 'loan_agreement', 'disbursement'] : []), 'advance', 'balance', ...(p.type === 'Residential' ? ['subsidy'] : [])],
    supply: ['bom', 'reservation', 'challan', 'tally', 'team', 'installation', 'serials'],
    grid: ['discom_docs', 'name_check', 'submission', 'inspection', 'net_meter', 'commissioning'],
    closure: ['payout', 'invoice', ...(p.cp ? ['cp_comm'] : []), ...(p.dealer ? ['dealer_comm'] : []), 'inst_comm', 'warranty'],
  };
}

const TRACK_WINDOW = { sales: [0, 28], finance: [6, 110], supply: [22, 62], grid: [30, 105], closure: [85, 150] };
const FRONTIER = ['in_progress', 'in_progress', 'waiting_customer', 'waiting_third', 'blocked'];

export function generate() {
  const projects = [];
  const N = 150;
  let installsToday = 0;
  for (let i = 1; i <= N; i++) {
    const segRoll = R();
    const industrial = segRoll < 0.08;
    const commercial = segRoll < 0.19; // true for Commercial AND Industrial (non-residential)
    const first = pick(FIRST), father = pick(FATHER), last = pick(LAST);
    const city = industrial ? pick(['Deesa', 'Palanpur', 'Mehsana', 'Himmatnagar']) : pick(CITIES);
    const ageDays = i <= 140 ? Math.round(Math.pow(R(), 1.25) * 200) + 1 : int(1, 6);
    const kwp = industrial ? pick([100, 150, 200, 250, 300, 400, 500, 750, 1000]) : commercial ? pick([25, 30, 40, 50, 60, 75, 100, 120, 150, 200]) : pick([3, 3, 3.3, 4, 5, 5, 5.5, 6, 7.5, 8, 10]);
    const rate = industrial ? int(33, 38) * 1000 : commercial ? int(38, 44) * 1000 : int(52, 60) * 1000;
    const value = Math.round(kwp * rate / 100) * 100;
    const pm = commercial ? pick(['Online Transfer', 'Online Transfer', 'Cheque', 'Bank Solar Loan']) : pick(['Online Transfer', 'Cash', 'Cheque', 'Bank Solar Loan', 'Bank Solar Loan', 'Personal Loan']);
    const viaPartner = chance(0.5);
    const dealerObj = viaPartner && chance(0.45) ? pick(DEALERS) : null;
    const cp = viaPartner ? (dealerObj ? dealerObj.cpId : pick(CHANNEL_PARTNERS).id) : null;
    const dealer = dealerObj ? dealerObj.id : null;
    const num = String(i).padStart(4, '0');
    const mismatch = !commercial && chance(0.11);
    const names = variantName(first, father, last);
    const fullName = industrial ? `${pick(FACTORIES)}, GIDC ${city}` : commercial ? pick(COMPANIES) : `${first} ${father} ${last}`;
    const p = {
      id: `PRJ-2026-${num}`, crn: `CRN-2026-${num}`,
      name: fullName, contact: commercial ? `${first} ${last}` : null,
      phone: '90000' + String(10000 + i * 37).slice(-5),
      city, branch: CITY_BRANCH[city], discom: CITY_DISCOM[city], type: industrial ? 'Industrial' : commercial ? 'Commercial' : 'Residential',
      kwp, value, paymentMethod: pm, bank: pick(BANKS), cp, dealer,
      address: `${int(1, 240)}, ${pick(SOCIETIES)}, ${city} ${380000 + int(1, 99) * 100 + int(1, 60)}`,
      consumerNo: String(10000000000 + ((i * 7919 + 13) * 104729) % 89999999999),
      team: pick(TEAMS).id, technician: pick(TECHNICIANS),
      createdAt: iso(daysAgo(ageDays)), ageDays,
      nameCheck: {
        discomName: commercial ? fullName.toUpperCase() : (mismatch ? names[0] : `${first} ${father} ${last}`),
        bankName: commercial ? fullName.toUpperCase().replace(' PVT LTD', ' PRIVATE LIMITED').replace(/, GIDC .*/, '') : (mismatch ? pick([names[1], names[3], names[1]]) : `${first} ${father} ${last}`),
        aadhaarName: commercial ? '—' : `${first} ${father} ${last}`,
        match: !mismatch, resolution: null,
      },
      quotation: null, agreement: null, loan: null, subsidy: [], payments: [], reminders: [], schedule: [],
      serials: { modules: [], inverter: '' }, installDate: null, timeline: [], drive: [], notes: [],
    };
    const defs = itemsFor(p);
    const tracks = {};
    for (const t of TRACKS) {
      const keys = defs[t.key];
      const [s, e] = TRACK_WINDOW[t.key];
      let frac = Math.max(0, Math.min(1, (ageDays - s) / (e - s)));
      const lag = chance(0.12);
      if (lag && (t.key === 'finance' || t.key === 'grid') && frac < 1) frac = Math.max(0, frac - 0.25);
      const doneN = Math.floor(frac * keys.length + 0.0001);
      tracks[t.key] = keys.map((k, idx) => {
        let status = 'not_started';
        let at = null;
        if (idx < doneN) { status = 'done'; at = daysAgo(Math.max(0, Math.round(ageDays - s - (idx + 1) * (e - s) / keys.length)) + int(0, 1)); }
        else if (idx === doneN && (frac > 0 || t.key === 'sales')) { status = pick(FRONTIER); at = daysAgo(int(0, Math.min(40, Math.max(1, ageDays - s)))); }
        return { key: k, label: ITEM_LABELS[k], status, updatedAt: at ? iso(Math.min(at, T0)) : null };
      });
    }
    p.tracks = tracks;
    const get = (tk, k) => tracks[tk].find((x) => x.key === k);

    // Keep the story believable: tracks progress independently above, so a later step can start while an
    // earlier prerequisite is still open (e.g. installing today while still waiting for the advance).
    // Close prerequisites a few days before the step that depends on them.
    const started = (it) => it && it.status !== 'not_started';
    const finish = (tk, keys, before) => {
      const ref = before?.updatedAt ? new Date(before.updatedAt).getTime() : T0;
      keys.forEach((k, n) => {
        const it = get(tk, k);
        if (!it || it.status === 'done') return;
        it.status = 'done';
        it.updatedAt = iso(Math.min(ref - (keys.length - n + 1) * DAY, T0));
      });
    };
    const untilKey = (tk, k) => defs[tk].slice(0, defs[tk].indexOf(k));
    const installItem = get('supply', 'installation');
    if (started(installItem)) {
      finish('sales', defs.sales, installItem);
      finish('finance', defs.finance.filter((k) => ['method', 'loan_docs', 'sanction', 'loan_agreement', 'advance'].includes(k)), installItem);
      finish('supply', untilKey('supply', 'installation'), installItem);
    } else if (defs.supply.slice(1).some((k) => started(get('supply', k)))) {
      finish('sales', defs.sales, get('supply', 'bom'));
    }
    const afterInstall = ['submission', 'inspection', 'net_meter', 'commissioning'].map((k) => get('grid', k)).find(started);
    if (afterInstall) {
      if (installItem.status !== 'done') { installItem.status = 'done'; installItem.updatedAt = iso(Math.min(new Date(afterInstall.updatedAt || T0).getTime() - 6 * DAY, T0)); }
      finish('sales', defs.sales, installItem);
      finish('finance', defs.finance.filter((k) => ['method', 'loan_docs', 'sanction', 'loan_agreement', 'advance'].includes(k)), installItem);
      finish('supply', untilKey('supply', 'installation'), installItem);
      finish('grid', untilKey('grid', afterInstall.key).filter((k) => k !== 'name_check'), afterInstall);
    }
    if (defs.closure.some((k) => started(get('closure', k)))) {
      const first = defs.closure.map((k) => get('closure', k)).find(started);
      finish('grid', defs.grid, first);
      finish('finance', defs.finance.filter((k) => k !== 'subsidy' && k !== 'balance'), first);
    }

    // Quotation
    const q = get('sales', 'quotation');
    if (q.status === 'done') p.quotation = { status: 'approved', sentAt: q.updatedAt, version: int(1, 2) };
    else if (q.status !== 'not_started') {
      const st = pick(['sent', 'sent', 'viewed', 'viewed', 'changes_requested']);
      q.status = st === 'changes_requested' ? 'in_progress' : 'waiting_customer';
      p.quotation = { status: st, sentAt: q.updatedAt, version: st === 'changes_requested' ? 1 : int(1, 2) };
    }
    const ag = get('sales', 'agreement');
    if (ag.status === 'done') p.agreement = { status: 'signed', at: ag.updatedAt };
    else if (ag.status !== 'not_started') { ag.status = 'waiting_customer'; p.agreement = { status: 'sent', at: ag.updatedAt }; }

    // Loan
    if (pm.includes('Loan')) {
      const la = get('finance', 'loan_agreement');
      p.loan = { bank: p.bank, amount: Math.round(value * 0.8 / 1000) * 1000, ref: 'LN' + int(100000, 999999) };
      if (la.status !== 'done' && la.status !== 'not_started') la.status = 'waiting_customer';
    }

    // Name check item
    const nc = get('grid', 'name_check');
    if (mismatch && nc.status === 'done') { nc.status = 'blocked'; }
    if (mismatch && nc.status === 'not_started' && get('grid', 'discom_docs').status === 'done') nc.status = 'blocked';
    if (!mismatch && nc.status !== 'done' && nc.status !== 'not_started') nc.status = 'in_progress';

    if (mismatch && get('grid', 'submission').status === 'done') { p.nameCheck.resolution = 'Accepted as same person'; nc.status = 'done'; }

    // Payments
    const advDone = get('finance', 'advance').status === 'done';
    const balDone = get('finance', 'balance').status === 'done';
    const adv = Math.round(value * (commercial ? 0.3 : 0.2) / 100) * 100;
    const created = new Date(p.createdAt).getTime();
    p.schedule = [
      { label: 'Advance', amount: adv, due: iso(created + 7 * DAY) },
      { label: pm.includes('Loan') ? 'Loan disbursement' : 'Before installation', amount: Math.round((value - adv) * 0.7 / 100) * 100, due: iso(created + 45 * DAY) },
      { label: 'On commissioning', amount: 0, due: iso(created + 90 * DAY) },
    ];
    p.schedule[2].amount = value - p.schedule[0].amount - p.schedule[1].amount;
    const mode = pm.includes('Loan') ? 'Online Transfer' : pm;
    if (advDone) p.payments.push({ date: iso(created + int(1, 6) * DAY), amount: adv, mode: pm === 'Cash' ? 'Cash' : (pm === 'Cheque' ? 'Cheque' : 'Online Transfer'), ref: 'TX' + int(10000, 99999) });
    if (balDone) p.payments.push({ date: iso(Math.min(T0 - DAY, created + int(40, 60) * DAY)), amount: value - adv, mode, ref: 'TX' + int(10000, 99999) });
    else if (advDone && ageDays > 50 && chance(0.6)) p.payments.push({ date: iso(Math.min(T0 - DAY, created + int(40, 50) * DAY)), amount: p.schedule[1].amount, mode, ref: 'TX' + int(10000, 99999) });
    const nRem = advDone && !balDone ? int(0, 3) : 0;
    for (let r = 0; r < nRem; r++) p.reminders.push({ at: iso(daysAgo(int(2, 30))), channel: pick(['WhatsApp', 'WhatsApp', 'SMS']), text: 'Payment reminder sent' });

    // Subsidy
    const sub = tracks.finance.find((x) => x.key === 'subsidy');
    if (sub && get('grid', 'commissioning').status === 'done') {
      const appliedAgo = int(5, Math.max(6, ageDays - 100));
      p.subsidy.push({ status: 'Applied on national portal', at: iso(daysAgo(appliedAgo)) });
      if (appliedAgo > 25 && chance(0.75)) {
        p.subsidy.push({ status: 'Approved by DISCOM', at: iso(daysAgo(appliedAgo - int(10, 20))) });
        if (chance(0.6)) { p.subsidy.push({ status: 'Redeemed to customer account', at: iso(daysAgo(int(1, 8))) }); sub.status = 'done'; }
        else sub.status = 'waiting_third';
      } else sub.status = 'waiting_third';
    } else if (sub && sub.status !== 'not_started') sub.status = 'not_started';

    // Installation date
    const inst = get('supply', 'installation');
    if (inst.status !== 'not_started' && inst.status !== 'done') {
      inst.status = 'in_progress';
      const off = installsToday < 9 ? 0 : int(-1, 9);
      if (off === 0) installsToday++;
      p.installDate = TODAY;
      if (off !== 0) p.installDate = new Date(T0 + off * DAY).toISOString().slice(0, 10);
    } else if (inst.status === 'done') p.installDate = new Date(new Date(inst.updatedAt).getTime()).toISOString().slice(0, 10);
    if (get('supply', 'serials').status === 'done' || (inst.status === 'done' && chance(0.5))) {
      const nMod = Math.ceil(kwp * 1000 / 540);
      p.serials.modules = Array.from({ length: Math.min(nMod, 40) }, (_, k) => 'HM540' + String(2600000 + i * 100 + k));
      p.serials.inverter = 'INV' + String(880000 + i);
    }

    // Drive
    const progress = (tracks.sales.filter((x) => x.status === 'done').length + tracks.grid.filter((x) => x.status === 'done').length) / 14;
    p.drive = SLOTS.map((slot, k) => ({
      slot, present: k < 3 ? true : k < 8 ? progress > k / 16 : progress > k / 15,
      file: `${slot.replace(/[^A-Za-z]+/g, '_')}_${p.crn}.${k === 4 || k === 11 ? 'zip' : 'pdf'}`,
      modified: iso(daysAgo(int(0, Math.max(1, ageDays)))),
    }));
    if (slotNeeds(p.loan)) p.drive.find((d) => d.slot === 'Loan sanction letter').present = get('finance', 'sanction').status === 'done';
    else p.drive = p.drive.filter((d) => d.slot !== 'Loan sanction letter');

    // Timeline
    const tl = [];
    tl.push({ type: 'status', at: p.createdAt, by: dealer ? DEALERS.find((d) => d.id === dealer).name : cp ? CHANNEL_PARTNERS.find((c) => c.id === cp).name : 'Office desk', text: `Enquiry created via ${dealer ? 'dealer' : cp ? 'channel partner' : pick(['walk-in', 'website form', 'referral', 'WhatsApp'])}` });
    for (const t of TRACKS) for (const it of tracks[t.key]) if (it.status === 'done' && it.key !== 'enquiry') tl.push({ type: 'status', at: it.updatedAt, by: 'System', text: `${it.label} — done`, track: t.key });
    if (p.quotation) {
      tl.push({ type: 'whatsapp', dir: 'out', at: p.quotation.sentAt, by: 'Office desk', text: `Quotation v${p.quotation.version} for ${kwp} kWp sent for approval. Tap "Approve" to confirm.` });
      if (p.quotation.status === 'changes_requested') tl.push({ type: 'whatsapp', dir: 'in', at: iso(new Date(p.quotation.sentAt).getTime() + 5 * 3600000), by: p.name, text: pick(['Can you reduce the price a little? Neighbour got lower rate.', 'Please change inverter brand and resend.', 'I want 1 kW more, please revise.']) });
      if (p.quotation.status === 'approved') tl.push({ type: 'whatsapp', dir: 'in', at: p.quotation.sentAt, by: p.name, text: 'Approved ✅' });
    }
    for (const pay of p.payments) tl.push({ type: 'payment', at: pay.date, by: 'Finance desk', text: `₹${pay.amount.toLocaleString('en-IN')} received · ${pay.mode} · ${pay.ref}` });
    for (const r of p.reminders) tl.push({ type: 'whatsapp', dir: 'out', at: r.at, by: 'Auto-reminder', text: `Payment reminder (${r.channel}): balance due for ${p.crn}.` });
    for (const s of p.subsidy) tl.push({ type: 'status', at: s.at, by: 'Subsidy portal', text: `Subsidy: ${s.status}`, track: 'finance' });
    const nCalls = int(1, 3);
    for (let c = 0; c < nCalls; c++) tl.push({ type: 'call', at: iso(daysAgo(int(0, Math.max(1, ageDays)), int(9, 18))), by: pick(['Office desk', p.technician]), text: pick(['Called customer — confirmed roof access for survey.', 'Customer asked about subsidy timeline. Explained 30–45 days after commissioning.', 'Discussed loan EMI options with customer.', 'Customer will share electricity bill on WhatsApp.', 'No answer. Will retry tomorrow.']) });
    if (mismatch) tl.push({ type: 'note', at: iso(daysAgo(int(1, 12))), by: 'Office desk', text: `Name on electricity bill differs from bank passbook — "${p.nameCheck.discomName}" vs "${p.nameCheck.bankName}".` });
    p.timeline = tl.filter((x) => x.at).sort((a, b) => a.at.localeCompare(b.at));
    projects.push(p);
  }
  return projects;
}
function slotNeeds(loan) { return !!loan; }

export function genActivity(projects) {
  const out = [];
  for (const p of projects) for (const e of p.timeline.slice(-3)) out.push({ ...e, crn: p.crn, pid: p.id, customer: p.name });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 220);
}

export function genAttendance() {
  const R2 = rng(77);
  const people = [...TECHNICIANS.map((n) => ({ name: n, role: 'Technician' })), ...TEAMS.map((t) => ({ name: t.lead, role: t.name }))];
  return people.map((p) => ({
    ...p,
    days: Array.from({ length: 14 }, (_, d) => {
      const r = R2();
      const date = new Date(T0 - (13 - d) * DAY);
      if (date.getDay() === 0) return 'off';
      return r < 0.82 ? 'present' : r < 0.9 ? 'half' : 'absent';
    }),
    checkIn: `0${8 + Math.floor(R2() * 2)}:${String(Math.floor(R2() * 60)).padStart(2, '0')}`,
    site: CITIES[Math.floor(R2() * CITIES.length)],
  }));
}
