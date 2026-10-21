import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconCheck, IconBuildingBank, IconBolt, IconId, IconArrowRight, IconFileText } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession, useToast, useUi } from '../lib/hooks.jsx';
import { PageHead, Pill, Empty, CustName, BackToDocs } from '../components/ui.jsx';
import { downloadNameDeclaration } from '../docs/nameDeclaration.js';

function Tokens({ name, other }) {
  const ot = api.tokens(other);
  return (
    <span>
      {String(name).split(/\s+/).map((w, i) => {
        const t = api.tokens(w)[0];
        const m = t ? api.tokenMatch(t, ot) : 1;
        const tone = m === 1 ? null : m > 0 ? 'var(--violet)' : 'var(--coral)';
        return <span key={i} title={m === 1 ? 'Exact' : m > 0 ? 'Partial match' : 'Not found in other name'} style={{ padding: '1px 3px', borderRadius: 4, marginRight: 3, background: tone ? (m > 0 ? 'var(--violet-soft)' : 'var(--coral-soft)') : 'transparent', color: tone || 'inherit' }}>{w}</span>;
      })}
    </span>
  );
}

const RES = [
  { id: 'Accepted as same person', icon: IconCheck, hint: 'Initials / “bhai” suffix only. Attach name-match declaration to DISCOM file.' },
  { id: 'DISCOM name change requested', icon: IconBolt, hint: 'Customer submits name-change form + ID to DISCOM. Track waits on customer.' },
  { id: 'Bank name change requested', icon: IconBuildingBank, hint: 'Customer updates bank KYC so subsidy can be credited.' },
];

export default function NameCheck() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('open');
  const [list] = useData(() => api.listNameChecks(), [session.role, session.branch]);
  const toast = useToast();
  const ui = useUi();
  const ro = !api.canDo('edit');
  const rows = (list || []).filter((r) => view === 'open' ? !r.match && !r.resolution : view === 'resolved' ? !r.match && r.resolution : r.match);
  const sel = (list || []).find((r) => r.pid === params.get('p')) || rows[0];
  useEffect(() => { if (sel && !params.get('p')) setParams({ p: sel.pid }, { replace: true }); }, [sel]); // eslint-disable-line
  const open = (list || []).filter((r) => !r.match && !r.resolution).length;

  const resolve = async (res) => {
    await api.resolveNameCheck(sel.pid, res);
    toast(res + ' · ' + sel.crn);
    const nextRow = rows.find((r) => r.pid !== sel.pid);
    if (nextRow) setParams({ p: nextRow.pid });
  };

  return (
    <div className="page">
      <PageHead title="Name check" sub="The subsidy is paid only when the name on the electricity bill matches the bank account name. Fix the mismatches here, and download the name declaration for the DISCOM file.">
        <BackToDocs pid={params.get('p')} />
        <div className="seg">
          <button className={view === 'open' ? 'on' : ''} onClick={() => setView('open')}>To fix <span className="mono">{open}</span></button>
          <button className={view === 'resolved' ? 'on' : ''} onClick={() => setView('resolved')}>Resolved</button>
          <button className={view === 'matched' ? 'on' : ''} onClick={() => setView('matched')}>Matched</button>
        </div>
      </PageHead>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', alignItems: 'start' }}>
        <div className="card tbl-wrap" style={{ maxHeight: '72vh' }}>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>DISCOM name</th><th className="r">Score</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pid} className="click" onClick={() => setParams({ p: r.pid })} style={sel && sel.pid === r.pid ? { background: 'var(--surface-2)', boxShadow: 'inset 2px 0 0 var(--accent)' } : null}>
                  <td><CustName id={r.pid} name={r.name} crn={r.crn} meta={r.discom} /></td>
                  <td className="small muted ell" style={{ maxWidth: 180 }}>{r.discomName}</td>
                  <td className="r"><span className="mono" style={{ color: r.score >= 90 ? 'var(--accent-text)' : r.score >= 60 ? 'var(--violet)' : 'var(--coral)' }}>{r.score}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty>Nothing here.</Empty>}
        </div>

        {sel ? (
          <div className="card">
            <div className="card-h">
              <CustName id={sel.pid} name={sel.name} crn={sel.crn} block={false} />
              <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => downloadNameDeclaration(sel, api.meta.COMPANY)} title="One-page declaration that both names are the same person">Download declaration</button>
              <button className="btn sm" onClick={() => ui.openCustomer(sel.pid)}>Open record <IconArrowRight size={13} /></button>
            </div>
            <div className="card-b stack">
              <div className="grid2">
                <div className="card card-b" style={{ background: 'var(--surface-2)' }}>
                  <div className="row faint small" style={{ marginBottom: 6 }}><IconBolt size={14} /> DISCOM consumer name · {sel.discom}</div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}><Tokens name={sel.discomName} other={sel.bankName} /></div>
                  <div className="faint small" style={{ marginTop: 6 }}>From electricity bill</div>
                </div>
                <div className="card card-b" style={{ background: 'var(--surface-2)' }}>
                  <div className="row faint small" style={{ marginBottom: 6 }}><IconBuildingBank size={14} /> Bank account holder · {sel.bank}</div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}><Tokens name={sel.bankName} other={sel.discomName} /></div>
                  <div className="faint small" style={{ marginTop: 6 }}>From passbook / cancelled cheque</div>
                </div>
              </div>
              <div className="row small" style={{ flexWrap: 'wrap' }}>
                <IconId size={15} className="faint" /> Aadhaar name: <b>{sel.aadhaarName}</b>
                <span style={{ marginLeft: 'auto' }}>Token match <span className="mono">{sel.score}%</span></span>
                {sel.match ? <Pill status="done">Match</Pill> : sel.resolution ? <Pill status="in_progress">{sel.resolution}</Pill> : <Pill status="blocked">Mismatch</Pill>}
              </div>
              <div className="row small faint" style={{ gap: 12 }}><span><span style={{ color: 'var(--violet)' }}>■</span> partial (initial / “bhai”)</span><span><span style={{ color: 'var(--coral)' }}>■</span> not found</span><span>order swap −10%</span></div>
              <div className="bar"><i style={{ width: sel.score + '%', background: sel.score >= 90 ? 'var(--accent)' : sel.score >= 60 ? 'var(--violet)' : 'var(--coral)' }} /></div>
              {!sel.match && (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="faint small" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Resolve</div>
                  {RES.map((r) => (
                    <button key={r.id} className="btn" style={{ height: 'auto', padding: '10px 12px', justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }} disabled={ro} onClick={() => resolve(r.id)}>
                      <r.icon size={17} />
                      <span><div>{r.id}</div><div className="faint small" style={{ fontWeight: 400 }}>{r.hint}</div></span>
                    </button>
                  ))}
                </div>
              )}
              <div className="row small faint"><IconFileText size={14} /> Documents compared: Electricity bill, Bank passbook, Aadhaar (Drive folder {sel.crn})</div>
            </div>
          </div>
        ) : <div className="card"><Empty>Select a customer.</Empty></div>}
      </div>
    </div>
  );
}
