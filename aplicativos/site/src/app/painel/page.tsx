import type { Metadata } from "next";

import { TrackingShell } from "../../componentes/tracking-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Painel",
  description: "Painel pessoal com tracking e timeline do Trak"
};

export default function PainelPage() {
  return <TrackingShell />;
}