import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ApiError,
  createSession,
  endSession,
  getNextActivity,
  getSessionSummary,
  Summary,
  swipe,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { Art, Empty, ErrorMessage, Icon, Modal } from "../components/UI";
export default function SwipePage() {
  const { user, refreshUser } = useAuth();
  const storageKey = `ct_session_${user!.id}`;
  const [session, setSession] = useState<string | null>(() =>
    sessionStorage.getItem(storageKey),
  );
  const [activity, setActivity] = useState<Activity | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState(0);
  const [matched, setMatched] = useState<{
    activity: Activity;
    forced: boolean;
  }>();
  const [summary, setSummary] = useState<Summary>();
  const lock = useRef(false);
  const pointer = useRef<number>();
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let id = session;
      if (id) {
        try {
          const next = await getNextActivity(id);
          setActivity(next.activity);
          setStarted(true);
          setStreak(user?.streakRejects || 0);
          return;
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 404) throw e;
        }
      }
      const created = await createSession();
      id = created.sessionId;
      setSession(id);
      sessionStorage.setItem(storageKey, id);
      setStreak(created.streakRejects);
      setSummary(undefined);
      const next = await getNextActivity(id);
      setActivity(next.activity);
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function vote(direction: "like" | "reject") {
    if (lock.current || !activity || !session || matched || summary) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await swipe(session, activity.id, direction);
      setStreak(result.streak);
      setActivity(null);
      if (result.accepted) setMatched({ activity, forced: result.forced });
      const next = await getNextActivity(session);
      setActivity(next.activity);
      await refreshUser();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const recap = await getSessionSummary(session);
      await endSession(session);
      sessionStorage.removeItem(storageKey);
      setSession(null);
      setSummary(recap);
      setActivity(null);
      setStarted(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,button,select,dialog")
      )
        return;
      if (e.key === "ArrowLeft") void vote("reject");
      if (e.key === "ArrowRight") void vote("like");
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your next “let’s do it.”</h1>
          <p>Go with your gut. The best plans start with a yes.</p>
        </div>
        {started && (
          <button
            className="btn secondary small"
            disabled={busy}
            onClick={finish}
          >
            End session
          </button>
        )}
      </div>
      <div className="swipe-layout">
        <section className="swipe-main">
          <ErrorMessage error={error} />
          {error && session && !activity && (
            <button className="btn secondary" disabled={busy} onClick={start}>
              Retry loading activity
            </button>
          )}
          {summary ? (
            <Empty title="A little less bored already.">
              <div className="recap">
                <span>
                  <strong>{summary.totalSwipes}</strong>Swipes
                </span>
                <span>
                  <strong>{summary.likes + summary.forced}</strong>Matches
                </span>
                <span>
                  <strong>{summary.rejects}</strong>Passes
                </span>
              </div>
              <Link to="/matches" className="btn">
                See my matches
              </Link>
              <button className="btn secondary" onClick={start} disabled={busy}>
                Start another session
              </button>
            </Empty>
          ) : !started ? (
            <div className="session-intro">
              <Art category="creative" large />
              <h2>
                {session
                  ? "Pick up where you left off."
                  : "A fresh idea. One card at a time."}
              </h2>
              <p>
                We’ll find activities for your energy, budget, and social mood.
              </p>
              <button className="btn" onClick={start} disabled={busy}>
                {busy
                  ? "Getting ready…"
                  : session
                    ? "Resume session"
                    : "Start discovering"}
                <Icon name="arrow" />
              </button>
            </div>
          ) : activity ? (
            <>
              <article
                className="swipe-card"
                onPointerDown={(e) => {
                  pointer.current = e.clientX;
                }}
                onPointerUp={(e) => {
                  const diff = e.clientX - (pointer.current ?? e.clientX);
                  pointer.current = undefined;
                  if (Math.abs(diff) > 90)
                    void vote(diff > 0 ? "like" : "reject");
                }}
              >
                <Art category={activity.category} large />
                <div className="swipe-card-body">
                  <span className="eyebrow coral">{activity.category}</span>
                  <h2>{activity.title}</h2>
                  <p>{activity.description}</p>
                  <div className="detail-chips">
                    <span>
                      <Icon name="clock" size={15} />
                      {activity.durationMin} min
                    </span>
                    <span>
                      {activity.budget === 1
                        ? "Free"
                        : `Budget ${activity.budget}/5`}
                    </span>
                    <span>Energy {activity.energy}/5</span>
                  </div>
                </div>
              </article>
              <div className="swipe-actions">
                <button
                  className="btn pass"
                  disabled={busy}
                  onClick={() => vote("reject")}
                >
                  <Icon name="close" />{" "}
                  {streak === 9 ? "Let fate choose" : "Not this time"}
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => vote("like")}
                >
                  <Icon name="heart" />
                  Yes, let’s do it
                </button>
              </div>
              <p className="keyboard-hint">
                You can also swipe the card or use ← and → on your keyboard.
              </p>
            </>
          ) : (
            <Empty
              title={
                busy
                  ? "Finding your next idea…"
                  : "You’ve explored the whole flock."
              }
            >
              <p>
                {busy
                  ? "Just a moment."
                  : "Your saved matches are waiting. You can also add a new activity to the collection."}
              </p>
              {!busy && (
                <>
                  <Link className="btn" to="/matches">
                    See my matches
                  </Link>
                  <Link className="btn secondary" to="/activities">
                    Explore activities
                  </Link>
                </>
              )}
            </Empty>
          )}
        </section>
        <aside className="swipe-aside">
          <span className="eyebrow">A FRIENDLY LITTLE NUDGE</span>
          <h3>
            Don’t overthink
            <br />
            the good stuff.
          </h3>
          <p>
            After 10 passes in a row, your tenth activity becomes a match.
            Sometimes a little push is all you need.
          </p>
          <div className="streak-dots">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < streak ? "filled" : ""} />
            ))}
          </div>
          <strong>{streak} of 10 passes</strong>
          <p className="small-text">
            {streak === 9
              ? "Your next pass will be saved as a match."
              : "Saying yes resets your pass streak."}{" "}
            You can mark any match as skipped.
          </p>
          <hr />
          <h4>Make it feel like you.</h4>
          <p>Your mood helps us find better ideas.</p>
          <Link to="/quiz" className="text-link coral">
            Update my vibe <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </div>
      {matched && (
        <Modal
          title={
            matched.forced ? "A little nudge from fate." : "That’s a match!"
          }
          close={() => setMatched(undefined)}
        >
          <Art category={matched.activity.category} />
          <h2 className="modal-title">{matched.activity.title}</h2>
          <p>
            {matched.forced
              ? "Ten passes, one new possibility. It’s saved in your matches; give it a go or skip it there."
              : "One yes closer to a good day. Your activity is saved in My matches."}
          </p>
          <div className="modal-actions">
            <Link className="btn" to="/matches">
              See my matches
            </Link>
            <button
              className="btn secondary"
              onClick={() => setMatched(undefined)}
            >
              Keep discovering
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
