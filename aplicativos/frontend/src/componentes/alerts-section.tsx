"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "./section-heading";
import { UiBadge } from "./ui-badge";
import { UiCard } from "./ui-card";
import { Alert, getAlerts } from "../lib/api";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

const kindLabel: Record<Alert["kind"], string> = {
  NEW_EPISODE: "Novo",
  UPCOMING_EPISODE: "Em breve",
  UPCOMING_RELEASE: "Estreia"
};

// Novos episodios e estreias do que o usuario acompanha (GET /alertas).
export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let active = true;
    getAlerts()
      .then((data) => active && setAlerts(data))
      .catch(() => active && setAlerts([]));
    return () => {
      active = false;
    };
  }, []);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <section className="content-panel">
      <SectionHeading
        eyebrow="Alertas"
        title="Novidades do que você acompanha"
        description="Episódios novos e estreias dos próximos dias."
      />
      <div className="alert-list">
        {alerts.map((alert) => (
          <UiCard key={`${alert.mediaItemId}-${alert.kind}`} className="alert-item">
            <div>
              <strong>
                <Link href={`/itens/${alert.mediaItemId}`}>{alert.item?.title ?? alert.mediaItemId}</Link>
              </strong>
              <span>
                {alert.label} · {dateFormatter.format(new Date(`${alert.date}T00:00:00Z`))}
              </span>
            </div>
            <UiBadge tone={alert.kind === "NEW_EPISODE" ? "primary" : "secondary"}>{kindLabel[alert.kind]}</UiBadge>
          </UiCard>
        ))}
      </div>
    </section>
  );
}
