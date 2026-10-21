import { Link } from 'react-router-dom';
import {
  IconArrowRight, IconSparkles, IconTool, IconCircleCheck, IconBolt, IconCurrencyRupee, IconBuildingBank, IconTrophy, IconPhoneCall, IconFiles, IconUserPlus, IconBarcode,
} from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
import { CustomerLine, Empty, IconChip } from './ui.jsx';

const SEC_LOOK = {
  new: [IconSparkles, 'violet'], install: [IconTool, 'orange'], done: [IconCircleCheck, 'green'], discom: [IconBolt, 'blue'], money: [IconCurrencyRupee, 'green'],
  subsidy: [IconBuildingBank, 'sun'], closed: [IconTrophy, 'blue'], p_call: [IconPhoneCall, 'rose'], p_docs: [IconFiles, 'violet'], p_install: [IconTool, 'orange'],
  p_new: [IconUserPlus, 'sun'], f_today: [IconTool, 'orange'], f_serials: [IconBarcode, 'violet'],
};

/**
 * Plain-language board: named sections, each a sentence with a count and a short list of customers.
 * Clicking a customer opens the quick look; "See all" opens the full list pre-filtered.
 */
export default function Board({ kind = 'office', perPart = 5, seeAllBase }) {
  const session = useSession();
  const [sections] = useData(() => api.getBoard(kind, perPart), [kind, session.role, session.branch, session.cpoId, session.cpId, session.dealerId, session.teamId, session.technician]);
  if (!sections) return <Empty>Loading…</Empty>;
  const base = seeAllBase || (pageAllowed('projects', session.role) ? '/projects?board=' : null);
  return (
    <div className="board">
      {sections.map((sec) => {
        const [icon, tone] = SEC_LOOK[sec.key] || [IconSparkles, 'orange'];
        return (
        <section key={sec.key} className={'card board-sec t-' + tone} aria-labelledby={'b-' + sec.key}>
          <header className="board-h">
            <IconChip icon={icon} tone={tone} />
            <div className="grow" style={{ minWidth: 0 }}>
              <h2 id={'b-' + sec.key}>{sec.title}</h2>
              <p>{sec.desc}</p>
            </div>
            <span className={'board-total' + (sec.total ? '' : ' zero-n')} aria-label={`${sec.total} in total`}>{sec.total}</span>
          </header>
          {sec.parts.map((pt) => (
            <div key={pt.key} className={'board-part' + (pt.count ? '' : ' empty')}>
              <div className="bp-h">
                <h3><b className="bp-n">{pt.count}</b> {pt.sentence.replace(/^\d+ /, '')}</h3>
                {pt.count > pt.rows.length && base && <Link className="see-all" to={base + pt.key}>See all {pt.count} <IconArrowRight size={13} /></Link>}
              </div>
              {pt.count === 0 ? <div className="bp-none">Nothing here right now.</div> : (
                <div className="bp-rows">{pt.rows.map((r) => <CustomerLine key={r.id} r={r} note={r.note} />)}</div>
              )}
            </div>
          ))}
        </section>
        );
      })}
    </div>
  );
}
