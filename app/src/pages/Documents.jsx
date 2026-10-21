import { ManagedSelect } from '../components/ManagedOptions.jsx';
import { preparedDocumentKeys } from '../lib/documentTask.js';
import DocumentTask from '../components/DocumentTask.jsx';
import DocumentQueues from '../components/DocumentQueues.jsx';
import { documentAvailable, documentRules, SCHEMES } from '../lib/documentRules.js';
import { useEffect, useMemo, useState } from 'react';
import { Navigate,useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconFileInvoice, IconFileCertificate, IconSolarPanel2, IconFileText, IconId, IconReceipt, IconFolders, IconArrowRight, IconCircleCheck, IconAlertTriangle, IconClock, IconPencil, IconBrandGoogleDrive, IconUserSearch, IconFilePlus, IconFolderPlus, IconLock,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, fdate } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import { PageHead, Empty, CustName, StageChip, Avatar, SecTitle } from '../components/ui.jsx';
import { CustomerPicker } from './Quotes.jsx';
import { SignLinkButton } from '../components/SignLink.jsx';
import DocumentFlow from '../components/DocumentFlow.jsx';
import { mapFeasibilityReport, getMissingFeasibilityFields } from '../docs/feasibility.js';

const blank = (v) => !v || String(v).trim() === '' || String(v).trim() === '—';

/**
 * Document maker: pick a customer once and see every document Sunpay makes for them — whether it is ready,
 * what is still missing, and one button to open or download it. Each document is still made by its own
 * generator; this page is the single place to start from.
 */
