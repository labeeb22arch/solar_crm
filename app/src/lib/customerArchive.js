export function archiveCustomer(record, { reason, at, by }) {
  const why = String(reason || "").trim();
  if (!why) throw new Error("Enter a reason");
  if (record.deletedAt) throw new Error("Customer is already in Trash");
  const next = structuredClone(record);
  next.deletedAt = at;
  next.deletedBy = by;
  next.deletedReason = why.slice(0, 2000);
  for (const key of ["signRequest", "proposalRequest"])
    if (next[key] && next[key].status !== "signed") next[key].expiresAt = at;
  return next;
}
export function restoreArchivedCustomer(record, { at, by }) {
  if (!record.deletedAt) throw new Error("Customer is not in Trash");
  const next = structuredClone(record);
  next.trashHistory ||= [];
  next.trashHistory.push({
    at: next.deletedAt,
    by: next.deletedBy,
    reason: next.deletedReason,
    restoredAt: at,
    restoredBy: by,
  });
  delete next.deletedAt;
  delete next.deletedBy;
  delete next.deletedReason;
  return next;
}
