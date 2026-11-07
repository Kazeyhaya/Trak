import { BadRequestException, Logger } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import { falha } from "../../comum/erros";

export const BUCKET_AVATARES = "avatars";
const TAMANHO_MAXIMO = 200 * 1024;
const EXTENSOES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

// Fotos de perfil no Supabase Storage (bucket publico "avatars", um arquivo por foto em
// avatars/<userId>/<hash>.<ext>). Antes a foto ia em base64 dentro de User.avatarUrl, e
// cada lista de perfis, feed ou notificacao carregava ate 60 KB por pessoa.
export class ArmazemAvatares {
  private readonly logger = new Logger(ArmazemAvatares.name);

  constructor(private readonly db: () => SupabaseClient) {}

  ehDataUri(valor: unknown): valor is string {
    return typeof valor === "string" && valor.startsWith("data:");
  }

  // Grava a imagem e devolve o link publico. O nome e o hash do conteudo: a mesma foto
  // reenviada reaproveita o arquivo, e uma foto nova ganha outro link (sem cache velho).
  // Sem o bucket (migracao 20261107000007 ainda nao aplicada), guarda o base64 como antes.
  async salvar(userId: string, dataUri: string): Promise<string> {
    const partes = DATA_URI.exec(dataUri);
    if (!partes) {
      throw new BadRequestException("Envie a foto em JPEG, PNG ou WebP.");
    }
    const [, tipo, base64] = partes;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > TAMANHO_MAXIMO) {
      throw new BadRequestException("A foto passou de 200 KB.");
    }

    const caminho = `${userId}/${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${EXTENSOES[tipo]}`;
    const armazem = this.db().storage.from(BUCKET_AVATARES);
    const { error } = await armazem.upload(caminho, bytes, {
      contentType: tipo,
      upsert: true,
      cacheControl: "31536000"
    });
    if (error && /bucket not found/i.test(error.message)) {
      this.logger.warn('Bucket "avatars" nao existe; a foto fica em base64 no perfil.');
      return dataUri;
    }
    falha(error);
    return armazem.getPublicUrl(caminho).data.publicUrl;
  }

  // Caminho dentro do bucket quando o link e de uma foto nossa; senao null.
  caminhoDe(url: string | null | undefined): string | null {
    const marcador = `/storage/v1/object/public/${BUCKET_AVATARES}/`;
    const inicio = url?.indexOf(marcador) ?? -1;
    if (!url || inicio < 0) {
      return null;
    }
    return decodeURIComponent(url.slice(inicio + marcador.length).split("?")[0]);
  }

  // Apaga a foto antiga. Falhar aqui so deixa um arquivo orfao: nao impede salvar o perfil.
  async remover(url: string | null | undefined) {
    const caminho = this.caminhoDe(url);
    if (!caminho) {
      return;
    }
    const { error } = await this.db().storage.from(BUCKET_AVATARES).remove([caminho]);
    if (error) {
      this.logger.warn(`Nao foi possivel apagar a foto antiga ${caminho}: ${error.message}`);
    }
  }

  // Todas as fotos da pessoa (exclusao da conta).
  async removerTodas(userId: string) {
    const armazem = this.db().storage.from(BUCKET_AVATARES);
    const { data, error } = await armazem.list(userId, { limit: 1000 });
    if (error || !data?.length) {
      return;
    }
    const { error: removerError } = await armazem.remove(data.map((arquivo) => `${userId}/${arquivo.name}`));
    if (removerError) {
      this.logger.warn(`Nao foi possivel apagar as fotos de ${userId}: ${removerError.message}`);
    }
  }
}
