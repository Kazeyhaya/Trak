import type { Metadata } from "next";
import { AuthShell } from "../../componentes/auth-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Entrar",
  description: "Entre ou crie sua conta no Trak"
};

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell next={next} />;
}