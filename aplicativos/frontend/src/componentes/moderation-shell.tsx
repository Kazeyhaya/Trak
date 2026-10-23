"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { errorMessage, getReports, moderateReport, Report, ReportStatus } from "../lib/api";

const FILTERS: Array<{ value: ReportStatus | ""; label: string }> = [
  { value: "OPEN", label: "Abertas" },
  { value: "REVIEWING", label: "Em análise" },
  { value: "RESOLVED", label: "Resolvidas" },
  { value: "DISMISSED", label: "Descartadas" },
  { value: "", label: "Todas" }
];

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Aberta",
  REVIEWING: "Em análise",
  RESOLVED: "Resolvida",
  DISMISSED: "Descartada"
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function ModerationShell() {
  const [filter, setFilter] = useState<ReportStatus | "">("OPEN");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (status: ReportStatus | "") => {
    setError(null);
    try {
      setReports(await getReports(status || undefined));
    } catch (err) {
      setReports([]);
      // 403 quando o e-mail nao esta em ADMIN_EMAILS.
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    let active = true;
    getReports(filter || undefined)
      .then((data) => active && setReports(data))
      .catch((err) => {
        if (active) {
          setReports([]);
          // 403 quando o e-mail nao esta em ADMIN_EMAILS.
          setError(errorMessage(err));
        }
      });
    return () => {
      active = false;
    };
  }, [filter]);

  async function act(report: Report, status: ReportStatus, remover = false) {
    setBusy(report.id);
    setError(null);
    try {
      await moderateReport(report.id, status, remover);
      await load(filter);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Moderação</h1>
          <p>Denúncias de comentários, das mais antigas para as mais novas.</p>
        </div>
      </section>

      <div className="filter-chips" role="group" aria-label="Filtrar por status">
        {FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`filter-chip${filter === option.value ? " is-active" : ""}`}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <section className="content-panel">
        {!reports && <p className="panel-note">Carregando…</p>}
        {reports && reports.length === 0 && !error && <p className="panel-note">Nenhuma denúncia aqui. 🎉</p>}

        <div className="comment-list">
          {reports?.map((report) => (
            <UiCard key={report.id} className="report-item">
              <div className="comment-meta">
                <span>
                  <UiBadge tone={report.status === "OPEN" ? "primary" : "secondary"}>{STATUS_LABEL[report.status]}</UiBadge>{" "}
                  <strong>{report.reason}</strong>
                  {report.reportsForComment > 1 && ` · ${report.reportsForComment} denúncias neste comentário`}
                </span>
                <time dateTime={report.createdAt}>{dateFormatter.format(new Date(report.createdAt))}</time>
              </div>
              {report.details && <p className="report-meta">Detalhes: {report.details}</p>}
              <blockquote>{report.comment?.content ?? "Comentário já removido."}</blockquote>
              {report.comment && (
                <p className="report-meta">
                  Em <Link href={`/itens/${report.comment.mediaItemId}`}>{report.item?.title ?? report.comment.mediaItemId}</Link>
                </p>
              )}
              <div className="item-next-actions">
                <UiButton
                  disabled={busy === report.id || !report.comment || report.comment.content === "[comentário removido]"}
                  onClick={() => act(report, "RESOLVED", true)}
                >
                  Remover comentário
                </UiButton>
                <UiButton variant="secondary" disabled={busy === report.id} onClick={() => act(report, "DISMISSED")}>
                  Descartar denúncia
                </UiButton>
                {report.status === "OPEN" && (
                  <UiButton variant="secondary" disabled={busy === report.id} onClick={() => act(report, "REVIEWING")}>
                    Marcar em análise
                  </UiButton>
                )}
              </div>
            </UiCard>
          ))}
        </div>
      </section>
    </main>
  );
}
