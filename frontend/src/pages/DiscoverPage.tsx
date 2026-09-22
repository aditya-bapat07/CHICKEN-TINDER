import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  createActivity,
  createSession,
  getActivities,
  getMatches,
  swipe,
} from "../api";
import { useAuth } from "../context/AuthContext";
import {
  Art,
  categories,
  Empty,
  ErrorMessage,
  Icon,
  Loading,
  LoadError,
  Modal,
  useLoad,
} from "../components/UI";
export default function DiscoverPage({
  catalog = false,
}: {
  catalog?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useLoad(getActivities);
  const stats = useLoad(async () => (user ? getMatches() : []), [user?.id]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Activity>();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState(false);
  const [duration, setDuration] = useState(0);
  const filtered = useMemo(
    () =>
      (list.data || []).filter(
        (a) =>
          (category === "all" || a.category === category) &&
          (!budget || a.budget === 1) &&
          (!duration || a.durationMin <= duration) &&
          `${a.title} ${a.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [list.data, category, search, budget, duration],
  );
  const visibleActivities =
    catalog || category !== "all" || search || budget || duration
      ? filtered
      : Object.keys(categories)
          .flatMap((category) => {
            const first = filtered.find(
              (activity) => activity.category === category,
            );
            return first ? [first] : [];
          })
          .slice(0, 6);
  async function saveActivity() {
    if (!user) {
      navigate("/signup");
      return;
    }
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const session = await createSession();
      await swipe(session.sessionId, selected.id, "like");
      navigate("/matches");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addActivity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await createActivity({
        title: String(f.get("title")),
        description: String(f.get("description")),
        category: String(f.get("category")),
        durationMin: Number(f.get("durationMin")),
        energy: Number(f.get("energy")),
        budget: Number(f.get("budget")),
        social: Number(f.get("social")),
      });
      setAdding(false);
      list.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {catalog
              ? "A world of “why not?”"
              : user
                ? `Hey ${user.name.split(" ")[0]}, what’s the plan?`
                : "Make today a little less ordinary."}
          </h1>
          <p>
            {catalog
              ? "Big adventures. Little detours. Find something worth saying yes to."
              : "A new hobby, a tiny adventure, or just a really good afternoon."}
          </p>
        </div>
        <span className="date-note">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      {!catalog && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="pill">
                <span className="status-dot" /> BOREDOM ENDS HERE
              </span>
              <h2>
                Less “I don’t know.”
                <br />
                More <em>“let’s do it.”</em>
              </h2>
              <p>
                Discover activities that match your mood.
                <br />
                Swipe, say yes, and make a memory.
              </p>
              <Link to="/swipe" className="btn">
                Find my next thing <Icon name="arrow" size={18} />
              </Link>
              <button
                className="explore-scroll"
                onClick={() => {
                  document
                    .getElementById("ideas")
                    ?.scrollIntoView({
                      behavior:
                        document.documentElement.dataset.motion === "off"
                          ? "instant"
                          : "smooth",
                      block: "start",
                    });
                  document
                    .getElementById("activity-search")
                    ?.focus({ preventScroll: true });
                }}
              >
                Explore the ideas below <span aria-hidden="true">↓</span>
              </button>
              <span className="hero-fine">
                A little spontaneous looks good on you.
              </span>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-circle" />
              <div className="hero-orbit" />
              <span className="hero-spark">✳</span>
              <div className="mini-card back">
                <span>☀</span>
                <strong>
                  Get a little
                  <br />
                  fresh air.
                </strong>
                <small>OUTSIDE IS CALLING ↗</small>
              </div>
              <div className="mini-card front">
                <span>✿</span>
                <strong>
                  Make room
                  <br />
                  for a little fun.
                </strong>
                <small>YOUR NEXT GOOD IDEA ↗</small>
              </div>
              <span className="yes-stamp">
                say
                <br />
                <strong>yes!</strong>
              </span>
            </div>
          </section>
          <section className="stats-strip">
            <div>
              <span className="stat-icon sage">
                <Icon name="grid" />
              </span>
              <span>
                <strong>
                  {list.data?.length ?? "—"}
                  <small>things to try</small>
                </strong>
                <p>A little something for every mood</p>
              </span>
            </div>
            <div>
              <span className="stat-icon peach">
                <Icon name="heart" />
              </span>
              <span>
                <strong>
                  {stats.data?.filter((m) => m.status === "pending").length ??
                    "—"}
                  <small>on your list</small>
                </strong>
                <p>Your next good memory is waiting</p>
              </span>
            </div>
            <div>
              <span className="stat-icon lavender">
                <Icon name="check" />
              </span>
              <span>
                <strong>
                  {stats.data?.filter((m) => m.status === "done").length ?? "—"}
                  <small>adventures done</small>
                </strong>
                <p>Look at you, doing the thing</p>
              </span>
            </div>
          </section>
        </>
      )}
      <section className="discovery-section" id="ideas">
        <div className="section-heading">
          <div>
            <h2>
              {catalog
                ? "Explore the collection"
                : "What are you in the mood for?"}
            </h2>
            <p>
              {catalog
                ? "Find a plan that fits your day."
                : "Follow your curiosity. We’ll take it from here."}
            </p>
          </div>
          {catalog ? (
            <button
              className="btn secondary small"
              onClick={() => {
                if (!user) navigate("/signin");
                else {
                  setError("");
                  setAdding(true);
                }
              }}
            >
              <Icon name="plus" size={16} />
              Add an activity
            </button>
          ) : (
            <Link to="/quiz" className="text-link coral">
              Tune my vibe <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
        <div className="category-list">
          <button
            className={category === "all" ? "category active" : "category"}
            onClick={() => setCategory("all")}
          >
            <span>✦</span> A little of everything
          </button>
          {Object.entries(categories)
            .filter(([key]) =>
              (list.data || []).some((a) => a.category === key),
            )
            .map(([key, c]) => (
              <button
                key={key}
                className={`category ${category === key ? "active" : ""}`}
                onClick={() => setCategory(key)}
              >
                <span>{c.symbol}</span>
                {c.label}
              </button>
            ))}
        </div>
        <div className="filter-row">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              id="activity-search"
              aria-label="Search activities"
              placeholder="Find your kind of adventure…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={budget}
              onChange={(e) => setBudget(e.target.checked)}
            />
            Free activities only
          </label>
          <select
            className="duration-filter"
            aria-label="Maximum activity duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={0}>Any duration</option>
            <option value={30}>30 min or less</option>
            <option value={60}>An hour or less</option>
          </select>
          <button
            className="btn secondary small surprise-button"
            disabled={!filtered.length || list.loading}
            onClick={() => {
              setSelected(
                filtered[Math.floor(Math.random() * filtered.length)],
              );
              setError("");
            }}
          >
            <span aria-hidden="true">✦</span>Surprise me
          </button>
          <span className="result-count" aria-live="polite">
            {filtered.length} ideas to explore
          </span>
        </div>
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <LoadError error={list.error} retry={list.reload} />
        ) : filtered.length ? (
          <div className="activity-grid">
            {visibleActivities.map((a) => (
              <button
                className="activity-card"
                key={a.id}
                onClick={() => {
                  setSelected(a);
                  setError("");
                }}
              >
                <Art category={a.category} />
                <div className="activity-card-body">
                  <span className="eyebrow">{a.category}</span>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                  <div className="activity-meta">
                    <span>
                      <Icon name="clock" size={14} />
                      {a.durationMin} min
                    </span>
                    <span>
                      {a.budget === 1
                        ? "Free"
                        : ["", "", "$", "$$", "$$$", "$$$$"][a.budget]}
                    </span>
                    <span className="card-arrow">
                      <Icon name="arrow" size={16} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty title="No ideas found just yet.">
            <p>Try another search or loosen up your filters.</p>
            <button
              className="btn secondary"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setBudget(false);
                setDuration(0);
              }}
            >
              Clear filters
            </button>
          </Empty>
        )}
        {!catalog && filtered.length > 6 && (
          <div className="center">
            <Link to="/activities" className="btn secondary">
              Explore all activities <Icon name="arrow" size={16} />
            </Link>
          </div>
        )}
      </section>
      {!catalog && (
        <section className="scroll-story" aria-labelledby="story-title">
          <div className="story-heading">
            <span className="eyebrow">FROM MAYBE TO MEMORY</span>
            <h2 id="story-title">
              Good days start
              <br />
              with one little <em>yes.</em>
            </h2>
            <p>No perfect plan required. Just a little curiosity.</p>
          </div>
          <div className="story-flower" aria-hidden="true">
            ✳
          </div>
          <div className="how-steps">
            <Link to="/quiz" className="how-step">
              <span className="step-number">01</span>
              <Icon name="bolt" />
              <h3>Find your vibe.</h3>
              <p>Tell us how your day feels. We’ll meet you there.</p>
              <span className="text-link">
                Take the quiz <Icon name="arrow" size={16} />
              </span>
            </Link>
            <Link to="/swipe" className="how-step">
              <span className="step-number">02</span>
              <Icon name="heart" />
              <h3>Follow a little spark.</h3>
              <p>Swipe through possibilities until something clicks.</p>
              <span className="text-link">
                Start discovering <Icon name="arrow" size={16} />
              </span>
            </Link>
            <Link to="/matches" className="how-step">
              <span className="step-number">03</span>
              <Icon name="check" />
              <h3>Go make the memory.</h3>
              <p>Your saved ideas are ready when you are.</p>
              <span className="text-link">
                See your matches <Icon name="arrow" size={16} />
              </span>
            </Link>
          </div>
        </section>
      )}
      {selected && (
        <Modal
          title="Your next little adventure"
          close={() => !busy && setSelected(undefined)}
        >
          <Art category={selected.category} />
          <h2 className="modal-title">{selected.title}</h2>
          <p>{selected.description}</p>
          <div className="detail-chips">
            <span>{selected.durationMin} minutes</span>
            <span>
              {selected.budget === 1
                ? "Free to try"
                : `Budget ${selected.budget}/5`}
            </span>
            <span>Energy {selected.energy}/5</span>
            <span>
              {selected.social === 1
                ? "Solo friendly"
                : `Social ${selected.social}/5`}
            </span>
          </div>
          <ErrorMessage error={error} />
          <button className="btn full" onClick={saveActivity} disabled={busy}>
            {busy ? "Saving…" : "Yes, add to my matches"}
            <Icon name="heart" size={18} />
          </button>
        </Modal>
      )}
      {adding && (
        <Modal
          title="Share a good idea"
          close={() => !busy && setAdding(false)}
        >
          <form onSubmit={addActivity}>
            <ErrorMessage error={error} />
            <label>
              Activity title
              <input name="title" maxLength={160} required />
            </label>
            <label>
              What’s the plan?
              <textarea name="description" maxLength={2000} required />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select name="category">
                  {Object.keys(categories).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration (minutes)
                <input
                  name="durationMin"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={30}
                  required
                />
              </label>
              {["energy", "budget", "social"].map((d) => (
                <label key={d} className="capitalize">
                  {d} (1–5)
                  <input
                    name={d}
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={2}
                    required
                  />
                </label>
              ))}
            </div>
            <button className="btn full" disabled={busy}>
              {busy ? "Adding…" : "Add activity"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
