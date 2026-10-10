import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, getActivities } from "../api";
import { Art, Icon, Modal, useLoad } from "../components/UI";
import { getGoogleCalendarUrl } from "../lib/activityActions";

interface PartyMember {
  id: string;
  name: string;
  isHost: boolean;
  swipesDone: number;
}

export default function PartyPage() {
  const activities = useLoad(getActivities);
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState(
    () => localStorage.getItem("ct_party_name") || "",
  );
  const [inRoom, setInRoom] = useState(false);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [deck, setDeck] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myLikes, setMyLikes] = useState<string[]>([]);
  const [groupMatch, setGroupMatch] = useState<Activity | null>(null);
  const [chickenDeciding, setChickenDeciding] = useState(false);
  const [partyStatus, setPartyStatus] = useState("swiping");

  // Create room
  const handleCreateRoom = () => {
    const name = userName.trim() || "Host";
    localStorage.setItem("ct_party_name", name);
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setMembers([
      { id: "1", name, isHost: true, swipesDone: 0 },
      { id: "2", name: "Friend Alex", isHost: false, swipesDone: 0 },
    ]);
    const shuffled = [...(activities.data || [])]
      .filter(
        (a) =>
          a.social >= 2 ||
          a.category === "culinary" ||
          a.category === "outdoor" ||
          a.category === "gaming",
      )
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    setDeck(shuffled);
    setCurrentIndex(0);
    setMyLikes([]);
    setGroupMatch(null);
    setInRoom(true);
  };

  // Join room
  const handleJoinRoom = () => {
    const name = userName.trim() || "Adventurer";
    localStorage.setItem("ct_party_name", name);
    const code = roomCode.trim().toUpperCase() || "CHKN";
    setRoomCode(code);
    setMembers([
      { id: "1", name: "Host Sam", isHost: true, swipesDone: 2 },
      { id: "2", name, isHost: false, swipesDone: 0 },
    ]);
    const shuffled = [...(activities.data || [])]
      .filter(
        (a) =>
          a.social >= 2 ||
          a.category === "culinary" ||
          a.category === "outdoor" ||
          a.category === "gaming",
      )
      .slice(0, 10);
    setDeck(shuffled);
    setCurrentIndex(0);
    setMyLikes([]);
    setGroupMatch(null);
    setInRoom(true);
  };

  const handleSwipe = (direction: "like" | "pass") => {
    if (!deck[currentIndex]) return;
    const currentActivity = deck[currentIndex];

    if (direction === "like") {
      const updatedLikes = [...myLikes, currentActivity.id];
      setMyLikes(updatedLikes);

      // Simulate group consensus when 2 likes occur or 50% chance
      if (Math.random() > 0.45 || updatedLikes.length >= 2) {
        setGroupMatch(currentActivity);
        setPartyStatus("matched");
        return;
      }
    }

    // Advance
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPartyStatus("finished");
    }
  };

  const triggerChickenTieBreaker = () => {
    setChickenDeciding(true);
    setTimeout(() => {
      const luckyIndex = Math.floor(Math.random() * deck.length);
      setGroupMatch(deck[luckyIndex]);
      setPartyStatus("matched");
      setChickenDeciding(false);
    }, 1500);
  };

  const currentCard = deck[currentIndex];

  return (
    <div className="party-page">
      <div className="page-heading">
        <div>
          <h1>Multiplayer Party Deck.</h1>
          <p>
            Swipe together with friends on the same deck. Instant consensus,
            zero arguing.
          </p>
        </div>
      </div>

      {!inRoom ? (
        <div className="party-lobby-panel panel">
          <div className="party-intro-badge">
            <Icon name="party" size={24} />
            <h2>What should we do tonight?</h2>
            <p>
              Create a room, share the code with friends, and find an activity
              everyone loves.
            </p>
          </div>

          <div className="party-join-box">
            <label>
              Your Name / Nickname
              <input
                type="text"
                placeholder="e.g. Jamie"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                maxLength={30}
                className="input"
              />
            </label>

            <div className="party-actions-grid">
              <button
                type="button"
                className="btn primary full"
                onClick={handleCreateRoom}
                disabled={!activities.data?.length}
              >
                <Icon name="plus" size={16} /> Host a Group Room
              </button>

              <div className="party-divider">
                <span>OR JOIN EXISTING ROOM</span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Room Code (e.g. CHKN)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="input"
                  style={{
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "2px",
                  }}
                />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim() || !activities.data?.length}
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="party-room-active">
          <div className="party-room-header panel">
            <div className="room-code-tag">
              <span>ROOM CODE</span>
              <strong>{roomCode}</strong>
            </div>

            <div className="room-members-strip">
              <span className="members-title">In the room:</span>
              <div className="members-list">
                {members.map((m) => (
                  <span key={m.id} className="member-chip">
                    <span className="online-dot" /> {m.name} {m.isHost && "👑"}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn secondary small"
              onClick={() => setInRoom(false)}
            >
              Leave Room
            </button>
          </div>

          {currentCard && partyStatus === "swiping" ? (
            <div className="party-swipe-area">
              <div className="swipe-progress-bar">
                <span>
                  Card {currentIndex + 1} of {deck.length}
                </span>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${((currentIndex + 1) / deck.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <article className="panel party-card">
                <Art category={currentCard.category} />
                <div className="party-card-body">
                  <span className="eyebrow">{currentCard.category}</span>
                  <h2>{currentCard.title}</h2>
                  <p>{currentCard.description}</p>

                  <div className="detail-chips">
                    <span>⏱️ {currentCard.durationMin} mins</span>
                    <span>
                      💰{" "}
                      {currentCard.budget === 1
                        ? "Free"
                        : `$${currentCard.budget}/5`}
                    </span>
                    <span>⚡ Effort {currentCard.energy}/5</span>
                  </div>

                  <div className="party-vote-buttons">
                    <button
                      type="button"
                      className="btn secondary round vote-btn pass"
                      onClick={() => handleSwipe("pass")}
                      title="Not this one"
                    >
                      <Icon name="close" size={24} /> Pass
                    </button>
                    <button
                      type="button"
                      className="btn primary round vote-btn like"
                      onClick={() => handleSwipe("like")}
                      title="Yes, let's do it!"
                    >
                      <Icon name="heart" size={24} /> Yes!
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ) : partyStatus === "finished" && !groupMatch ? (
            <div className="panel party-tiebreaker">
              <h2>Deck complete! No unanimous agreement yet.</h2>
              <p>
                The Chicken Rule is ready to settle the debate once and for all.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={triggerChickenTieBreaker}
                disabled={chickenDeciding}
              >
                <Icon name="party" size={18} />
                {chickenDeciding
                  ? "The Chicken is choosing…"
                  : "Let Chicken Fate Decide!"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {groupMatch && (
        <Modal title="🎉 IT’S A GROUP MATCH!" close={() => setGroupMatch(null)}>
          <div className="group-match-dialog">
            <span className="celebrate-pill">CONSENSUS REACHED!</span>
            <Art category={groupMatch.category} />
            <h2 className="modal-title">{groupMatch.title}</h2>
            <p>{groupMatch.description}</p>
            <div className="detail-chips">
              <span>⏱️ {groupMatch.durationMin} mins</span>
              <span>
                💰{" "}
                {groupMatch.budget === 1 ? "Free" : `$${groupMatch.budget}/5`}
              </span>
              <span>👥 Group Approved</span>
            </div>

            <div className="group-match-actions">
              <a
                href={getGoogleCalendarUrl(groupMatch)}
                target="_blank"
                rel="noreferrer"
                className="btn primary full"
              >
                <Icon name="calendar" size={16} /> Schedule with Friends (Google
                Cal)
              </a>

              <Link to="/matches" className="btn secondary full">
                <Icon name="heart" size={16} /> Save to My Matches
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
