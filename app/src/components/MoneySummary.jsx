import * as api from '../data/api.js';
import {inr} from '../lib/hooks.jsx';

export default function MoneySummary({total,collected,outstanding,label='Money summary'}) {
 if(!api.canDo('internal_money'))return null;
 return <section className="finance-metrics" aria-label={label}>{[['Total project value',total],['Money collected',collected],['Money outstanding',outstanding]].map(([title,value])=><div className="card card-b" key={title}><span className="small faint">{title}</span><h2>{inr(value)}</h2></div>)}</section>;
}
