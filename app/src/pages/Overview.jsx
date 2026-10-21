import { Link } from 'react-router-dom';
import * as api from '../data/api.js';
import { useData, useSession, inrK } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import {
  IconSun, IconStairs, IconPuzzle, IconHome2, IconBuildingSkyscraper, IconBuildingFactory, IconBuildingStore, IconAlertTriangle,
  IconFileText, IconCurrencyRupee, IconTool, IconBolt, IconHeartHandshake, IconArrowRight,
} from '@tabler/icons-react';
import { PageHead, Empty, CustomerLine, RecentStrip, SecTitle, IconChip, stageChipTone } from '../components/ui.jsx';
import Board from '../components/Board.jsx';
import { KpiRow } from '../components/Dash.jsx';

const TRACK_LOOK = { sales: [IconFileText, 'violet'], finance: [IconCurrencyRupee, 'green'], supply: [IconTool, 'orange'], grid: [IconBolt, 'blue'], closure: [IconHeartHandshake, 'sun'] };
const SEG_LOOK = { Residential: [IconHome2, 'orange'], Commercial: [IconBuildingSkyscraper, 'blue'], Industrial: [IconBuildingFactory, 'violet'] };

const PARTS = [
  ['blocked', 'Stuck'], ['waiting_customer', 'Waiting on customer'], ['waiting_third', 'Waiting on others'], ['in_progress', 'Being worked on'], ['done', 'Finished'], ['not_started', 'Not started'],
];

/** Overview: today's board, the five-part pulse (from v1), milestone funnel, branch split and most-stuck list. */
export default function Overview() {
  const session = useSession();
  const [o] = useData(() => api.getOverview(), [session.role, session.branch, session.cpoId]);
  const [recent] = useData(() => api.listRecent(), [session.role]);
  if (!o) return <div className="page"><Empty>Loading…</Empty></div>;
  const max = Math.max(1, o.total);
  const partner = session.role === 'CPO';
  return (
    <div className="page">
      <PageHead title="Overview" sub={`The big picture for ${o.total} customers${session.branch !== 'All' ? ' in ' + session.branch : ''}${partner ? ' of your partner office' : ''}: where every job stands and where it is stuck.`} />
      <KpiRow />
      <RecentStrip rows={recent} />
      {!partner && (
        <>
          <SecTitle icon={IconSun} tone="orange" title="Today" desc="The same board office staff see on their home screen." />
          <Board kind="office" perPart={3} />
        </>
      )}

      <SecTitle icon={IconStairs} tone="violet" title="Customers by stage" desc="Where every customer is right now, stage 1 to 11. Click a stage to see those customers." />
      <div className="card funnel">
        {o.stages.map((f, i) => {
          const St = api.meta.STAGES[i].icon;
          return (
          <Link key={f.id} to={`/projects?stage=${f.id}`} className={'fn-row fn-link t-' + stageChipTone(i + 1)}>
            <span className="fn-l"><span className="fn-ico"><St size={15} stroke={2} /></span><span className="ell">{f.label}</span></span>
            <span className="fn-bar"><i style={{ width: `${(f.count / Math.max(1, ...o.stages.map((x) => x.count))) * 100}%` }} /></span>
            <span className="fn-n num">{f.count}</span>
          </Link>
          );
        })}
      </div>

      <SecTitle icon={IconPuzzle} tone="blue" title="Five parts of every job" desc="Each job moves on five parts at the same time. Each tile counts customers by the worst state in that part." />
      <div className="tiles">
        {o.tracks.map((t) => {
          const c = t.counts;
          const [ti, tt] = TRACK_LOOK[t.key] || [IconPuzzle, 'orange'];
          return (
            <div key={t.key} className="tile">
              <div className="row"><IconChip icon={ti} tone={tt} size="sm" /><h3>{t.label}</h3></div>
              <div className="tile-figs">
                <div className="fig red"><b>{c.blocked}</b><small>Stuck</small></div>
                <div className="fig"><b>{c.waiting_customer + c.waiting_third}</b><small>Waiting</small></div>
                <div className="fig"><b>{c.in_progress}</b><small>Active</small></div>
                <div className="fig ok"><b>{c.done}</b><small>Done</small></div>
              </div>
              <div className="stackbar" aria-hidden>{PARTS.map(([k]) => c[k] > 0 && <span key={k} className={'st-' + k} style={{ flex: c[k] }} />)}</div>
            </div>
          );
        })}
      </div>
      <div className="legend">{PARTS.map(([k, l]) => <span key={k}><i className={'st-' + k} />{l}</span>)}</div>

      <SecTitle icon={IconHome2} tone="orange" title="Residential, commercial and industrial" desc="How the customers split by type of site." />
      <div className="comm-strip">{o.segments.map((s) => { const [si, st] = SEG_LOOK[s.name] || [IconHome2, 'orange']; return <div key={s.name} className={'cs t-' + st}><IconChip icon={si} tone={st} /><span>{s.name}</span><b className="num">{s.count}</b><small>{Math.round(s.kwp).toLocaleString('en-IN')} kWp{o.showMoney ? ' · ' + inrK(s.value) : ''}</small></div>; })}</div>

      <div className="grid2" style={{ marginTop: 22 }}>
        <div>
          <SecTitle icon={IconBuildingStore} tone="blue" title="Branches" desc={`Customers, capacity${o.showMoney ? ', money due' : ''} and problems per branch.`} />
          <div className="card tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Branch</th><th className="r">Customers</th><th className="r">kWp</th>{o.showMoney && <th className="r">Due</th>}<th className="r">Stuck</th><th className="r">Late</th></tr></thead>
              <tbody>{o.branches.map((b) => <tr key={b.name}><td>{b.name}</td><td className="r num">{b.count}</td><td className="r num">{Math.round(b.kwp)}</td>{o.showMoney && <td className="r num">{inrK(b.due)}</td>}<td className="r num" style={{ color: b.stuck ? 'var(--red)' : undefined }}>{b.stuck}</td><td className="r num">{b.late}</td></tr>)}</tbody>
            </table>
            {o.branches.length === 0 && <Empty hint="Branches appear once customers are added.">No customers yet.</Empty>}
          </div>
        </div>
        <div>
          <SecTitle icon={IconAlertTriangle} tone="rose" title="Most stuck customers" desc="Waiting the longest on one step. Click for a quick look." />
          <div className="card">
            {o.stuck.map((r) => <CustomerLine key={r.id} r={r} right={<span className="late-badge">{r.stuckDays} days</span>} />)}
            {o.stuck.length === 0 && <Empty hint="Customers waiting on a step show up here.">Nobody is stuck.</Empty>}
            {pageAllowed('projects', session.role) && <div className="card-b"><Link className="see-all" to="/projects?view=stuck">Open the full “Most stuck” list <IconArrowRight size={13} /></Link></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
