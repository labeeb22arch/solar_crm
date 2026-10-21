import assert from 'node:assert/strict';
import { lastCustomerUpdate } from './customerUpdates.js';
const now=Date.parse('2026-10-21T12:00:00Z');
assert.equal(lastCustomerUpdate({createdAt:'2026-01-01',timeline:[{at:'2026-10-20T10:00:00Z'}],tracks:{supply:[{updatedAt:'2026-11-01'}]}},now),'2026-10-20T10:00:00.000Z');
assert.equal(lastCustomerUpdate({createdAt:'2026-01-01',payments:[{date:'2026-01-02',recordedAt:'2026-10-21T10:00:00Z'}]},now),'2026-10-21T10:00:00.000Z');
assert.equal(lastCustomerUpdate({timeline:[{at:'invalid'}]},now),null);
console.log('Recent customer activity checks passed');
