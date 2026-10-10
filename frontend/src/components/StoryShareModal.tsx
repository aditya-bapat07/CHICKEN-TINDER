import { useEffect, useState, useRef } from "react";
import { Activity, Match } from "../api";
import { Icon, Modal } from "./UI";

interface StoryShareModalProps {
  match: Match;
  close: () => void;
  initialPhotoUrl?: string;
  onPhotoSaved?: (matchId: string, photoUrl: string) => void;
}

export default function StoryShareModal({
  match,
  close,
  initialPhotoUrl = "",
  onPhotoSaved,
}: StoryShareModalProps) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<"strava" | "sunset" | "mint" | "obsidian">(
    "strava",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const activity = match.activity;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    const drawStory = (bgImg?: HTMLImageElement) => {
      // Background
      if (bgImg) {
        // Draw image covering canvas
        const scale = Math.max(
          canvas.width / bgImg.width,
          canvas.height / bgImg.height,
        );
        const x = (canvas.width - bgImg.width * scale) / 2;
        const y = (canvas.height - bgImg.height * scale) / 2;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);

        // Dark gradient scrim
        const scrim = ctx.createLinearGradient(0, 0, 0, canvas.height);
        scrim.addColorStop(0, "rgba(10, 12, 10, 0.75)");
        scrim.addColorStop(0.5, "rgba(10, 12, 10, 0.4)");
        scrim.addColorStop(1, "rgba(10, 12, 10, 0.9)");
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const bgColors = {
          strava: ["#141517", "#1e2124", "#0e0f10"],
          sunset: ["#ff4e50", "#f9d423", "#d93b27"],
          mint: ["#0b1f17", "#133f30", "#05130e"],
          obsidian: ["#121314", "#202225", "#0a0b0c"],
        };
        const grad = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const colors = bgColors[theme] || bgColors.strava;
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.5, colors[1]);
        grad.addColorStop(1, colors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Header Branding
      ctx.fillStyle = theme === "strava" ? "#fc5200" : "#ffffff";
      ctx.font = "800 38px 'Manrope', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("CHICKEN TINDER", 84, 140);

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "600 24px 'DM Sans', sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("BOREDOM CURED • REAL LIFE UNLOCKED", 84, 185);

      // Strava-Style Completed Badge
      ctx.fillStyle = theme === "strava" ? "#fc5200" : "#ffffff";
      ctx.beginPath();
      ctx.roundRect(84, 270, 480, 68, 34);
      ctx.fill();

      ctx.fillStyle = theme === "strava" ? "#ffffff" : "#1a1d20";
      ctx.font = "800 28px 'Manrope', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✔ ACTIVITY CONQUERED", 84 + 240, 314);
      ctx.textAlign = "left";

      // Card Panel
      const cardY = 380;
      const cardW = 912;
      const cardH = 920;
      ctx.fillStyle = "rgba(22, 24, 28, 0.8)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(84, cardY, cardW, cardH, 36);
      ctx.fill();
      ctx.stroke();

      // Category Pill
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(134, cardY + 60, 240, 48, 24);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 22px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(activity.category.toUpperCase(), 134 + 120, cardY + 92);
      ctx.textAlign = "left";

      // Date Stamp
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "600 22px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        new Date()
          .toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          .toUpperCase(),
        84 + cardW - 50,
        cardY + 92,
      );
      ctx.textAlign = "left";

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 60px 'Manrope', sans-serif";
      const words = activity.title.split(" ");
      let line = "";
      let titleY = cardY + 220;
      for (const word of words) {
        const next = `${line} ${word}`.trim();
        if (ctx.measureText(next).width > cardW - 100) {
          ctx.fillText(line, 134, titleY);
          titleY += 80;
          line = word;
        } else {
          line = next;
        }
      }
      ctx.fillText(line, 134, titleY);

      // Description
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "400 28px 'DM Sans', sans-serif";
      const descWords = (activity.description || "").split(" ");
      let descLine = "";
      let descY = titleY + 65;
      for (const word of descWords.slice(0, 28)) {
        const next = `${descLine} ${word}`.trim();
        if (ctx.measureText(next).width > cardW - 100) {
          ctx.fillText(descLine, 134, descY);
          descY += 40;
          descLine = word;
        } else {
          descLine = next;
        }
      }
      ctx.fillText(descLine, 134, descY);

      // Strava Metric Stats
      const statY = cardY + 560;
      const statW = (cardW - 140) / 3;
      const stats = [
        { label: "TIME INVESTED", val: `${activity.durationMin} MIN` },
        { label: "EFFORT LEVEL", val: `⚡ ${activity.energy}/5` },
        {
          label: "BUDGET",
          val: activity.budget === 1 ? "FREE" : `$${activity.budget}/5`,
        },
      ];

      stats.forEach((st, i) => {
        const sx = 134 + i * (statW + 20);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.roundRect(sx, statY, statW, 150, 18);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "700 18px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(st.label, sx + statW / 2, statY + 45);

        ctx.fillStyle = theme === "strava" ? "#fc5200" : "#ffffff";
        ctx.font = "800 36px 'Manrope', sans-serif";
        ctx.fillText(st.val, sx + statW / 2, statY + 105);
      });
      ctx.textAlign = "left";

      // Footer
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 36px 'Manrope', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "CURE YOUR BOREDOM ON CHICKEN TINDER",
        canvas.width / 2,
        1460,
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "600 24px 'DM Sans', sans-serif";
      ctx.fillText("v0-chicken-tinder.vercel.app", canvas.width / 2, 1515);

      setImage(canvas.toDataURL("image/png"));
    };

    if (photoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawStory(img);
      img.onerror = () => drawStory();
      img.src = photoUrl;
    } else {
      drawStory();
    }
  }, [match.activity, photoUrl, theme]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotoUrl(dataUrl);
        if (onPhotoSaved) onPhotoSaved(match.id, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  async function share() {
    if (!image) return;
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], "chicken-tinder-story.png", {
        type: "image/png",
      });
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          files: [file],
          title: match.activity.title,
          text: `Conquered "${match.activity.title}" on Chicken Tinder! 🐔✨`,
        });
        return;
      }
      downloadImage();
    } catch {
      downloadImage();
    }
  }

  function downloadImage() {
    const link = document.createElement("a");
    link.href = image;
    link.download = `chicken-tinder-story-${match.activity.title.slice(0, 20)}.png`;
    link.click();
    setMessage(
      "Story image downloaded! Open Instagram and add it to your story.",
    );
  }

  function copyImage() {
    if (navigator.clipboard && navigator.clipboard.write) {
      void (async () => {
        try {
          const blob = await (await fetch(image)).blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          setMessage(
            "Image copied to clipboard! Paste directly into Instagram Stories.",
          );
        } catch {
          downloadImage();
        }
      })();
    } else {
      downloadImage();
    }
  }

  return (
    <Modal title="Strava-Style Instagram Story" close={close}>
      <div className="story-share-container">
        <div className="story-preview-col">
          {image && (
            <img
              className="story-canvas"
              src={image}
              alt="Story preview"
              style={{
                width: "260px",
                height: "462px",
                borderRadius: "18px",
                objectFit: "cover",
              }}
            />
          )}
          <span className="story-hint">
            <Icon name="camera" size={14} /> 1080×1920 Story Card
          </span>
        </div>

        <div className="story-controls-col">
          <div className="story-section">
            <label className="story-label">
              <Icon name="camera" size={16} /> Photo Proof
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoSelect}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn secondary small"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="camera" size={15} />
                {photoUrl ? "Change Photo" : "Upload Memory Photo"}
              </button>
              {photoUrl && (
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() => {
                    setPhotoUrl("");
                    if (onPhotoSaved) onPhotoSaved(match.id, "");
                  }}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {!photoUrl && (
            <div className="story-section">
              <label className="story-label">Theme Vibe</label>
              <div className="theme-chips">
                {(["strava", "sunset", "mint", "obsidian"] as const).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      className={`theme-chip ${theme === t ? "active" : ""}`}
                      onClick={() => setTheme(t)}
                    >
                      {t === "strava"
                        ? "⚡ Strava Flame"
                        : t === "sunset"
                          ? "🌅 Sunset"
                          : t === "mint"
                            ? "🌿 Neon Mint"
                            : "🖤 Obsidian"}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {message && (
            <div className="story-status-alert" role="status">
              {message}
            </div>
          )}

          <div className="story-actions">
            <button
              type="button"
              className="btn primary story-main-btn"
              onClick={share}
            >
              <Icon name="party" size={17} /> Share to Instagram Story
            </button>
            <div className="story-secondary-actions">
              <button
                type="button"
                className="btn secondary small"
                onClick={downloadImage}
              >
                <Icon name="check" size={15} /> Download PNG
              </button>
              <button
                type="button"
                className="btn secondary small"
                onClick={copyImage}
              >
                <Icon name="spark" size={15} /> Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
