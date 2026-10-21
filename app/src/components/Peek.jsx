import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconX, IconArrowRight, IconLock, IconEye, IconStairs, IconListDetails, IconMapPin, IconSolarPanel } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession } from '../lib/hooks.jsx';
import { canDo } from '../data/api.js';
import { StatusLine, NextStep, StagePath, KeyFacts, Empty, Avatar, IconChip } from './ui.jsx';

/** Quick-peek side panel: key facts, status, next step, stage — and a link to the full record. */
export default function Peek({ id, onClose }) {
  const [p, loading] = useData(() => api.getProject(id), [id]);
  const session = useSession();
  const nav = useNavigate();
  useEffect(() => { if (p && !p.forbidden && !p.notFound) api.markOpened(p.id); }, [p?.id]); // eslint-disable-line
  const open = () => { onClose(); nav('/p/' + id); };
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="peek" aria-label="Customer quick look">
        <div className="peek-bar">
          <span className="peek-title"><IconEye size={15} />Quick look</span>
          <div className="grow" />
          <button className="btn sm ghost" onClick={onClose} aria-label="Close"><IconX size={15} /> Close</button>
        </div>
        <div className="peek-body">
          {loading ? <Empty>Loading…</Empty> : p.forbidden || p.notFound ? (
            <Empty icon={IconLock} hint="Search only shows customers you are allowed to see.">This customer is not in your list.</Empty>
          ) : (
            <>
              <div className="peek-hero">
                <div className="peek-head">
                  <Avatar name={p.name} size="xl" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <h2>{p.name}</h2>
                    <div className="rec-eyebrow"><span className="crn-chip">{p.crn}</span></div>
                    <div className="rec-ids"><span className="fact-chip"><IconMapPin size={13} />{p.city}</span><span className="fact-chip"><IconSolarPanel size={13} />{p.kwp} kWp</span></div>
                  </div>
                </div>
                <StatusLine s={p.summary} big />
                <NextStep next={p.summary.next} />
              </div>
              <div className="peek-sec"><IconChip icon={IconStairs} tone="violet" size="sm" />Progress</div>
              <StagePath s={p.summary} compact />
              <div className="peek-sec"><IconChip icon={IconListDetails} tone="blue" size="sm" />Key facts</div>
              <KeyFacts s={p.summary} showMoney={session.role !== 'Technician' && session.role !== 'Installation Team' && session.role !== 'Stamp Staff' || canDo('internal_money')} />
              <button className="btn primary big-btn" style={{ marginTop: 14 }} onClick={open}>Open full record <IconArrowRight size={16} /></button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
