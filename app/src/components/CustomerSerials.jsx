import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";
import * as api from "../data/api.js";
import { useToast } from "../lib/hooks.jsx";
import SerialScanner from "./SerialScanner.jsx";
export default function CustomerSerials({ project: p }) {
  const [editing, setEditing] = useState(false),
    [modules, setModules] = useState([]),
    [inverter, setInverter] = useState(""),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toast = useToast();
  const add = (serial) => {
    const clean = serial.trim().toUpperCase();
    if (!clean) return;
    setModules((list) => (list.includes(clean) ? list : [...list, clean]));
  };
  const begin = () => {
    setModules([...(p.serials?.modules || [])]);
    setInverter(p.serials?.inverter || "");
    setEditing(true);
    setError("");
  };
  return (
    <details className="card customer-info-section">
      <summary>
        <div>
          <strong>Serial numbers</strong>
          <small>
            {p.serials?.modules?.length || 0} panel serials
            {p.serials?.inverter ? " · Inverter recorded" : ""}
          </small>
        </div>
        {api.canDo("field") && (
          <button
            className="btn icon ghost sm section-pencil"
            aria-label="Edit serial numbers"
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.closest("details").open = true;
              begin();
            }}
          >
            <IconPencil size={16} />
          </button>
        )}
        <span>⌄</span>
      </summary>
      <div className="card-b">
        {editing ? (
          <>
            <SerialScanner
              disabled={busy}
              onSerial={(serial, target) =>
                target === "inverter"
                  ? setInverter(serial.trim().toUpperCase())
                  : add(serial)
              }
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add(value);
                setValue("");
              }}
              className="row"
              style={{ gap: 8, margin: "16px 0" }}
            >
              <input
                className="input"
                aria-label="Type panel serial"
                placeholder="Type panel serial"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button className="btn" disabled={busy || !value.trim()}>
                Add
              </button>
            </form>
            <label className="fld">
              <span>Inverter serial number</span>
              <input
                className="input"
                value={inverter}
                onChange={(e) => setInverter(e.target.value.toUpperCase())}
              />
            </label>
            <ul className="customer-serial-edit-list">
              {modules.map((serial) => (
                <li key={serial}>
                  <span>{serial}</span>
                  <button
                    className="btn sm ghost"
                    disabled={busy}
                    onClick={() =>
                      setModules((list) => list.filter((s) => s !== serial))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {error && (
              <p className="form-err" role="alert">
                {error}
              </p>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api.saveSerials(p.id, { modules, inverter });
                    setEditing(false);
                    toast("Serial numbers saved");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save serial numbers
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Panels</h3>
            {p.serials?.modules?.length ? (
              <ol className="warranty-serials">
                {p.serials.modules.map((serial) => (
                  <li key={serial}>{serial}</li>
                ))}
              </ol>
            ) : (
              <p className="small faint">
                Add panel serial numbers using the pencil above.
              </p>
            )}
            <h3>Inverter</h3>
            <p>{p.serials?.inverter || "—"}</p>
          </>
        )}
      </div>
    </details>
  );
}
