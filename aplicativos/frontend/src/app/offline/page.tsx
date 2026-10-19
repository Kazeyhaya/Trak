import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trak | Sem conexão", robots: { index: false } };

// Estatica: o service worker guarda esta pagina para exibir sem internet.
export default function OfflinePage() {
  return (
    <main className="auth-shell">
      <section className="content-hero">
        <div>
          <h1>Você está sem conexão.</h1>
          <p>Assim que a internet voltar, é só recarregar a página.</p>
        </div>
      </section>
    </main>
  );
}
