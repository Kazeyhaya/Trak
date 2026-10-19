import { ImageResponse } from "next/og";

// Icone do app desenhado em codigo (sem PNGs no repositorio).
export function gerarIcone(tamanho: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c1726 0%, #06101c 100%)",
          color: "#7ce1c7",
          fontSize: tamanho * 0.62,
          fontWeight: 800,
          letterSpacing: "-0.06em"
        }}
      >
        T
      </div>
    ),
    { width: tamanho, height: tamanho }
  );
}
