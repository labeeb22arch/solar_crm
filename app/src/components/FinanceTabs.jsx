import { NavLink } from 'react-router-dom';
import { useSession } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
const TABS=[['finance','/finance','Overview'],['finance','/finance/received','Payments received'],['loan_tracking','/money/loans','Loans'],['subsidy_tracking','/money/subsidy','Subsidy'],['cp_comm','/money/cp','Partner commission'],['inst_comm','/money/install','Installation commission']];
export default function FinanceTabs({children}) {const {role}=useSession();return <><nav className="materials-tabs" aria-label="Finance">{TABS.filter(([page])=>pageAllowed(page,role)).map(([,to,label])=><NavLink end key={to} to={to}>{label}</NavLink>)}</nav>{children}</>;}
