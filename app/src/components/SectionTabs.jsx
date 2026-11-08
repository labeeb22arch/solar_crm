import { NavLink, Navigate } from 'react-router-dom';
import { useSession } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';

// Pages that left the side menu (ADR 0011) live as tabs inside their parent page.
// Each entry: [page key in access.js, address, label].
export const SECTION_TABS = {
  customers: [['projects', '/projects', 'Active customers'], ['warranty', '/completed', 'Completed'], ['trash', '/trash', 'Trash']],
  documents: [['documents', '/documents', 'Documents'], ['name_check', '/name-check', 'Name check']],
  team: [['attendance', '/team/attendance', 'Attendance'], ['users', '/team/users', 'Users & roles'], ['chat', '/chat', 'Team chat'], ['activity', '/activity', 'Activity log']],
};

export const tabsFor = (group, role) => (SECTION_TABS[group] || []).filter(([page]) => pageAllowed(page, role));

export default function SectionTabs({ group, label, children }) {
  const { role } = useSession();
  const tabs = tabsFor(group, role);
  return <>{tabs.length > 1 && <nav className="materials-tabs" aria-label={label}>{tabs.map(([page, to, text]) => <NavLink key={page} to={to} end>{text}</NavLink>)}</nav>}{children}</>;
}

/** `/team` opens the first Team tab this role may see. */
export function TeamHome() {
  const { role } = useSession();
  const first = tabsFor('team', role)[0];
  return <Navigate to={first ? first[1] : '/more'} replace />;
}
