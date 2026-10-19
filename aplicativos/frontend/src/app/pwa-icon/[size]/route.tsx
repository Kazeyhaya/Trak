import { gerarIcone } from "../../../lib/icone";

const TAMANHOS = [192, 512];

export const dynamicParams = false;

export function generateStaticParams() {
  return TAMANHOS.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return gerarIcone(Number(size));
}
