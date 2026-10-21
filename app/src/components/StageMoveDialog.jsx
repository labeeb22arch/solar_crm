import { useModalFocus } from "../lib/useModalFocus.js";
import { useRef, useState } from "react";
import * as api from "../data/api.js";
import { nextStage } from "../lib/stageProgress.js";
export default function StageMoveDialog({ project, onClose, onMoved }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef(null);
  useModalFocus(dialog, onClose, busy);
  const current = project.summary?.stage || project.stage;
  const next = nextStage(api.meta.STAGES, current);
  if (!next) return null;
  return (
    <>
      <div
        className="overlay"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <section
        ref={dialog}
        className="decision-dialog card card-b"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-stage-title"
      >
        <h2 id="move-stage-title">Move to next stage?</h2>
        <p>
          <strong>{project.name}</strong>
        </p>
        <p>
          {api.meta.STAGES.find((s) => s.id === current)?.label} →{" "}
          <strong>{next.label}</strong>
        </p>
        <p className="small faint">
          This updates the project stage and records the change in history. It
          does not mark tasks or payments complete.
        </p>
        {error && (
          <p className="form-err" role="alert">
            {error}
          </p>
        )}
        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          <button className="btn" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api.moveToNextStage(project.id, current);
                onMoved?.();
                onClose();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Moving…" : "Confirm move"}
          </button>
        </div>
      </section>
    </>
  );
}
