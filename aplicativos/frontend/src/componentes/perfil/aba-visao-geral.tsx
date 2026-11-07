import Link from "next/link";
import type { Activity, ProfileAchievement, ProfileLibraryItem } from "../../lib/api";
import { getMediaTypeLabel, type CatalogItem } from "../../lib/catalogo-api";
import { miniaturaCapa } from "../../lib/imagens";
import { ActivityList } from "../activity-list";
import { AlertsSection } from "../alerts-section";
import { SectionHeading } from "../section-heading";
import { UiBadge } from "../ui-badge";
import { AchievementIcon } from "./icon-conquista";

type AbaVisaoGeralProps = {
  isOwner: boolean;
  currentYear: number;
  completedThisYear: ProfileLibraryItem[];
  annualGoal: number;
  goalPct: number;
  onGoalChange: (preset: number) => void;
  topFavorites: CatalogItem[];
  totalFavorites: number;
  onSelectTab: (tab: "library" | "favorites" | "achievements" | "activity") => void;
  achievements: ProfileAchievement[];
  unlockedBadges: ProfileAchievement[];
  activity: Activity[];
};

export function AbaVisaoGeral({
  isOwner,
  currentYear,
  completedThisYear,
  annualGoal,
  goalPct,
  onGoalChange,
  topFavorites,
  totalFavorites,
  onSelectTab,
  achievements,
  unlockedBadges,
  activity
}: AbaVisaoGeralProps) {
  return (
    <>
      {isOwner && (
        <>
          <section className="content-panel annual-goal-panel">
            <div className="annual-goal-header">
              <div>
                <h2>Meta de {currentYear}</h2>
                <p className="panel-note">
                  Você já concluiu <strong>{completedThisYear.length}</strong> de{" "}
                  <strong>{annualGoal}</strong> obras em {currentYear} ({goalPct}%).
                </p>
              </div>
              <div className="annual-goal-controls" role="group" aria-label="Escolher meta anual">
                {[12, 24, 36, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`filter-chip${annualGoal === preset ? " is-active" : ""}`}
                    onClick={() => onGoalChange(preset)}
                  >
                    {preset} obras
                  </button>
                ))}
              </div>
            </div>
            <div
              className="annual-goal-bar"
              role="progressbar"
              aria-valuenow={goalPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${goalPct}%` }} />
            </div>
            <div className="annual-goal-breakdown">
              <span>{completedThisYear.filter((i) => i.item.type === "MOVIE").length} filmes</span>
              <span>{completedThisYear.filter((i) => i.item.type === "SERIES").length} séries</span>
              <span>{completedThisYear.filter((i) => i.item.type === "GAME").length} jogos</span>
              <span>{completedThisYear.filter((i) => i.item.type === "BOOK").length} livros</span>
            </div>
          </section>

          <AlertsSection />
        </>
      )}

      {topFavorites.length > 0 && (
        <section className="content-panel">
          <div className="panel-header">
            <SectionHeading title="Favoritos em destaque" />
            <button
              type="button"
              className="filter-chip"
              onClick={() => onSelectTab("favorites")}
            >
              {isOwner
                ? `Organizar favoritos (${totalFavorites})`
                : `Ver todos (${totalFavorites})`}
            </button>
          </div>
          <div className="featured-showcase-grid">
            {topFavorites.map((item, index) => (
              <Link key={item.id} href={`/itens/${item.id}`} className="featured-showcase-card">
                <div className="featured-showcase-art">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={miniaturaCapa(item.coverUrl, 180) ?? item.coverUrl} alt={item.title} />
                  ) : (
                    <div className="media-card-fallback" aria-hidden="true">
                      <span>{item.title}</span>
                    </div>
                  )}
                  <div className="featured-showcase-overlay">
                    <UiBadge tone="secondary">#{index + 1}</UiBadge>
                  </div>
                </div>
                <div className="featured-showcase-body">
                  <span className="featured-showcase-type">{getMediaTypeLabel(item.type, item.subtype)}</span>
                  <h3>{item.title}</h3>
                  {item.releaseYear && <small>{item.releaseYear}</small>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {achievements.length > 0 && (
        <section className="content-panel">
          <div className="panel-header">
            <SectionHeading
              title={`Conquistas (${unlockedBadges.length}/${achievements.length})`}
            />
            <button
              type="button"
              className="filter-chip"
              onClick={() => onSelectTab("achievements")}
            >
              Ver todas
            </button>
          </div>
          <div className="achievements-grid">
            {achievements.slice(0, 6).map((badge) => {
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
      )}

      {!isOwner && (
        <section className="content-panel">
          <div className="panel-header">
            <SectionHeading title="Atividade recente" />
            {activity.length > 5 && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => onSelectTab("activity")}
              >
                Ver tudo ({activity.length})
              </button>
            )}
          </div>
          {activity.length > 0 ? (
            <ActivityList items={activity.slice(0, 5)} showAuthor={false} />
          ) : (
            <p className="panel-note">Nenhuma atividade ainda.</p>
          )}
        </section>
      )}
    </>
  );
}
