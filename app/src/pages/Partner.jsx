import { ManagedSelect } from '../components/ManagedOptions.jsx';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconUserPlus, IconSearch, IconCheck, IconCoin, IconHourglass, IconCash, IconCalendarDue, IconBellRinging, IconAffiliate, IconUsers, IconUserSearch, IconReceipt2, IconLoader2 } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, inr } from '../lib/hooks.jsx';
import { PageHead, Empty, CustomerLine, RecentStrip, StageChip, Pill, CustName, IconChip, SecTitle, Avatar } from '../components/ui.jsx';
import Board from '../components/Board.jsx';
import { t, useLang, LangSwitch } from '../lib/i18n.js';
import '../styles/i18n.css';

function Loading() {
  return <div className="zero loading" role="status"><IconLoader2 size={20} className="spin" aria-hidden="true" /><div>{t('common.loading')}</div></div>;
}

/** Partner home (CPO / CP / Dealer): phone-friendly. Board of "needs your action", my customers, commission. */
export function PartnerHome() {
  const lang = useLang();
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
  if (!h) return <div className="page" lang={lang}><LangSwitch /><Loading /></div>;
  const subKey = session.role === 'CPO' ? 'partner.subCPO' : session.role === 'CP' ? 'partner.subCP' : 'partner.subDealer';
  const sub = t(subKey, { count: h.count, customers: t(h.count === 1 ? 'common.customersOne' : 'common.customersMany') }) + ' ' + t('partner.tapHint');
  return (
    <div className="page partner" lang={lang}>
      <LangSwitch />
      <PageHead title={t('partner.welcome', { name: h.who })} sub={sub}>
        <Link className="btn primary" to="/add-lead"><IconUserPlus size={16} /> {t('partner.addLead')}</Link>
      </PageHead>
      <RecentStrip rows={recent} />

      <div className="comm-strip">
        <Link to="/my-commission" className="cs t-orange"><IconChip icon={IconCoin} tone="orange" /><span>{t('partner.commEarned')}</span><b className="num">{inr(h.commission.earned)}</b><small>{t('partner.commEarnedNote')}</small></Link>
        <Link to="/my-commission" className="cs t-violet"><IconChip icon={IconHourglass} tone="violet" /><span>{t('partner.commPending')}</span><b className="num">{inr(h.commission.pending)}</b><small>{t('partner.commPendingNote')}</small></Link>
        <Link to="/my-commission" className="cs t-green"><IconChip icon={IconCash} tone="green" /><span>{t('partner.commPaid')}</span><b className="num ok">{inr(h.commission.paid)}</b><small>{t('partner.commPaidNote')}</small></Link>
        <Link to="/my-commission" className="cs t-blue"><IconChip icon={IconCalendarDue} tone="blue" /><span>{t('partner.commUpcoming')}</span><b className="num">{inr(h.commission.upcoming)}</b><small>{t('partner.commUpcomingNote')}</small></Link>
      </div>

      <SecTitle icon={IconBellRinging} tone="rose" title={t('partner.needsAction')} desc={t('partner.needsActionDesc')} />
      <Board kind="partner" perPart={4} />

      {h.network.length > 0 && (
        <>
          <SecTitle icon={IconAffiliate} tone="sun" title={t(session.role === 'CPO' ? 'partner.networkCPO' : 'partner.networkCP')} desc={t('partner.networkDesc')} />
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

      <SecTitle icon={IconUsers} tone="violet" title={t('partner.myCustomers')} desc={t('partner.myCustomersDesc')} />
      <div className="row input pill-input" style={{ marginBottom: 12 }}>
        <IconSearch size={16} className="faint" />
        <input style={{ border: 0, outline: 0, background: 'none', flex: 1, minWidth: 0 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('partner.filterPlaceholder')} aria-label={t('partner.filterLabel')} />
      </div>
      <div className="card">
        {shown.slice(0, n).map((r) => <CustomerLine key={r.id} r={r} note={session.role !== 'Dealer' && r.dealerName ? t('partner.via', { name: r.dealerName }) : session.role === 'CPO' ? r.cpName : null} right={<span className="cl-right"><StageChip r={r} /></span>} />)}
        {rows && shown.length === 0 && <Empty icon={q ? IconUserSearch : IconUserPlus} hint={t('partner.emptyHint', { button: t('partner.addLead') })}>{t(q ? 'partner.noMatch' : 'partner.noCustomers')}</Empty>}
        {shown.length > n && <div className="card-b"><button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setN(n + 20)}>{t('partner.showMore', { count: shown.length - n })}</button></div>}
      </div>
    </div>
  );
}

const CITIES = api.meta.CITIES;
export function AddLead() {
  const lang = useLang();
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
    if (f.name.trim().length < 3) return setErr('lead.errName');
    if (digits.length !== 10) return setErr('lead.errPhone');
    setErr('');
    const id = await api.addLead({ ...f, phone: digits });
    toast(t('lead.added', { crn: id.replace('PRJ', 'CRN') }));
    nav('/p/' + id);
  };
  return (
    <div className="page" style={{ maxWidth: 640 }} lang={lang}>
      <LangSwitch />
      <PageHead title={t('lead.title')} sub={t('lead.sub')} />
      <form className="card card-b form" onSubmit={submit}>
        <label className="fld"><span>{t('lead.name')}</span><input className="input" value={f.name} onChange={set('name')} placeholder={t('lead.namePlaceholder')} autoComplete="off" /></label>
        <label className="fld"><span>{t('lead.phone')}</span><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder={t('lead.phonePlaceholder')} autoComplete="off" /></label>
        <div className="grid2">
          <label className="fld"><span>{t('lead.city')}</span><ManagedSelect category="cities" className="select" value={f.city} onChange={set('city')}/></label>
          <label className="fld"><span>{t('lead.kwp')}</span><input className="input" inputMode="decimal" value={f.kwp} onChange={set('kwp')} /></label>
        </div>
        <label className="fld"><span>{t('lead.type')}</span><ManagedSelect category="customer_types" disabledValues={['Commercial','Industrial']} className="select" value={f.type} onChange={set('type')}/></label>
        <label className="fld"><span>{t('lead.address')}</span><input className="input" value={f.address} onChange={set('address')} placeholder={t('lead.addressPlaceholder')} /></label>
        {cps.length > 0 && <label className="fld"><span>{t('lead.cp')}</span><select className="select" value={f.cp} onChange={set('cp')}>{session.role !== 'CPO' && <option value="">{t('lead.cpDirect')}</option>}{cps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {dealers.length > 0 && <label className="fld"><span>{t('lead.dealer')}</span><select className="select" value={f.dealer} onChange={set('dealer')}><option value="">{t('lead.dealerMe')}</option>{dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
        <label className="fld"><span>{t('lead.notes')}</span><textarea className="input" rows={3} value={f.notes} onChange={set('notes')} placeholder={t('lead.notesPlaceholder')} /></label>
        {err && <div className="form-err" role="alert">{t(err)}</div>}
        <button className="btn primary big-btn" type="submit"><IconCheck size={17} /> {t('lead.save')}</button>
      </form>
    </div>
  );
}

export function MyCommission() {
  const lang = useLang();
  const session = useSession();
  const [rows] = useData(() => api.listMyCommission(), [session.role, session.cpoId, session.cpId, session.dealerId]);
  const sum = (st) => (rows || []).filter((r) => st.includes(r.state)).reduce((s, r) => s + r.amount, 0);
  return (
    <div className="page" lang={lang}>
      <LangSwitch />
      <PageHead title={t('comm.title')} sub={t('comm.sub')} />
      <div className="comm-strip">
        <div className="cs t-violet"><IconChip icon={IconHourglass} tone="violet" /><span>{t('partner.commPending')}</span><b className="num">{inr(sum(['pending']))}</b></div>
        <div className="cs t-green"><IconChip icon={IconCash} tone="green" /><span>{t('partner.commPaid')}</span><b className="num ok">{inr(sum(['paid']))}</b></div>
        <div className="cs t-blue"><IconChip icon={IconCalendarDue} tone="blue" /><span>{t('partner.commUpcoming')}</span><b className="num">{inr(sum(['upcoming']))}</b></div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>{t('comm.colCustomer')}</th><th>{t('comm.colFor')}</th><th className="hide-sm">{t('comm.colBasis')}</th><th className="r">{t('comm.colAmount')}</th><th>{t('comm.colState')}</th></tr></thead>
          <tbody>{(rows || []).map((r, i) => (
            <tr key={r.pid + i}><td><CustName id={r.pid} name={r.name} crn={r.crn} strong={false} /></td><td className="small">{r.party}</td><td className="small muted hide-sm">{r.basis}</td><td className="r num">{inr(r.amount)}</td>
              <td>{r.state === 'paid' ? <Pill status="done">{t('comm.paid')}</Pill> : r.state === 'pending' ? <Pill status="in_progress">{t('comm.toBePaid')}</Pill> : <Pill>{t('comm.afterGrid')}</Pill>}</td></tr>
          ))}</tbody>
        </table>
        {rows && rows.length === 0 && <Empty icon={IconReceipt2} hint={t('comm.emptyHint')}>{t('comm.empty')}</Empty>}
      </div>
    </div>
  );
}
