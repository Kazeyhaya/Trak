import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trak — filmes, séries, jogos e livros",
    short_name: "Trak",
    description: "Acompanhe o que você assiste, joga e lê.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06101c",
    theme_color: "#06101c",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Catálogo", url: "/catalogo" },
      { name: "Feed", url: "/feed" }
    ]
  };
}
