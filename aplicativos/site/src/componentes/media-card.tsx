import { UiBadge } from "./ui-badge";

type MediaCardProps = {
  type: string;
  title: string;
  meta: string;
  progress?: string;
  accent?: string;
};

export function MediaCard({ type, title, meta, progress, accent }: MediaCardProps) {
  return (
    <article className="media-card">
      <div className="media-card-art" aria-hidden="true">
        <span className="media-card-orb" />
      </div>

      <div className="media-card-copy">
        <UiBadge tone="secondary" className="media-card-type">
          {type}
        </UiBadge>
        <h3>{title}</h3>
        <p>{meta}</p>
      </div>

      <div className="media-card-footer">
        <span>{progress ?? "Disponivel para tracking"}</span>
        <strong>{accent ?? "Abrir item"}</strong>
      </div>
    </article>
  );
}