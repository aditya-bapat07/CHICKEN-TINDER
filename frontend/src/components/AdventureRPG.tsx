import { Match } from "../api";
import { Icon } from "./UI";

interface AdventureRPGProps {
  matches: Match[];
}

export function AdventureRPG({ matches }: AdventureRPGProps) {
  const completed = matches.filter((m) => m.status === "done");
  const totalCompleted = completed.length;
  const xp = totalCompleted * 60 + matches.length * 15;
  const level = Math.floor(xp / 100) + 1;
  const nextLevelXp = level * 100;
  const currentLevelProgress = Math.min(
    100,
    Math.round(((xp % 100) / 100) * 100),
  );

  const categoryCounts = completed.reduce<Record<string, number>>((acc, m) => {
    const cat = m.activity.category;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const archetypes = [
    {
      name: "Trailblazer",
      icon: "tree",
      color: "#68a063",
      count: (categoryCounts.outdoor || 0) + (categoryCounts.fitness || 0),
      desc: "Conquer the elements & open terrain",
    },
    {
      name: "Master Chef",
      icon: "sparkle",
      color: "#e67e22",
      count: categoryCounts.culinary || 0,
      desc: "Turn random ingredients into feasts",
    },
    {
      name: "Creative Artisan",
      icon: "spark",
      color: "#e84393",
      count: categoryCounts.creative || 0,
      desc: "Craft, design, and invent hands-on",
    },
    {
      name: "Zen Master",
      icon: "moon",
      color: "#0984e3",
      count: (categoryCounts.solo || 0) + (categoryCounts.relaxation || 0),
      desc: "Reclaim peace, mindfulness, and recharge",
    },
  ];

  const badges = [
    {
      id: "first_done",
      label: "First Spark",
      desc: "Conquered your first real activity",
      icon: "bolt",
      unlocked: totalCompleted >= 1,
    },
    {
      id: "hat_trick",
      label: "Hat Trick",
      desc: "Conquered 3+ activities",
      icon: "trophy",
      unlocked: totalCompleted >= 3,
    },
    {
      id: "adventurer",
      label: "Boredom Slayer",
      desc: "Completed 5+ activities",
      icon: "party",
      unlocked: totalCompleted >= 5,
    },
    {
      id: "collector",
      label: "Curator",
      desc: "Saved 10+ ideas in your collection",
      icon: "heart",
      unlocked: matches.length >= 10,
    },
  ];

  return (
    <div className="panel r傷-panel">
      <div className="rpg-header">
        <div>
          <span className="eyebrow">YOUR ADVENTURE RPG</span>
          <h2>Level {level} Explorer</h2>
          <p>{xp} XP earned across your real-world conquests</p>
        </div>
        <div className="level-badge">
          <span>LVL</span>
          <strong>{level}</strong>
        </div>
      </div>

      <div className="xp-progress-bar">
        <div
          className="xp-progress-fill"
          style={{ width: `${currentLevelProgress}%` }}
        />
      </div>
      <div className="xp-label">
        <span>
          {xp % 100} / 100 XP to Level {level + 1}
        </span>
        <span>{totalCompleted} completed quests</span>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
        Archetypes & Mastery
      </h3>
      <div className="archetypes-grid">
        {archetypes.map((arch) => (
          <div key={arch.name} className="archetype-card">
            <span
              className="stat-icon"
              style={{ background: `${arch.color}20`, color: arch.color }}
            >
              <Icon name={arch.icon} size={18} />
            </span>
            <div className="archetype-info">
              <strong>{arch.name}</strong>
              <small>{arch.count} quests conquered</small>
            </div>
            <span className="archetype-rank">
              Rank {Math.floor(arch.count / 2) + 1}
            </span>
          </div>
        ))}
      </div>

      <hr style={{ margin: "20px 0" }} />

      <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
        Milestone Badges
      </h3>
      <div className="badges-grid">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`badge-tile ${b.unlocked ? "unlocked" : "locked"}`}
            title={b.desc}
          >
            <span className="badge-icon">
              <Icon name={b.icon} size={20} />
            </span>
            <strong>{b.label}</strong>
            <small>{b.unlocked ? "Unlocked" : "Locked"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdventureRPG;
