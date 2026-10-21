import * as api from '../data/api.js';
import { useData, useSession, useToast, useUi } from '../lib/hooks.jsx';
import { PageHead, Empty, StatusLine, RecentStrip, Avatar } from '../components/ui.jsx';

/** Stamp Staff home: agreements to sign and stamp paper to prepare. Nothing else. */
export default function StampQueue() {
  const session = useSession();
  const [inbox] = useData(() => api.getStampQueue(), [session.role, session.branch]);
  const [recent] = useData(() => api.listRecent(), [session.role]);
  const toast = useToast();
  const ui = useUi();
  const run = async (action, pid, name) => { try { await api.runAction(action, [pid]); toast(`${api.ACTION_LABELS[action]} · ${name}`); } catch (e) { toast(e.message); } };
  if (!inbox) return <div className="page"><Empty>Loading…</Empty></div>;
  const total = inbox.queues.reduce((s, q) => s + q.rows.length, 0);
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Stamp queue" sub={`${total} item${total === 1 ? '' : 's'} waiting. Mark each one when the agreement is signed or the stamp paper is ready — it then leaves your list.`} />
      <RecentStrip rows={recent} />
      {inbox.queues.map((q) => (
        <section key={q.key} className="card queue" style={{ marginBottom: 16 }}>
          <div className="queue-h" style={{ cursor: 'default' }}><h3>{q.rows.length} {q.title.toLowerCase()}</h3></div>
          {q.rows.length === 0 && <Empty hint="New items appear here as soon as a customer reaches this step.">Nothing waiting here.</Empty>}
          {q.rows.map((r) => (
            <div key={r.pid} className="stamp-row">
              <button className="cl-main stamp-who" onClick={() => ui.openCustomer(r.pid)} title={`Quick look: ${r.name}`}>
                <span className="cl-name"><Avatar name={r.name} size="sm" />{r.name}</span>
                <span className="cl-meta">{r.crn} · {r.city} · {r.reason} · waiting {r.age === 0 ? 'since today' : r.age + ' days'}</span>
                <StatusLine s={{ sentence: r.sentence, tone: '' }} />
              </button>
              <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {q.secondary && <button className="btn primary" onClick={() => run(q.secondary.id, r.pid, r.name)}>{q.secondary.label}</button>}
                <button className={'btn' + (q.secondary ? '' : ' primary')} onClick={() => run(q.primary.id, r.pid, r.name)}>{q.primary.label}</button>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
