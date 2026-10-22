import assert from 'node:assert/strict';
import { generate } from '../data/seed.js';
import { createDemoExpansion, missingDemoRecords, DEMO_PACK } from './demoExpansion.js';
const ids=['leads','pending_loans','material_procurement','pending_installation','post_installation_docs','discom_submissions','meter_installation','system_commissioning','meter_flag','discom_inspection','completed'];
const stages=ids.map(id=>({id,label:id}));
const templates=generate(),before=JSON.stringify(templates);
const rows=createDemoExpansion(templates,stages,'2026-10-22T12:00:00Z');
assert.equal(rows.length,44);
for(const id of ids)assert.equal(rows.filter(p=>p.stage===id).length,4);
assert.equal(new Set(rows.map(p=>p.id)).size,44);
assert.equal(JSON.stringify(templates),before);
assert.equal(missingDemoRecords(rows,rows).length,0);
assert.equal(missingDemoRecords([rows[0]],rows).length,43);
for(const p of rows){
 assert.equal(p.demoPack,DEMO_PACK);assert.ok(p.name.startsWith('Demo · '));
 assert.ok(p.payments.reduce((s,r)=>s+r.amount,0)<=p.value);
 assert.equal(p.signature,null);assert.equal(p.signRequest,null);assert.equal(p.proposalRequest,null);
 assert.deepEqual(p.docLinks,{});
 if(p.stage==='completed'){assert.equal(p.payments.reduce((s,r)=>s+r.amount,0),p.value);assert.ok(p.serials.modules.length);assert.equal(p.warranty.workmanshipYears,5);}
}
console.log('44 additive demo records, all stages, data consistency and idempotency passed');
