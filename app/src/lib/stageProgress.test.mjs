import assert from 'node:assert/strict';
import { nextStage } from './stageProgress.js';
const stages = [{ id: 'lead' }, { id: 'installation' }, { id: 'completed' }];
assert.equal(nextStage(stages, 'lead').id, 'installation');
assert.equal(nextStage(stages, 'installation').id, 'completed');
assert.equal(nextStage(stages, 'completed'), null);
assert.equal(nextStage(stages, 'unknown'), null);
console.log('Sequential stage boundary checks passed');
