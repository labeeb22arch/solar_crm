import assert from 'node:assert/strict';
import {generate} from '../data/seed.js';
import {createDemoShowcase,SHOWCASE_PACK} from './demoShowcase.js';
import {missingDemoRecords} from './demoExpansion.js';
import {documentInboxEntry} from './documentInbox.js';
import {computeProposal} from '../docs/proposal/calc.js';
const stages=['leads','pending_loans','material_procurement','pending_installation','post_installation_docs','discom_submissions','meter_installation','system_commissioning','meter_flag','discom_inspection','completed'].map(id=>({id,label:id}));
const templates=generate(),before=JSON.stringify(templates);
const rows=createDemoShowcase(templates,stages,'2026-10-26T12:00:00Z');
assert.equal(JSON.stringify(templates),before,'source records are untouched');
assert.equal(rows.length,66);assert.equal(new Set(rows.map(p=>p.id)).size,66);
for(const stage of stages)assert.equal(rows.filter(p=>p.stage===stage.id).length,6);
assert.equal(missingDemoRecords(rows,rows).length,0);
const buckets=new Set();
for(const p of rows){
 assert.equal(p.demoPack,SHOWCASE_PACK);assert.equal(p.demoOnly,true);assert.ok(p.name.startsWith('Demo · '));assert.ok(p.email.endsWith('@example.invalid'));
 assert.ok(p.notes.length>=2);assert.deepEqual(p.docLinks,{});
 assert.ok(p.payments.reduce((sum,r)=>sum+r.amount,0)<=p.value);
 for(const kind of ['loan','subsidy'])if(p.financeTracking[kind]){const t=p.financeTracking[kind];assert.equal(t.status,t.history.at(-1).status);assert.ok(t.history.every(e=>e.id&&e.by&&e.at&&e.date));}
 for(const key of ['quote','agreement']){const inbox=documentInboxEntry(p,key,Date.parse('2026-10-26T12:00:00Z'));if(inbox)buckets.add(key+':'+inbox.bucket);}
 for(const r of [p.signRequest,p.proposalRequest].filter(Boolean)){assert.equal(r.demoOnly,true);assert.ok(r.token.startsWith('demo-only-'));}
 for(const r of [p.signature,p.proposal?.accepted].filter(Boolean)){assert.equal(r.demoOnly,true);assert.equal(r.method,'demo');assert.ok(r.png.startsWith('data:image/png;base64,'));}
 if(p.proposal)assert.equal(computeProposal(p.proposal.inputs).price,p.value);
 if(p.stage==='completed'){assert.equal(p.payments.reduce((sum,r)=>sum+r.amount,0),p.value);assert.ok(p.serials.modules.length);}
}
for(const bucket of ['quote:waiting','quote:received','agreement:waiting','agreement:received'])assert.ok(buckets.has(bucket));
console.log('66 additive demo customers: every stage, tracking histories and sent/received document fixtures passed');
