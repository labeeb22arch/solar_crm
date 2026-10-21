import { ManagedSelect } from '../components/ManagedOptions.jsx';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconUserPlus, IconSearch, IconCheck, IconCoin, IconHourglass, IconCash, IconCalendarDue, IconBellRinging, IconAffiliate, IconUsers, IconUserSearch, IconReceipt2 } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, inr } from '../lib/hooks.jsx';
import { PageHead, Empty, CustomerLine, RecentStrip, StageChip, Pill, CustName, IconChip, SecTitle, Avatar } from '../components/ui.jsx';
import Board from '../components/Board.jsx';

/** Partner home (CPO / CP / Dealer): phone-friendly. Board of "needs your action", my customers, commission. */
export function PartnerHome() {
  const session = useSession();
  const deps = [session.role, session.cpoId, session.cpId, session.dealerId];
  const [h] = useData(() => api.getPartnerHome(), deps);
  const [rows] = useData(() => api.listProjects({ sort: 'newest' }), deps);
  const [recent] = useData(() => api.listRecent(), deps);
  const [q, setQ] = useState('');
  const [n, setN] = useState(15);
  const shown = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => [r.name, r.crn, r.city, r.phone, r.dealerName || '', r.cpName || ''].join(' ').toLowerCase().includes(s.replace(/\s+/g, ' '))) : rows;
  }, [rows, q]);
  if (!h) return <div className="page"><Empty>Loading…</Empty></div>;
  const kind = session.role === 'CPO' ? 'partner office' : session.role === 'CP' ? 'channel partner' : 'dealer';
  return (
    <div className="page partner">
      <PageHead title={`Welcome, ${h.who}`} sub={`Your ${kind} home: ${h.count} customer${h.count === 1 ? '' : 's'}${session.role === 'CPO' ? ' across your partners and dealers' : session.role === 'CP' ? ' including your dealers’ customers' : ''}. Tap a customer for status, next step and phone number.`}>
        <Link className="btn primary" to="/add-lead"><IconUserPlus size={16} /> Add lead</Link>
      </PageHead>
      <RecentStrip rows={recent} />

      <div className="comm-strip">
        <Link to="/my-commission" className="cs t-orange"><IconChip icon={IconCoin} tone="orange" /><span>Commission earned</span><b className="num">{inr(h.commission.earned)}</b><small>on customers already connected</small></Link>
        <Link to="/my-commission" className="cs t-violet"><IconChip icon={IconHourglass} tone="violet" /><span>Waiting to be paid</span><b className="num">{inr(h.commission.pending)}</b><small>Sunpay will pay this</small></Link>
        <Link to="/my-commission" className="cs t-green"><IconChip icon={IconCash} tone="green" /><span>Paid to you</span><b className="num ok">{inr(h.commission.paid)}</b><small>already received</small></Link>
        <Link to="/my-commission" className="cs t-blue"><IconChip icon={IconCalendarDue} tone="blue" /><span>Coming later</span><b className="num">{inr(h.commission.upcoming)}</b><small>after grid connection</small></Link>
      </div>

      <SecTitle icon={IconBellRinging} tone="rose" title="Needs your action" desc="Customers who need a call or documents from you, and installation visits coming up." />
      <Board kind="partner" perPart={4} />

      {h.network.length > 0 && (
        <>
          <SecTitle icon={IconAffiliate} tone="sun" title={session.role === 'CPO' ? 'Your channel partners and dealers' : 'Your dealers'} desc="How many customers each one has brought in." />
          <div className="card">
            {h.network.map((c) => (
              <div key={c.id} className="net-row">
                <div className="row"><Avatar name={c.name} size="sm" /><b className="grow">{c.name}</b><span className="faint small">{c.kind}</span><span className="count-pill">{c.count}</span></div>
                {c.dealers.length > 0 && <div className="net-dealers">{c.dealers.map((d) => <span key={d.id} className="chip">{d.name} · {d.count}</span>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <SecTitle icon={IconUsers} tone="violet" title="My customers" desc="Newest first. Each customer shows the stage they are in (1–11)." />
      <div className="row input pill-input" style={{ marginBottom: 12 }}>
        <IconSearch size={16} className="faint" />
        <input style={{ border: 0, outline: 0, background: 'none', flex: 1, minWidth: 0 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter my customers by name, city, CRN…" aria-label="Filter my customers" />
      </div>
      <div className="card">
        {shown.slice(0, n).map((r) => <CustomerLine key={r.id} r={r} note={session.role !== 'Dealer' && r.dealerName ? `via ${r.dealerName}` : session.role === 'CPO' ? r.cpName : null} right={<span className="cl-right"><StageChip r={r} /></span>} />)}
        {rows && shown.length === 0 && <Empty icon={q ? IconUserSearch : IconUserPlus} hint="Use “Add lead” to register a new enquiry — it will appear here straight away.">{q ? 'No customer matches your filter.' : 'You have no customers yet.'}</Empty>}
        {shown.length > n && <div className="card-b"><button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setN(n + 20)}>Show more ({shown.length - n} left)</button></div>}
      </div>
    </div>
  );
}

const CITIES = api.meta.CITIES;
export function AddLead() {
  const session = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', city: 'Deesa', kwp: '3', type: 'Residential', address: '', notes: '', cp: '', dealer: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cps = session.role === 'CPO' ? api.meta.CHANNEL_PARTNERS.filter((c) => c.cpoId === session.cpoId) : session.role === 'Admin' || session.role === 'Office Staff' ? api.meta.CHANNEL_PARTNERS : [];
  const dealers = session.role === 'CP' ? api.meta.DEALERS.filter((d) => d.cpId === session.cpId) : [];
  const submit = async (e) => {
    e.preventDefault();
    const digits = f.phone.replace(/\D/g, '').slice(-10);
    if (f.name.trim().length < 3) return setErr('Please enter the customer’s full name.');
    if (digits.length !== 10) return setErr('Please enter a 10-digit mobile number.');
    setErr('');
    const id = await api.addLead({ ...f, phone: digits });
    toast('Lead added · ' + id.replace('PRJ', 'CRN'));
    nav('/p/' + id);
  };
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <PageHead title="Add a lead" sub="Register a new enquiry. The office will call the customer and book a site survey. Fields marked * are needed." />
      <form className="card card-b form" onSubmit={submit}>
        <label className="fld"><span>Customer name *</span><input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Hetal Patel" autoComplete="off" /></label>
        <label className="fld"><span>Mobile number *</span><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10 digits" autoComplete="off" /></label>
        <div className="grid2">
          <label className="fld"><span>City</span><ManagedSelect category="cities" className="select" value={f.city} onChange={set('city')}/></label>
          <label className="fld"><span>System size (kWp)</span><input className="input" inputMode="decimal" value={f.kwp} onChange={set('kwp')} /></label>
        </div>
        <label className="fld"><span>Type</span><ManagedSelect category="customer_types" disabledValues={['Commercial','Industrial']} className="select" value={f.type} onChange={set('type')}/></label>
        <label className="fld"><span>Address</span><input className="input" value={f.address} onChange={set('address')} placeholder="House / society, area" /></label>
        {cps.length > 0 && <label className="fld"><span>Channel partner</span><select className="select" value={f.cp} onChange={set('cp')}>{session.role !== 'CPO' && <option value="">Direct (no partner)</option>}{cps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {dealers.length > 0 && <label className="fld"><span>Brought in by dealer</span><select className="select" value={f.dealer} onChange={set('dealer')}><option value="">Me (no dealer)</option>{dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
        <label className="fld"><span>Notes</span><textarea className="input" rows={3} value={f.notes} onChange={set('notes')} placeholder="Best time to call, roof type, anything useful" /></label>
        {err && <div className="form-err" role="alert">{err}</div>}
        <button className="btn primary big-btn" type="submit"><IconCheck size={17} /> Save lead</button>
      </form>
    </div>
  );
}

export function MyCommission() {
  const session = useSession();
  const [rows] = useData(() => api.listMyCommission(), [session.role, session.cpoId, session.cpId, session.dealerId]);
  const sum = (st) => (rows || []).filter((r) => st.includes(r.state)).reduce((s, r) => s + r.amount, 0);
  return (
    <div className="page">
      <PageHead title="My commission" sub="Commission on your customers only. It becomes payable once the customer’s system is connected to the grid." />
      <div className="comm-strip">
        <div className="cs t-violet"><IconChip icon={IconHourglass} tone="violet" /><span>Waiting to be paid</span><b className="num">{inr(sum(['pending']))}</b></div>
        <div className="cs t-green"><IconChip icon={IconCash} tone="green" /><span>Paid to you</span><b className="num ok">{inr(sum(['paid']))}</b></div>
        <div className="cs t-blue"><IconChip icon={IconCalendarDue} tone="blue" /><span>Coming later</span><b className="num">{inr(sum(['upcoming']))}</b></div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>For</th><th className="hide-sm">How it is worked out</th><th className="r">Amount</th><th>State</th></tr></thead>
          <tbody>{(rows || []).map((r, i) => (
            <tr key={r.pid + i}><td><CustName id={r.pid} name={r.name} crn={r.crn} strong={false} /></td><td className="small">{r.party}</td><td className="small muted hide-sm">{r.basis}</td><td className="r num">{inr(r.amount)}</td>
              <td>{r.state === 'paid' ? <Pill status="done">Paid</Pill> : r.state === 'pending' ? <Pill status="in_progress">To be paid</Pill> : <Pill>After grid connection</Pill>}</td></tr>
          ))}</tbody>
        </table>
        {rows && rows.length === 0 && <Empty icon={IconReceipt2} hint="Commission appears here for every customer you bring in.">No commission yet.</Empty>}
      </div>
    </div>
  );
}
