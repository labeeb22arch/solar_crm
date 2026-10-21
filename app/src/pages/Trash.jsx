import { useState } from "react";
import * as api from "../data/api.js";
import { useData, useSession, useToast, fdateY } from "../lib/hooks.jsx";
import { PageHead, Empty } from "../components/ui.jsx";
export default function Trash() {
  const session = useSession(),
    toast = useToast();
  const [rows] = useData(() => api.listTrash(), [session.role, session.branch]);
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const list = (rows || []).filter((r) =>
    `${r.name} ${r.crn}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHead
        title="Trash"
        sub="Removed customer records remain saved and can be restored."
      />
      <input
        className="input"
        style={{ maxWidth: 400, marginBottom: 20 }}
        aria-label="Search trash"
        placeholder="Search customer or CRN"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      {!rows ? (
        <Empty>Loading…</Empty>
      ) : !list.length ? (
        <Empty>Trash is empty.</Empty>
      ) : (
        list.map((r) => (
          <article className="card card-b trash-customer" key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <p className="small faint">
                {r.crn} · Removed {fdateY(r.deletedAt)} by {r.deletedBy}
              </p>
              <p>{r.reason}</p>
              <p className="small faint">
                Documents, payments, serial numbers and history are retained.
              </p>
            </div>
            <button
              className="btn"
              disabled={!!busy || !api.canDo("edit")}
              onClick={async () => {
                setBusy(r.id);
                setError("");
                try {
                  await api.restoreCustomer(r.id);
                  toast("Customer restored");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === r.id ? "Restoring…" : "Restore customer"}
            </button>
          </article>
        ))
      )}
    </div>
  );
}
