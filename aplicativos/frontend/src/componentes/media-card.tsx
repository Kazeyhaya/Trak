"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Clapperboard, Gamepad2, Tv } from "lucide-react";

import { UiBadge } from "./ui-badge";

type MediaCardProps = {
  type: string;
  mediaType?: string;
  title: string;
  meta: string;
  coverUrl?: string | null;
  progress?: string;
  accent?: string;
};

function MediaIcon({ type, mediaType }: { type: string; mediaType?: string }) {
  const norm = `${mediaType ?? ""} ${type}`.toUpperCase();

  if (norm.includes("GAME") || norm.includes("JOGO")) {
    return <Gamepad2 size={14} className="media-card-type-icon" aria-hidden="true" />;
  }
  if (
    norm.includes("BOOK") ||
    norm.includes("LIVRO") ||
    norm.includes("MANGÁ") ||
    norm.includes("MANGA") ||
    norm.includes("HQ") ||
    norm.includes("COMIC")
  ) {
    return <BookOpen size={14} className="media-card-type-icon" aria-hidden="true" />;
  }
  if (
    norm.includes("SERIES") ||
    norm.includes("SÉRIE") ||
    norm.includes("DORAMA") ||
    norm.includes("NOVELA") ||
    norm.includes("TV")
  ) {
    return <Tv size={14} className="media-card-type-icon" aria-hidden="true" />;
  }
  return <Clapperboard size={14} className="media-card-type-icon" aria-hidden="true" />;
}

export function MediaCard({ type, mediaType, title, meta, coverUrl, progress, accent }: MediaCardProps) {
  const [imgError, setImgError] = useState(false);

  const hasValidCover = Boolean(
    coverUrl &&
    !imgError &&
    !coverUrl.includes("/id/-1-") &&
    !coverUrl.includes("/id/0-")
  );

  return (
    <article className="media-card">
      <div className="media-card-art" aria-hidden="true">
        {hasValidCover ? (
          <Image
            className="media-card-image"
            src={coverUrl!.replace("/media/resize/640/-/games/", "/media/games/")}
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 480px"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="media-card-orb" />
        )}
      </div>

      <div className="media-card-copy">
        <UiBadge tone="secondary" className="media-card-type">
          <MediaIcon type={type} mediaType={mediaType} />
          <span>{type}</span>
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
