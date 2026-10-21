import { useEffect, useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconChevronDown } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useData, useSession } from '../lib/hooks.jsx';

export default function ProjectStageMenu({ module }) {
  const location = useLocation();
  const menuId = useId();
  const session = useSession();
  const active = location.pathname === module.to;
  const [expanded, setExpanded] = useState(active);
  const [counts] = useData(
    () => expanded ? api.stageCounts() : Promise.resolve([]),
    [expanded, session.role, session.branch],
  );
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active, location.search]);
  const selected = new URLSearchParams(location.search).get('stage') || api.meta.STAGES[0].id;
  const Icon = module.icon;
  return <div className="project-stage-menu">
    <button type="button" className={'rail-btn' + (active ? ' active' : '')}
      aria-expanded={expanded} aria-controls={menuId}
      onClick={() => setExpanded(value => !value)}>
      <span className={'nav-ico t-' + module.tone}><Icon size={17} stroke={1.9} /></span>
      <span className="rail-lbl">{module.label}</span>
      <IconChevronDown size={14} className={expanded ? 'expanded' : ''} />
    </button>
    {expanded && <nav id={menuId} className="main-project-stages" aria-label="Project stages">
      {api.meta.STAGES.map((stage, index) => {
        const current = active && selected === stage.id;
        const count = counts?.find(row => row.id === stage.id)?.count;
        return <NavLink key={stage.id} to={`${module.to}?stage=${stage.id}`}
          className={'main-project-stage' + (current ? ' selected' : '')}
          aria-current={current ? 'page' : undefined}>
          <span className="main-stage-number">{index + 1}</span>
          <span>{stage.label}</span>
          <small>{count ?? '—'}</small>
        </NavLink>;
      })}
    </nav>}
  </div>;
}
