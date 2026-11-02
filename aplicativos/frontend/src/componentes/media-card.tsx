"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Clapperboard, Gamepad2, Tv } from "lucide-react";

import { ehDominioOtimizado, miniaturaCapa } from "../lib/imagens";

type MediaCardProps = {
  type: string;
  mediaType?: string;
  title: string;
  meta: string;
  coverUrl?: string | null;
  progress?: string;
  accent?: string;
};

type CanonicalCategory = "MOVIE" | "SERIES" | "GAME" | "BOOK";

function resolverCategoria(type: string, mediaType?: string): CanonicalCategory {
  const code = (mediaType ?? "").toUpperCase();
  if (code === "GAME" || code === "BOOK" || code === "SERIES" || code === "MOVIE") {
    return code;
  }
  const norm = `${code} ${type}`.toUpperCase();
  if (norm.includes("GAME") || norm.includes("JOGO")) return "GAME";
  if (
    norm.includes("BOOK") ||
    norm.includes("LIVRO") ||
    norm.includes("MANGÁ") ||
    norm.includes("MANGA") ||
    norm.includes("HQ") ||
    norm.includes("COMIC")
  ) {
    return "BOOK";
  }
  if (
    norm.includes("SERIES") ||
    norm.includes("SÉRIE") ||
    norm.includes("DORAMA") ||
    norm.includes("NOVELA") ||
    norm.includes("TV") ||
    norm.includes("ANIME")
  ) {
    return "SERIES";
  }
  return "MOVIE";
}

function MediaIcon({ category }: { category: CanonicalCategory }) {
  switch (category) {
    case "GAME":
      return <Gamepad2 size={13} className="media-card-type-icon" aria-hidden="true" />;
    case "BOOK":
      return <BookOpen size={13} className="media-card-type-icon" aria-hidden="true" />;
    case "SERIES":
      return <Tv size={13} className="media-card-type-icon" aria-hidden="true" />;
    case "MOVIE":
      return <Clapperboard size={13} className="media-card-type-icon" aria-hidden="true" />;
  }
}

export function MediaCard({ type, mediaType, title, meta, coverUrl, progress, accent }: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const category = resolverCategoria(type, mediaType);
  const cover = miniaturaCapa(coverUrl, 200);

  const hasValidCover = Boolean(
    cover &&
      !imgError &&
      !cover.includes("/id/-1-") &&
      !cover.includes("/id/0-")
  );

  return (
    <article className="media-card" data-media-type={category}>
      <div className="media-card-art" aria-hidden="true">
        {hasValidCover ? (
          <Image
            className="media-card-image"
            src={cover!}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            quality={75}
            loading="lazy"
            unoptimized={!ehDominioOtimizado(cover)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="media-card-fallback">
            <MediaIcon category={category} />
            <span>{title}</span>
          </div>
        )}
      </div>

      <div className="media-card-copy">
        <div className="media-card-meta-row">
          <span className="media-card-type-label">
            <MediaIcon category={category} />
            <span>{type}</span>
          </span>
          {meta && <span className="media-card-year">{meta}</span>}
        </div>
        <h3 title={title}>{title}</h3>
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
