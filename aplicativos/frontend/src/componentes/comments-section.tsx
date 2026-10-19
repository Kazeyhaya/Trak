"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "./section-heading";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import {
  CommentEntry,
  createComment,
  deleteComment,
  errorMessage,
  getComments,
  reportComment,
  setCommentLike
} from "../lib/api";

const MAX_LENGTH = 1000;
const REPORT_REASONS = ["Spoiler sem aviso", "Ofensivo ou discurso de ódio", "Spam", "Outro"];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export function CommentsSection({ mediaItemId }: { mediaItemId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    // Espera a sessao para a lista ja vir com curtidas e autoria do usuario.
    if (authLoading) {
      return;
    }
    let active = true;

    getComments(mediaItemId)
      .then((data) => active && setComments(data))
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoaded(true));

    return () => {
      active = false;
    };
  }, [mediaItemId, authLoading, userId]);

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

  async function handleReport(comment: CommentEntry, reason: string) {
    setReporting(null);
    try {
      await reportComment(comment.id, reason);
      setNotice("Denúncia enviada. Obrigado por ajudar a moderar.");
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

      {user ? (
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
      ) : (
        !authLoading && (
          <p className="panel-note">
            <Link href={`/entrar?next=${encodeURIComponent(`/itens/${mediaItemId}`)}`}>Entre</Link> para comentar.
          </p>
        )
      )}

      {notice && (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      )}
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
                  aria-label={`Curtir (${comment.likesCount})`}
                  disabled={!user}
                  onClick={() => handleLike(comment)}
                >
                  ♥ {comment.likesCount}
                </button>
                {comment.isOwn && (
                  <button type="button" className="filter-chip" onClick={() => handleDelete(comment)}>
                    Apagar
                  </button>
                )}
                {user && !comment.isOwn && (
                  <button
                    type="button"
                    className="filter-chip"
                    aria-expanded={reporting === comment.id}
                    onClick={() => setReporting(reporting === comment.id ? null : comment.id)}
                  >
                    Denunciar
                  </button>
                )}
              </div>
            </div>
            {reporting === comment.id && (
              <div className="status-chips" role="group" aria-label="Motivo da denúncia">
                {REPORT_REASONS.map((reason) => (
                  <button key={reason} type="button" className="filter-chip" onClick={() => handleReport(comment, reason)}>
                    {reason}
                  </button>
                ))}
              </div>
            )}
          </UiCard>
        ))}
      </div>
    </section>
  );
}
