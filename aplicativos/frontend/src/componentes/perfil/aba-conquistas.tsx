import type { ProfileAchievement } from "../../lib/api";
import { SectionHeading } from "../section-heading";
import { AchievementIcon } from "./icon-conquista";

type AbaConquistasProps = {
  achievements: ProfileAchievement[];
  unlockedBadges: ProfileAchievement[];
};

export function AbaConquistas({ achievements, unlockedBadges }: AbaConquistasProps) {
  return (
    <section className="content-panel">
      <SectionHeading
        title={`Conquistas (${unlockedBadges.length}/${achievements.length})`}
      />
      <div className="achievements-grid">
        {achievements.map((badge) => {
          const pct = Math.min(100, Math.round((badge.current / Math.max(1, badge.target)) * 100));
          return (
            <div
              key={badge.id}
              className={`achievement-card${badge.unlocked ? " is-unlocked" : " is-locked"}`}
            >
              <div className="achievement-icon" aria-hidden="true">
                <AchievementIcon icon={badge.icon} />
              </div>
              <div className="achievement-body">
                <div className="achievement-header">
                  <strong>{badge.title}</strong>
                  <span className="achievement-counter">
                    {badge.current}/{badge.target}
                  </span>
                </div>
                <p>{badge.description}</p>
                <div className="achievement-progress-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
