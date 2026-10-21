import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../data/api.js";
import { useData, useSession, useToast, fdateY } from "../lib/hooks.jsx";
import { nextStage } from "../lib/stageProgress.js";
import { PageHead, Empty } from "../components/ui.jsx";
import StageMoveDialog from "../components/StageMoveDialog.jsx";
export default function ProjectManagement() {
  const session = useSession(),
    toast = useToast();
  const [rows] = useData(
    () => api.listProjects({}),
    [session.role, session.branch],
  );
  const [query, setQuery] = useState(""),
    [attention, setAttention] = useState(false),
    [moving, setMoving] = useState(null);
  const drag = useRef(null),
    columns = useRef({});
  const filtered = (rows || []).filter(
    (r) =>
      `${r.name} ${r.crn} ${r.city}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!attention || r.next?.overdue || r.next?.status === "blocked"),
  );
  const requestMove = (r, target) => {
    if (!api.canDo("edit")) return;
    const next = nextStage(api.meta.STAGES, r.stage);
    if (!next || next.id !== target) {
      toast("Move the customer to the next stage only.");
      return;
    }
    setMoving(r);
  };
  return (
    <div className="project-management">
      <PageHead
        title="Project Management"
        sub="Every project, grouped by stage. Confirm before moving a customer forward."
      />
      <div
        className="row"
        style={{ gap: 12, flexWrap: "wrap", marginBottom: 18 }}
      >
        <input
          className="input"
          style={{ flex: "1 1 240px" }}
          aria-label="Search project board"
          placeholder="Search customer, CRN or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="row small">
          <input
            type="checkbox"
            checked={attention}
            onChange={(e) => setAttention(e.target.checked)}
          />
          Needs attention
        </label>
      </div>
      <nav className="kanban-stage-jumps" aria-label="Jump to project stage">
        {api.meta.STAGES.map((s) => (
          <button
            className="btn sm"
            key={s.id}
            onClick={() =>
              columns.current[s.id]?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "start",
              })
            }
          >
            {s.label} · {filtered.filter((r) => r.stage === s.id).length}
          </button>
        ))}
      </nav>
      {!rows ? (
        <Empty>Loading projects…</Empty>
      ) : (
        <div className="project-kanban" aria-label="Project stages">
          {api.meta.STAGES.map((s) => (
            <section
              ref={(node) => (columns.current[s.id] = node)}
              className="kanban-column"
              key={s.id}
              aria-label={s.label}
              onDragOver={(e) => {
                if (api.canDo("edit")) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const row = filtered.find((r) => r.id === drag.current);
                drag.current = null;
                if (row) requestMove(row, s.id);
              }}
            >
              <header>
                <h2>{s.label}</h2>
                <span>{filtered.filter((r) => r.stage === s.id).length}</span>
              </header>
              {filtered
                .filter((r) => r.stage === s.id)
                .map((r) => (
                  <article
                    className="card card-b kanban-customer"
                    key={r.id}
                    draggable={
                      api.canDo("edit") && !!nextStage(api.meta.STAGES, r.stage)
                    }
                    onDragStart={(e) => {
                      drag.current = r.id;
                      e.dataTransfer.setData("text/plain", r.id);
                    }}
                    onDragEnd={() => (drag.current = null)}
                  >
                    <Link to={`/p/${r.id}`}>{r.name}</Link>
                    <p className="small faint">
                      {r.crn} · {r.city} · {r.kwp} kWp
                    </p>
                    <p className="small">
                      <span className="detail-label">Next open task</span>
                      <br />
                      {r.next?.text || "Project complete"}
                    </p>
                    {r.next?.overdue && (
                      <p className="small late-txt">{r.next.dueWords}</p>
                    )}
                    <small className="faint">
                      Updated {fdateY(r.updatedAt)}
                    </small>
                    {api.canDo("edit") &&
                      nextStage(api.meta.STAGES, r.stage) && (
                        <button
                          className="btn sm"
                          onClick={() =>
                            requestMove(
                              r,
                              nextStage(api.meta.STAGES, r.stage).id,
                            )
                          }
                        >
                          Move to next stage →
                        </button>
                      )}
                  </article>
                ))}
              {!filtered.some((r) => r.stage === s.id) && (
                <p className="small faint">No projects</p>
              )}
            </section>
          ))}
        </div>
      )}
      {moving && (
        <StageMoveDialog
          project={moving}
          onClose={() => setMoving(null)}
          onMoved={() => toast("Project stage updated")}
        />
      )}
    </div>
  );
}
