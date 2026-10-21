import assert from "node:assert/strict";
import { archiveCustomer, restoreArchivedCustomer } from "./customerArchive.js";
const original = {
  id: "test",
  stage: "pending_loans",
  payments: [{ amount: 100 }],
  serials: { modules: ["P1"], inverter: "I1" },
  docLinks: { bill: { url: "https://example.com" } },
  timeline: [{ text: "Created" }],
  signRequest: { status: "sent", expiresAt: "2030-01-01" },
};
const archived = archiveCustomer(original, {
  reason: "Cancelled",
  at: "2026-10-22T09:00:00Z",
  by: "Office",
});
assert.equal(original.deletedAt, undefined);
assert.equal(archived.signRequest.expiresAt, archived.deletedAt);
assert.deepEqual(archived.payments, original.payments);
assert.deepEqual(archived.serials, original.serials);
assert.deepEqual(archived.timeline, original.timeline);
assert.throws(() => archiveCustomer(original, { reason: " " }), /reason/);
const restored = restoreArchivedCustomer(archived, {
  at: "2026-10-22T10:00:00Z",
  by: "Admin",
});
assert.equal(restored.deletedAt, undefined);
assert.equal(restored.stage, original.stage);
assert.deepEqual(restored.docLinks, original.docLinks);
assert.deepEqual(restored.payments, original.payments);
assert.equal(restored.trashHistory.length, 1);
assert.equal(
  restored.signRequest.expiresAt,
  archived.deletedAt,
  "Restoring does not silently reactivate an old signing link",
);
console.log(
  "Archive/restore preserves customer data and revokes pending links",
);
