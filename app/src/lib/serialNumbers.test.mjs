import assert from 'node:assert/strict';
import {cleanSerials,serialStatus} from './serialNumbers.js';
const result=cleanSerials({modules:[' panel-01 ','PANEL-01','','panel-02'],inverter:' inv-01 '});
assert.deepEqual(result,{modules:['PANEL-01','PANEL-02'],inverter:'INV-01'});
assert.equal(serialStatus({kwp:3,warranty:{moduleWp:550}},result),'in_progress','partial scan must not complete installation records');
assert.equal(serialStatus({kwp:1,warranty:{moduleWp:550}},result),'done');
assert.equal(serialStatus({kwp:1},{modules:[],inverter:''}),'not_started');
assert.throws(()=>cleanSerials({modules:['ONE\nTWO']}),/one serial/);
console.log('Serial normalization and partial-scan completion checks passed');
