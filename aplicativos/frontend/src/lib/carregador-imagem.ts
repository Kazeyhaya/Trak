import { capaNaLargura } from "./imagens";

// Loader do next/image. Em vez do otimizador da Vercel (cobrado por imagem e com cota
// no plano gratuito, que devolvia 402 quando acabava), pede o tamanho certo direto ao
// provedor da capa: TMDB, RAWG e IGDB ja servem varias larguras prontas.
export default function carregadorImagem({ src, width }: { src: string; width: number }) {
  return capaNaLargura(src, width);
}
