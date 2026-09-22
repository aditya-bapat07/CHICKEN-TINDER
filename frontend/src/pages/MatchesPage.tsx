import { useState } from "react";
import { Link } from "react-router-dom";
import { getMatches, patchMatch, shareMatch } from "../api";
import {
  Art,
  CopyField,
  Empty,
  ErrorMessage,
  Icon,
  Loading,
  LoadError,
  Modal,
  useLoad,
} from "../components/UI";
export default function MatchesPage() {
  const matches = useLoad(getMatches);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [shared, setShared] = useState("");
  async function update(id: string, status: "done" | "skipped") {
    setBusy(id);
    setError("");
    try {
      const m = await patchMatch(id, status);
      matches.setData((current) =>
        current?.map((item) => (item.id === id ? m : item)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function share(id: string) {
    setBusy(id);
    setError("");
    try {
      const result = await shareMatch(id);
      setShared(`${location.origin}/invite/${result.shareToken}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const filtered =
    matches.data?.filter((m) => filter === "all" || m.status === filter) || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your good-idea collection.</h1>
          <p>Plans you said yes to. Now comes the fun part.</p>
        </div>
        <Link className="btn small" to="/swipe">
          Find another <Icon name="plus" size={16} />
        </Link>
      </div>
      <div className="tabs">
        {[
          ["pending", "Up next"],
          ["done", "Completed"],
          ["skipped", "Skipped"],
          ["all", "All matches"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>
              {matches.data?.filter(
                (m) => value === "all" || m.status === value,
              ).length || 0}
            </span>
          </button>
        ))}
      </div>
      <ErrorMessage error={error} />
      {matches.loading ? (
        <Loading />
      ) : matches.error ? (
        <LoadError error={matches.error} retry={matches.reload} />
      ) : filtered.length ? (
        <div className="match-grid">
          {filtered.map((m) => (
            <article className="panel match-card" key={m.id}>
              <Art category={m.activity.category} />
              <div className="match-body">
                <div className="section-heading">
                  <span className="eyebrow">{m.activity.category}</span>
                  <span className={`badge ${m.status}`}>
                    {m.status === "pending"
                      ? "Up next"
                      : m.status === "done"
                        ? "Completed"
                        : "Skipped"}
                  </span>
                </div>
                <h3>{m.activity.title}</h3>
                <p>{m.activity.description}</p>
                <div className="activity-meta">
                  <span>
                    <Icon name="clock" size={15} />
                    {m.activity.durationMin} min
                  </span>
                  <span>
                    {m.activity.budget === 1
                      ? "Free"
                      : `Budget ${m.activity.budget}/5`}
                  </span>
                </div>
                <div className="match-actions">
                  {m.status !== "done" && (
                    <button
                      className="btn small"
                      disabled={!!busy}
                      onClick={() => update(m.id, "done")}
                    >
                      <Icon name="check" size={16} />
                      Mark done
                    </button>
                  )}
                  {m.status === "pending" && (
                    <button
                      className="btn secondary small"
                      disabled={!!busy}
                      onClick={() => update(m.id, "skipped")}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Share ${m.activity.title}`}
                    title="Share activity"
                    disabled={!!busy}
                    onClick={() => share(m.id)}
                  >
                    <Icon name="share" size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            filter === "done"
              ? "Your first good memory starts here."
              : filter === "skipped"
                ? "No skipped plans."
                : "A little room for possibility."
          }
        >
          <p>
            {filter === "done"
              ? "Mark an activity as done and celebrate making it happen."
              : "Discover something that makes you want to get up and go."}
          </p>
          <Link className="btn" to="/swipe">
            Find my next thing <Icon name="arrow" size={16} />
          </Link>
        </Empty>
      )}
      {shared && (
        <Modal
          title="Good plans are better together."
          close={() => setShared("")}
        >
          <p>
            Anyone with this link can see the activity and your name. Send it to
            someone who’s up for an adventure.
          </p>
          <CopyField value={shared} />
          <a
            className="text-link coral"
            href={shared}
            target="_blank"
            rel="noreferrer"
          >
            Preview invite <Icon name="arrow" size={16} />
          </a>
        </Modal>
      )}
    </>
  );
}
