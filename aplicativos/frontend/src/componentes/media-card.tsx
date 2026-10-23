import Image from "next/image";

import { UiBadge } from "./ui-badge";

type MediaCardProps = {
  type: string;
  title: string;
  meta: string;
  coverUrl?: string | null;
  progress?: string;
  accent?: string;
};

export function MediaCard({ type, title, meta, coverUrl, progress, accent }: MediaCardProps) {
  return (
    <article className="media-card">
      <div className="media-card-art" aria-hidden="true">
        {coverUrl ? (
          <Image
            className="media-card-image"
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 300px"
          />
        ) : (
          <span className="media-card-orb" />
        )}
      </div>

      <div className="media-card-copy">
        <UiBadge tone="secondary" className="media-card-type">
          {type}
        </UiBadge>
        <h3>{title}</h3>
        <p>{meta}</p>
      </div>

      {(progress || accent) && (
        <div className="media-card-footer">
          <span>{progress}</span>
          {accent && <strong>{accent}</strong>}
        </div>
      )}
    </article>
  );
}
