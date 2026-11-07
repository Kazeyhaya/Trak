// Converte as fotos de perfil antigas (base64 em "User"."avatarUrl") em arquivos no
// bucket "avatars" do Supabase Storage, gravando o link no lugar. Rode uma vez, depois
// da migracao 20261107000007:
//
//   node --env-file=aplicativos/backend/.env scripts/migrar-avatares.mjs            (so conta)
//   node --env-file=aplicativos/backend/.env scripts/migrar-avatares.mjs --aplicar  (converte)
//
// Usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Pode rodar de novo sem problema: so
// pega quem ainda esta em base64, e o nome do arquivo e o hash do conteudo.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const BUCKET = "avatars";
const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const aplicar = process.argv.includes("--aplicar");

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: --env-file=aplicativos/backend/.env).");
  process.exit(1);
}
const db = createClient(url, chave, { auth: { persistSession: false } });

const pendentes = [];
for (let de = 0; ; de += 500) {
  const { data, error } = await db
    .from("User")
    .select("id,avatarUrl")
    .like("avatarUrl", "data:%")
    .order("id")
    .range(de, de + 499);
  if (error) {
    console.error(`Erro ao ler perfis: ${error.message}`);
    process.exit(1);
  }
  pendentes.push(...data);
  if (data.length < 500) {
    break;
  }
}

console.log(`${pendentes.length} foto(s) em base64.`);
if (!aplicar) {
  console.log("Nada foi alterado. Rode com --aplicar para converter.");
  process.exit(0);
}

let convertidas = 0;
const falhas = [];
for (const { id, avatarUrl } of pendentes) {
  const partes = DATA_URI.exec(avatarUrl);
  if (!partes) {
    falhas.push(`${id}: formato nao suportado (${avatarUrl.slice(0, 30)}...)`);
    continue;
  }
  const [, tipo, base64] = partes;
  const bytes = Buffer.from(base64, "base64");
  const caminho = `${id}/${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${EXTENSOES[tipo]}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(caminho, bytes, { contentType: tipo, upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    falhas.push(`${id}: ${uploadError.message}`);
    continue;
  }
  const link = db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
  // So troca se a foto ainda for a mesma (a pessoa pode ter mudado enquanto o script rodava).
  const { error: updateError } = await db.from("User").update({ avatarUrl: link }).eq("id", id).eq("avatarUrl", avatarUrl);
  if (updateError) {
    falhas.push(`${id}: ${updateError.message}`);
    continue;
  }
  convertidas++;
}

console.log(`${convertidas} convertida(s).`);
if (falhas.length > 0) {
  console.log(`${falhas.length} falha(s):\n  ${falhas.join("\n  ")}`);
  process.exitCode = 1;
}
