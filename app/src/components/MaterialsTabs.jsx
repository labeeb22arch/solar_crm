import { NavLink } from 'react-router-dom';
import { useSession } from '../lib/hooks.jsx';
import { pageAllowed } from '../lib/access.js';
export default function MaterialsTabs({children}) {
 const s=useSession();
 return <><nav className="materials-tabs" aria-label="Materials and installation">{[['installs','/installs','Installation'],['inventory','/supply/inventory','Inventory'],['bom','/supply/bom','Material procurement'],['challan','/supply/challan','Delivery batches']].filter(([p])=>pageAllowed(p,s.role)).map(([p,to,label])=><NavLink key={p} to={to}>{label}</NavLink>)}</nav>{children}</>;
}
