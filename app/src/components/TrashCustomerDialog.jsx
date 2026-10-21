import { useModalFocus } from "../lib/useModalFocus.js";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../data/api.js";
export default function TrashCustomerDialog({ project, onClose }) {
  const nav = useNavigate();
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef(null);
  useModalFocus(dialog, onClose, busy);
  return (
    <>
      <div
        className="overlay"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <form
        ref={dialog}
        className="decision-dialog card card-b"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trash-title"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api.trashCustomer(project.id, reason);
            nav("/trash");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="trash-title">Move customer to Trash?</h2>
        <p>
          {project.name} · {project.crn}
        </p>
        <p className="small faint">
          The record and its payments, documents and history stay in the
          backend. You can restore it from Trash.
        </p>
        <label className="fld">
          <span>Reason</span>
          <textarea
            className="input"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: project cancelled"
          />
        </label>
        {error && (
          <p className="form-err" role="alert">
            {error}
          </p>
        )}
        <div className="row" style={{ gap: 10 }}>
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn primary" disabled={busy || !reason.trim()}>
            {busy ? "Moving…" : "Move to Trash"}
          </button>
        </div>
      </form>
    </>
  );
}
