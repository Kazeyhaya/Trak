import type { Metadata } from "next";
import { AuthShell } from "../../componentes/auth-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Entrar",
  description: "Tela inicial de autenticação do Trak"
};

export default function EntrarPage() {
  return <AuthShell />;
}