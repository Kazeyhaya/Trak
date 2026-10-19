import { gerarIcone } from "../lib/icone";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return gerarIcone(size.width);
}
