import assert from 'node:assert/strict';
import { pipelineUrl, needsAttention, recentProjects, currentStageTask } from './projectPipeline.js';
assert.equal(pipelineUrl({id:'p1',stage:'completed'}),'/p/p1?tab=overview&work=completed');
assert.equal(pipelineUrl({id:'p1',stage:'material_procurement'}),'/p/p1?tab=overview&work=bom');
assert.equal(pipelineUrl({id:'p1',stage:'pending_installation'}),'/p/p1?stage=open');
assert.equal(pipelineUrl({id:'p1',stage:'leads'}),'/p/p1?tab=documents');
assert.equal(pipelineUrl({id:'p1',stage:'pending_loans'}),'/p/p1?tab=finance');
assert.equal(needsAttention({next:{status:'blocked'}}),true);
assert.equal(needsAttention({next:{overdue:true}}),true);
assert.equal(needsAttention({next:null}),false);
const rows=[{id:'old',updatedAt:'2026-10-01'},{id:'new',updatedAt:'2026-10-22'}];
assert.deepEqual(recentProjects(rows).map(r=>r.id),['new','old']);
assert.equal(rows[0].id,'old');
console.log('Pipeline destinations, attention and recent ordering passed');

const tracks={sales:[{key:'quotation',status:'waiting_customer'}],supply:[{key:'installation',status:'in_progress'}]};
assert.equal(currentStageTask(tracks,'pending_installation').key,'installation');
assert.equal(currentStageTask(tracks,'leads').key,'quotation');
assert.equal(currentStageTask(tracks,'completed'),null);
assert.equal(currentStageTask(tracks,'pending_installation',['installation']),null);
assert.equal(needsAttention({stageNext:null,next:{overdue:true}}),false);

// One progress model: every working stage belongs to exactly one phase, in order.
import { PHASES, phaseIndex } from './projectPipeline.js';
import { STAGE_IDS } from './stages.js';
const grouped = PHASES.flatMap((p) => p.stages);
assert.deepEqual(grouped, STAGE_IDS, 'phases cover all 11 stages once, in pipeline order');
assert.equal(phaseIndex('leads'), 0);
assert.equal(phaseIndex('pending_installation'), 2);
assert.equal(phaseIndex('meter_flag'), 3);
assert.equal(phaseIndex('completed'), 4);
console.log('Phase grouping checks passed');
