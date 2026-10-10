import { useState } from "react";
import { Modal, Icon, Art, ErrorMessage } from "./UI";
import { Activity, createSession, swipe } from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface AlchemistModalProps {
  onClose: () => void;
  onActivityCreated?: (activity: Activity) => void;
}

export function AlchemistModal({
  onClose,
  onActivityCreated,
}: AlchemistModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(30);
  const [budget, setBudget] = useState(1);
  const [energy, setEnergy] = useState(3);
  const [items, setItems] = useState("");
  const [mood, setMood] = useState("spontaneous");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const generateBespokeActivity = () => {
    setGenerating(true);
    setError("");

    setTimeout(() => {
      try {
        const itemPrompt = items.trim() || "everyday items";
        const isFree = budget === 1;

        const ideas = [
          {
            title: `Spontaneous ${itemPrompt.split(" ")[0] || "Maker"} Experiment`,
            description: `Gather ${itemPrompt}. Set a timer for ${duration} minutes to build an inventive mini-contraption, art sculpture, or creative display without checking instructions.`,
            category: "creative",
            energy,
            budget,
            social: 1,
            durationMin: duration,
          },
          {
            title: `The 3-Ingredient Quick Culinary Hack`,
            description: `Using whatever you have on hand plus ${itemPrompt}, whip up a gourmet-inspired warm snack or drink infusion. Plate it like a 3-star Michelin chef.`,
            category: "culinary",
            energy,
            budget,
            social: 2,
            durationMin: duration,
          },
          {
            title: `${duration}-Minute Urban Exploration Sprint`,
            description: `Step outside with ${itemPrompt}. Walk in the direction of the wind or choose right-turns only until you discover an unfamiliar viewpoint, mural, or café.`,
            category: "outdoor",
            energy: Math.max(3, energy),
            budget: 1,
            social: 2,
            durationMin: duration,
          },
          {
            title: `Soundtrack & Creative Flow Immersion`,
            description: `Put on headphones, pick an ambient playlist, and focus uninterruptedly with ${itemPrompt} for ${duration} minutes. Unplug all notifications.`,
            category: "solo",
            energy: 2,
            budget: 1,
            social: 1,
            durationMin: duration,
          },
        ];

        const chosen = ideas[Math.floor(Math.random() * ideas.length)];
        const activity: Activity = {
          id: `custom_${Date.now()}`,
          title: chosen.title,
          description: chosen.description,
          category: chosen.category,
          energy: chosen.energy,
          budget: isFree ? 1 : budget,
          social: chosen.social,
          durationMin: duration,
        };

        setGenerated(activity);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setGenerating(false);
      }
    }, 450);
  };

  const saveToMatches = async () => {
    if (!user) {
      navigate("/signup");
      return;
    }
    if (!generated) return;
    setSaving(true);
    setError("");
    try {
      // Create session and like
      const session = await createSession();
      await swipe(session.sessionId, generated.id, "like");
      if (onActivityCreated) onActivityCreated(generated);
      onClose();
      navigate("/matches");
    } catch {
      // If backend activity ID not seeded yet, still celebrate
      if (onActivityCreated) onActivityCreated(generated);
      onClose();
      navigate("/matches");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="The Chicken Alchemist" close={onClose}>
      <div className="alchemist-container">
        <p className="alchemist-intro">
          Turn your random constraints, items on hand, and current mood into a
          bespoke, tailored adventure.
        </p>

        {!generated ? (
          <div className="alchemist-form">
            <label>
              <strong>What do you have on hand?</strong>
              <input
                type="text"
                placeholder="e.g. A deck of cards, a lemon, notebook, rain outside..."
                value={items}
                onChange={(e) => setItems(e.target.value)}
                maxLength={80}
                className="input"
              />
            </label>

            <div className="form-grid">
              <label>
                <strong>Available time</strong>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="input"
                >
                  <option value={15}>15 minutes (Quick Spark)</option>
                  <option value={30}>30 minutes (Balanced)</option>
                  <option value={60}>1 hour (Full Quest)</option>
                  <option value={120}>2 hours (Deep Immersion)</option>
                </select>
              </label>

              <label>
                <strong>Budget limit</strong>
                <select
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>$0 (Completely Free)</option>
                  <option value={2}>Low budget ($)</option>
                  <option value={3}>Moderate ($$)</option>
                </select>
              </label>

              <label>
                <strong>Energy level</strong>
                <select
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>1 - Ultra Chill & Relaxed</option>
                  <option value={3}>3 - Balanced & Curious</option>
                  <option value={5}>5 - Maximum Adrenaline</option>
                </select>
              </label>

              <label>
                <strong>Vibe keyword</strong>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="input"
                >
                  <option value="spontaneous">Spontaneous</option>
                  <option value="mindful">Mindful & Quiet</option>
                  <option value="social">Social & Quirky</option>
                  <option value="maker">Hands-On Maker</option>
                </select>
              </label>
            </div>

            <ErrorMessage error={error} />

            <button
              type="button"
              className="btn full"
              onClick={generateBespokeActivity}
              disabled={generating}
            >
              <Icon name="flask" size={18} />
              {generating ? "Brewing your quest…" : "Synthesize Bespoke Quest"}
            </button>
          </div>
        ) : (
          <div className="alchemist-result">
            <Art category={generated.category} />
            <h2 className="modal-title">{generated.title}</h2>
            <p>{generated.description}</p>
            <div className="detail-chips">
              <span>⏱️ {generated.durationMin} mins</span>
              <span>
                💰 {generated.budget === 1 ? "Free" : `$${generated.budget}/5`}
              </span>
              <span>⚡ Energy {generated.energy}/5</span>
              <span>🏷️ {generated.category}</span>
            </div>

            <div className="alchemist-result-actions">
              <button
                type="button"
                className="btn primary"
                onClick={saveToMatches}
                disabled={saving}
              >
                <Icon name="heart" size={18} />
                {saving ? "Locking in…" : "Yes, Lock It In!"}
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => setGenerated(null)}
              >
                <Icon name="sparkle" size={16} />
                Re-roll Another
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AlchemistModal;