export default function Documents({ customerId, embedded = false }) {
  const session = useSession();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [selectedDocument,setSelectedDocument]=useState(null);
  const pid = customerId || params.get('p');
  const [p] = useData(() => (pid ? api.getProject(pid) : Promise.resolve(null)), [pid]);
  const [assets] = useData(() => api.getCompanyAssets(), []);
  // Bills and invoices are disabled.
  const ok = p && !p.notFound && !p.forbidden;
  const can = (page) => pageAllowed(page, session.role);

  useEffect(()=>setSelectedDocument(null),[pid]);
  const workflow = ok ? documentRules(p) : null;
  const selectedKey=selectedDocument||(workflow?.classify('feas').bucket==='current'?'feas':workflow?.classify('agreement').bucket==='current'?'agreement':'quote');
  const docs = useMemo(() => {
    if (!ok) return [];
    const a = assets || {};
    const sunpayMissing = [!a.stamp && 'Sunpay company stamp', !a.sign && 'Authorised signature'].filter(Boolean);
    const out = [];

    const q = p.quotation;
    out.push({
      key: 'quote', icon: IconFileInvoice, title: 'Quotation & acceptance link', page: 'proposal', to: `/proposal?p=${p.id}`,
      desc: 'Prepare the system price before portal registration.',
      state: !q ? 'todo' : q.status === 'approved' ? 'done' : 'wait',
      status: !q ? 'Not made yet' : q.status === 'approved' ? `Approved (version ${q.version || 1})` : q.status === 'changes_requested' ? 'Customer asked for changes' : 'Sent, waiting for approval',
      missing: [], action: q ? 'Open quotation' : 'Create quotation', core: true,
    });

    const ps = api.proposalStatus(p);
    out.push({
      key: 'proposal', icon: IconFileCertificate, title: 'Residential proposal', page: 'proposal', to: `/proposal?p=${p.id}`,
      desc: 'Multi-page solar proposal with savings, EMI and terms; the customer accepts it on their phone.',
      state: ps.state === 'accepted' ? 'done' : ps.state === 'none' ? 'todo' : 'wait',
      status: ps.state === 'none' ? 'Not made' : ps.state === 'accepted' ? `Accepted on ${fdate(ps.at)} (v${ps.version})` : ps.state === 'expired' ? `Sent v${ps.version}, link expired` : `Sent v${ps.version}, waiting`,
      missing: p.type !== 'Residential' ? [`Customer is ${p.type} — this proposal is for homes`] : [], action: ps.state === 'none' ? 'Make proposal' : 'Open proposal',
    });

    const feas = getMissingFeasibilityFields(mapFeasibilityReport(p)).map((m) => m.field);
    out.push({
      key: 'feas', icon: IconSolarPanel2, title: 'Feasibility report', page: 'feasibility', to: `/feasibility?p=${p.id}`,
      desc: 'PM Surya Ghar vendor feasibility report, 3 pages.',
      state: feas.length ? 'todo' : sunpayMissing.length ? 'wait' : 'done',
      status: feas.length ? `${feas.length} detail${feas.length === 1 ? '' : 's'} missing` : 'Ready to download',
      missing: [...feas, ...sunpayMissing.map((x) => `${x}`)], action: 'Create & download', core: true,
    });

    const signed = !!p.signature?.png;
    const agMissing = [blank(p.consumerNo) && 'DISCOM consumer number', !signed && 'Customer signature (send the signing link)', ...sunpayMissing].filter(Boolean);
    out.push({
      key: 'agreement', icon: IconFileText, title: 'DISCOM submission', page: 'discom_docs', to: `/grid/docs?a=${p.id}`,
      desc: 'PM Surya Ghar model agreement (Annexure 2), 4 pages, for the DISCOM file.',
      state: signed && !agMissing.length ? 'done' : signed ? 'wait' : 'todo',
      status: signed ? `Customer signed ${fdate(p.signature.at)}` : p.signRequest?.status === 'sent' ? 'Signing link sent, not signed yet' : 'Not signed yet',
      missing: agMissing, action: 'Create & download', core: true, extra: !signed && api.canDo('edit') ? <SignLinkButton pid={p.id} className="btn sm" small /> : null,
    });

    /* Bills and invoices are disabled.
    const inv = (invoices || []).find((r) => r.pid === p.id);
    out.push({
      key: 'invoice', icon: IconReceipt, title: 'Bill / invoice', page: 'invoices', to: `/money/invoices?p=${p.id}`,
      desc: 'GST invoice for the system.',
      state: inv ? (inv.status === 'done' ? 'done' : 'wait') : 'later',
      status: inv ? `${inv.no}${inv.status === 'done' ? ' · issued' : ''}` : 'Available once the customer has paid or the system is connected',
      missing: [], action: 'Open invoice', disabled: !inv,
    });

    */
    const drive = p.drive || [];
    const have = drive.filter((d) => d.present).length;
    out.push({
      key: 'drive', icon: IconFolders, title: 'Customer documents (Google Drive)', page: 'record', to: `/p/${p.id}`,
      desc: 'Aadhaar, electricity bill, bank passbook, photos and other files in the customer\'s Drive folder.',
      state: have === drive.length ? 'done' : 'todo',
      status: `${have} of ${drive.length} in the folder`,
      missing: drive.filter((d) => !d.present).map((d) => d.slot), action: 'Open customer record',
    });
    // The four documents first, in this order; everything else after.
    const ORDER = ['quote', 'feas', 'agreement'];
    return [...ORDER.map((k) => out.find((d) => d.key === k)), ...out.filter((d) => !ORDER.includes(d.key))].filter(Boolean).map((d) => { const rule = documentRules(p).classify(d.key); if (d.key === 'invoice' && d.disabled) { rule.bucket = 'later'; rule.reason = 'Available after payment or commissioning.'; } return { ...d, ...rule, disabled: d.disabled || rule.bucket === 'later', extra: rule.bucket === 'current' ? d.extra : null }; });
  }, [ok, p, assets]);

  const ready = docs.filter((d) => d.state === 'done').length;

  if (!embedded && pid) return <Navigate to={`/p/${pid}?tab=documents`} replace/>;
  if (!embedded && !pid) return <div className="page"><PageHead title="Documents" sub="Track sent links and completed documents. Create documents from each customer’s Documents tab."/><DocumentQueues/></div>;

  return (
    <div className={embedded ? "embedded-documents" : "page"}>
      {!embedded && <PageHead title="Document maker" sub="Prepare, share and save this customer’s documents." />}
      {!embedded && <button className="btn" style={{marginBottom:16}} onClick={()=>setParams(params.get('queue')?{queue:params.get('queue')}:{})}>← Document customer cards</button>}
      <div className="docs-embedded-layout">
        <div>
          {!pid ? <div className="card"><Empty icon={IconUserSearch} hint="Search by name, CRN or city on the left.">Pick a customer to see their documents.</Empty></div>
            : !p ? <div className="card faint small" style={{ padding: 16 }}>Loading…</div>
            : !ok ? <div className="card"><Empty icon={IconLock}>This customer is not in your list.</Empty></div>
            : (
              <>
                {!embedded && <div className="card docs-head">
                  <Avatar name={p.name} size="lg" />
                  <CustName id={p.id} name={p.name} crn={p.crn} meta={`${p.city} · ${p.kwp} kWp · ${p.type}`} />
                  <StageChip r={p.summary} />

                </div>}
                <nav className="document-type-selector" aria-label="Document type">{[['quote','Quotation'],['feas','Feasibility report'],['agreement','DISCOM submission']].map(([key,label])=><button key={key} aria-pressed={selectedKey===key} className={selectedKey===key?'selected':''} onClick={()=>setSelectedDocument(key)}>{label}<small>{documentAvailable(p,key)?'Prepare / view':'Not required'}</small></button>)}</nav>
                <div className="simple-document-list">{docs.filter(d=>d.key===selectedKey&&['quote','feas','agreement'].includes(d.key)).map(d=>{
                  const prepared=preparedDocumentKeys(p).includes(d.key);
                  const applicable=documentAvailable(p,d.key);
                  return <section className="card card-b" key={d.key}><div className="document-entry-heading"><h2>{d.key==='quote'?'Quotation':d.title}</h2><span className="small faint">{d.bucket==='current'?'Needed at this stage':prepared?'Previously prepared':applicable?'Available to prepare':'Not required'}</span></div><p className="small faint">{d.key==='quote'?'Prepare, preview and share the quotation.':d.reason}</p>{applicable||prepared?<DocumentTask customerId={p.id} docKey={d.key}/>:<p className="small">{d.key==='feas'?'For customers using a bank or personal loan.':'For PM Surya Ghar customers.'} Update project requirements below if needed.</p>}</section>;
                })}</div>
                <details className="document-extra"><summary>Project requirements</summary><DocumentSetup key={p.id} p={p} workflow={workflow}/></details>
                <details className="document-extra"><summary>Existing documents & history</summary><DocGrid docs={docs.filter((d)=>d.bucket==='history'&&!['quote','proposal','feas','agreement','name'].includes(d.key))} p={p} can={can} nav={nav}/></details>

              </>
            )}
        </div>
      </div>
    </div>
  );
}

