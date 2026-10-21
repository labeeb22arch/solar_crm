import assert from 'node:assert/strict';
import { nextStage,confirmedNextStage } from './stageProgress.js';
const stages = [{ id: 'lead' }, { id: 'installation' }, { id: 'completed' }];
assert.equal(nextStage(stages, 'lead').id, 'installation');
assert.equal(nextStage(stages, 'installation').id, 'completed');
assert.equal(nextStage(stages, 'completed'), null);
assert.equal(nextStage(stages, 'unknown'), null);
console.log('Sequential stage boundary checks passed');

assert.equal(confirmedNextStage(stages,'lead','lead').id,'installation');
assert.throws(()=>confirmedNextStage(stages,'lead'),/confirm/);
assert.throws(()=>confirmedNextStage(stages,'installation','lead'),/changed/);
assert.throws(()=>confirmedNextStage(stages,'completed','completed'),/final/);
