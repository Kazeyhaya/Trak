"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "./section-heading";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import {
  ApiError,
  CommentEntry,
  createComment,
  deleteComment,
  getComments,
  setCommentLike
} from "../lib/api";

const MAX_LENGTH = 1000;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente novamente.";
}

export function CommentsSection({ mediaItemId }: { mediaItemId: string }) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getComments(mediaItemId)
      .then((data) => active && setComments(data))
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoaded(true));

    return () => {
      active = false;
    };
  }, [mediaItemId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const created = await createComment(mediaItemId, content.trim());
      setComments((current) => [created, ...current]);
      setContent("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleLike(comment: CommentEntry) {
    const liked = !comment.likedByUser;
    try {
      const { likesCount } = await setCommentLike(comment.id, liked);
      setComments((current) =>
        current.map((c) => (c.id === comment.id ? { ...c, likedByUser: liked, likesCount } : c))
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(comment: CommentEntry) {
    try {
      await deleteComment(comment.id);
      setComments((current) => current.filter((c) => c.id !== comment.id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="content-panel">
      <SectionHeading
        eyebrow="Comunidade"
        title="Comentários"
        description="O que as pessoas estão achando deste item."
      />

      <form className="field-stack comment-form" onSubmit={handleSubmit}>
        <label>
          <span className="sr-only">Escreva um comentário</span>
          <textarea
            value={content}
            maxLength={MAX_LENGTH}
            rows={3}
            placeholder="Escreva um comentário…"
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <div className="comment-form-footer">
          <span>
            {content.length}/{MAX_LENGTH}
          </span>
          <UiButton type="submit" disabled={sending || !content.trim()}>
            {sending ? "Publicando…" : "Publicar"}
          </UiButton>
        </div>
      </form>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="comment-list">
        {!loaded && <p className="panel-note">Carregando comentários…</p>}
        {loaded && comments.length === 0 && !error && (
          <p className="panel-note">Ninguém comentou ainda. Seja a primeira pessoa!</p>
        )}
        {comments.map((comment) => (
          <UiCard key={comment.id} className="comment-item">
            <p>{comment.content}</p>
            <div className="comment-meta">
              <time dateTime={comment.createdAt}>{dateFormatter.format(new Date(comment.createdAt))}</time>
              <div className="comment-actions">
                <button
                  type="button"
                  className={`filter-chip${comment.likedByUser ? " is-active" : ""}`}
                  aria-pressed={comment.likedByUser}
                  onClick={() => handleLike(comment)}
                >
                  ♥ {comment.likesCount}
                </button>
                {comment.isOwn && (
                  <button type="button" className="filter-chip" onClick={() => handleDelete(comment)}>
                    Apagar
                  </button>
                )}
              </div>
            </div>
          </UiCard>
        ))}
      </div>
    </section>
  );
}