function DocGrid({ docs, p, can, nav }) {
  const canLink = api.canDo('edit') || api.canDo('link_docs');
  return (
    <div className="docs-grid">
      {docs.map((d) => (
        <div key={d.key} className={'card doc-card ' + d.state}>
          <div className="doc-top">
            <span className="doc-ico"><d.icon size={22} stroke={1.8} /></span>
            <div className="grow"><div className="doc-title">{d.title}</div><div className="faint small">{d.desc}</div></div>
          </div>
          <div className={'doc-status ' + d.state} role="status">
            {d.state === 'done' ? <IconCircleCheck size={15} /> : d.state === 'todo' ? <IconAlertTriangle size={15} /> : <IconClock size={15} />}
            <span>{d.status}</span>
          </div>
          {d.missing.length > 0 && (
            <ul className="doc-missing">
              {d.missing.slice(0, 5).map((m) => <li key={m}>{m}</li>)}
              {d.missing.length > 5 && <li className="faint">and {d.missing.length - 5} more</li>}
            </ul>
          )}
          <div className="doc-actions">
            {(d.page === 'record' || can(d.page)) && !d.disabled
              ? <button className="btn sm primary" onClick={() => nav(d.to)}>{d.action}<IconArrowRight size={14} /></button>
              : <span className="faint small">{d.disabled ? '' : 'Not available for your role'}</span>}
            {d.extra}
          </div>
          {d.key !== 'drive' && <DocLink pid={p.id} k={d.key} link={p.docLinks?.[d.key]} canEdit={canLink} />}
        </div>
      ))}
    </div>
  );
}

