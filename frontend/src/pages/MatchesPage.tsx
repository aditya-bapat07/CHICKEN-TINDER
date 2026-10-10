import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMatches, patchMatch, shareMatch, Match, Activity } from "../api";
import StoryShareModal from "../components/StoryShareModal";
import AdventureRPG from "../components/AdventureRPG";
import {
  getGoogleCalendarUrl,
  downloadIcsFile,
  getMapsSearchUrl,
  getIngredientsChecklist,
} from "../lib/activityActions";
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
  const [storyMatch, setStoryMatch] = useState<Match | null>(null);
  const [checklistActivity, setChecklistActivity] = useState<Activity | null>(
    null,
  );
  const [activePhotoMatchId, setActivePhotoMatchId] = useState<string | null>(
    null,
  );

  // Photos stored in localStorage: { [matchId]: photoDataUrl }
  const [photos, setPhotos] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("ct_scrapbook_photos") || "{}");
    } catch {
      return {};
    }
  });

  const photoInputRef = useRef<HTMLInputElement>(null);

  const savePhoto = (matchId: string, dataUrl: string) => {
    const updated = { ...photos, [matchId]: dataUrl };
    setPhotos(updated);
    try {
      localStorage.setItem("ct_scrapbook_photos", JSON.stringify(updated));
    } catch {
      // ignore storage quota error
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoMatchId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        savePhoto(activePhotoMatchId, dataUrl);
        setActivePhotoMatchId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  async function update(id: string, status: "done" | "skipped") {
    setBusy(id);
    setError("");
    try {
      const m = await patchMatch(id, status);
      matches.setData((current) =>
        current?.map((item) => (item.id === id ? m : item)),
      );
      if (status === "done") {
        setStoryMatch(m);
      }
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

  const allMatches = matches.data || [];
  const completedMatches = allMatches.filter((m) => m.status === "done");
  const filtered =
    filter === "scrapbook"
      ? completedMatches
      : allMatches.filter((m) => filter === "all" || m.status === filter);

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
          ["scrapbook", "📸 Scrapbook"],
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
              {value === "scrapbook"
                ? completedMatches.length
                : value === "all"
                  ? allMatches.length
                  : allMatches.filter((m) => m.status === value).length}
            </span>
          </button>
        ))}
      </div>

      <ErrorMessage error={error} />

      {/* Hidden file input for photo proofs */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoUpload}
      />

      {matches.loading ? (
        <Loading />
      ) : matches.error ? (
        <LoadError error={matches.error} retry={matches.reload} />
      ) : filter === "scrapbook" ? (
        <div className="scrapbook-section">
          {completedMatches.length ? (
            <div className="scrapbook-grid">
              {completedMatches.map((m) => {
                const photo = photos[m.id];
                return (
                  <article className="panel scrapbook-card" key={m.id}>
                    <div className="scrapbook-photo-frame">
                      {photo ? (
                        <img
                          src={photo}
                          alt={m.activity.title}
                          className="scrapbook-photo"
                        />
                      ) : (
                        <div
                          className="scrapbook-placeholder"
                          onClick={() => {
                            setActivePhotoMatchId(m.id);
                            photoInputRef.current?.click();
                          }}
                        >
                          <Icon name="camera" size={28} />
                          <span>Tap to add photo proof</span>
                        </div>
                      )}
                    </div>

                    <div className="scrapbook-body">
                      <span className="eyebrow">{m.activity.category}</span>
                      <h3>{m.activity.title}</h3>
                      <p>{m.activity.description}</p>

                      <div className="scrapbook-meta">
                        <span>
                          <Icon name="check" size={14} /> Completed
                        </span>
                        <span>
                          <Icon name="clock" size={14} />{" "}
                          {m.activity.durationMin}m
                        </span>
                      </div>

                      <div className="scrapbook-actions">
                        <button
                          type="button"
                          className="btn secondary small"
                          onClick={() => {
                            setActivePhotoMatchId(m.id);
                            photoInputRef.current?.click();
                          }}
                        >
                          <Icon name="camera" size={14} />
                          {photo ? "Change Photo" : "Add Photo"}
                        </button>
                        <button
                          type="button"
                          className="btn primary small"
                          onClick={() => setStoryMatch(m)}
                        >
                          <Icon name="party" size={14} />
                          Story Card
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty title="Your Adventure Scrapbook is waiting.">
              <p>
                Complete activities, snap a quick photo proof, and save your
                real-world adventures here.
              </p>
              <Link className="btn" to="/swipe">
                Discover your next adventure <Icon name="arrow" size={16} />
              </Link>
            </Empty>
          )}
        </div>
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

                {/* Practical Smart Action Links */}
                <div className="match-quick-links">
                  <a
                    href={getMapsSearchUrl(m.activity)}
                    target="_blank"
                    rel="noreferrer"
                    className="action-chip"
                    title="Find places near you on Google Maps"
                  >
                    <Icon name="mapPin" size={13} />
                    Find nearby
                  </a>

                  <a
                    href={getGoogleCalendarUrl(m.activity)}
                    target="_blank"
                    rel="noreferrer"
                    className="action-chip"
                    title="Schedule on Google Calendar"
                  >
                    <Icon name="calendar" size={13} />
                    Google Cal
                  </a>

                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => downloadIcsFile(m.activity)}
                    title="Download .ics for Apple / Outlook Calendar"
                  >
                    <Icon name="calendar" size={13} />
                    .ics
                  </button>

                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setChecklistActivity(m.activity)}
                    title="View ingredients and items checklist"
                  >
                    <Icon name="checklist" size={13} />
                    Checklist
                  </button>
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
                  {m.status === "done" && (
                    <>
                      <button
                        className="btn secondary small"
                        disabled={!!busy}
                        onClick={() => {
                          setActivePhotoMatchId(m.id);
                          photoInputRef.current?.click();
                        }}
                        title="Attach photo proof"
                      >
                        <Icon name="camera" size={15} />
                        {photos[m.id] ? "Photo ✔" : "Photo"}
                      </button>

                      <button
                        className="btn primary small"
                        disabled={!!busy}
                        onClick={() => setStoryMatch(m)}
                        title="Share Strava-style Story"
                      >
                        <Icon name="party" size={15} />
                        Story
                      </button>
                    </>
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

      {/* Gamification / Adventure RPG Progression Panel */}
      {allMatches.length > 0 && (
        <div style={{ marginTop: "48px" }}>
          <AdventureRPG matches={allMatches} />
        </div>
      )}

      {/* Checklist / Ingredients Modal */}
      {checklistActivity && (
        <Modal
          title={`Checklist: ${checklistActivity.title}`}
          close={() => setChecklistActivity(null)}
        >
          <p style={{ marginBottom: "16px" }}>
            Items and materials recommended for this activity:
          </p>
          <div className="checklist-items-box">
            {getIngredientsChecklist(checklistActivity).map((item, i) => (
              <label key={i} className="checklist-item-row">
                <input type="checkbox" defaultChecked={false} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn full secondary"
            style={{ marginTop: "16px" }}
            onClick={() => {
              const text =
                getIngredientsChecklist(checklistActivity).join("\n• ");
              void navigator.clipboard?.writeText(
                `Checklist for ${checklistActivity.title}:\n• ${text}`,
              );
            }}
          >
            <Icon name="copy" size={16} /> Copy Checklist to Clipboard
          </button>
        </Modal>
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

      {storyMatch && (
        <StoryShareModal
          match={storyMatch}
          close={() => setStoryMatch(null)}
          initialPhotoUrl={photos[storyMatch.id] || ""}
          onPhotoSaved={(matchId, url) => savePhoto(matchId, url)}
        />
      )}
    </>
  );
}