/** After uploading the file to Drive: the pen takes the file's link, which then becomes an "Open in Drive" button. */
function DocLink({ pid, k, link, canEdit }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (url) => {
    setBusy(true);
    try { await api.setDocLink(pid, k, url); setEditing(false); toast(url ? 'Saved. The link is now a button.' : 'Drive link removed'); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  if (editing) {
    return (
      <form className="doc-link edit" onSubmit={(e) => { e.preventDefault(); save(value); }}>
        <label className="sr-only" htmlFor={`dl-${k}`}>Google Drive link</label>
        <input id={`dl-${k}`} className="input" autoFocus inputMode="url" placeholder="Paste the Google Drive link of the uploaded file" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="doc-link-btns">
          <button className="btn sm primary" disabled={busy || !value.trim()}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn sm" onClick={() => setEditing(false)}>Cancel</button>
          {link && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => save('')}>Remove link</button>}
        </div>
      </form>
    );
  }
  return (
    <div className="doc-link">
      {link
        ? <><a className="btn sm drive-btn" href={link.url} target="_blank" rel="noopener noreferrer"><IconBrandGoogleDrive size={15} /> Open in Drive</a>
            <span className="faint small">Uploaded {fdate(link.at)}{link.by ? ` · ${link.by}` : ''}</span></>
        : <span className="faint small">Not in the Drive folder yet</span>}
      {canEdit && (
        <button type="button" className="btn sm ghost doc-pen" onClick={() => { setValue(link?.url || ''); setEditing(true); }}
          title={link ? 'Change the Drive link' : 'Uploaded it? Add the Drive link'} aria-label={link ? 'Change the Drive link' : 'Add the Drive link'}>
          <IconPencil size={14} />{!link && <span>Add Drive link</span>}
        </button>
      )}
    </div>
  );
}

function DocumentSetup({ p, workflow }) {
  const [editing, setEditing] = useState(false);
  const [scheme, setScheme] = useState(p.scheme || '');
  const [payment, setPayment] = useState(p.paymentMethod || 'Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.saveDocumentWorkflow(p.id, { scheme, paymentMethod: payment }); setEditing(false); } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="document-setup card card-b">
    <div className="row" style={{ flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}><div><b>{SCHEMES.find(([key]) => key === p.scheme)?.[1] || 'Scheme not selected'}</b><div className="small faint">{p.paymentMethod} · {workflow.loan ? 'Loan documents required' : 'Self-funded'}</div></div>{api.canDo('edit') && <button className="btn sm" onClick={() => { setScheme(p.scheme || ''); setPayment(p.paymentMethod || 'Cash'); setEditing(!editing); }}>Change requirements</button>}</div>
    {!p.scheme && <p className="small">Choose the scheme to show the correct submission documents.</p>}
    {editing && <form className="document-setup-form" onSubmit={save}><label className="fld"><span>Project scheme</span><ManagedSelect category="schemes" placeholder="Choose scheme" className="select" value={scheme} onChange={(e) => setScheme(e.target.value)} disabled={busy}/></label><label className="fld"><span>Payment method</span><ManagedSelect category="payment_methods" className="select" value={payment} onChange={(e) => setPayment(e.target.value)} disabled={busy}/></label><button className="btn primary" disabled={busy}>Save</button>{error && <div className="form-err" role="alert">{error}</div>}</form>}
  </section>;
}
