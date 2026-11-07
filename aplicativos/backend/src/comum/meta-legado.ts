import { SupabaseClient } from "@supabase/supabase-js";

import { falha } from "./erros";

// Bancos com o schema antigo (sem as colunas de perfil em "User") guardam avatar, tema e
// fontes importadas numa linha de Activity com id = userId. A gravacao e um upsert
// transacional (trak_salvar_meta); sem essa funcao no banco, faz o upsert direto.
export async function gravarMetaLegado(db: SupabaseClient, userId: string, meta: Record<string, unknown>) {
  const { error } = await db.rpc("trak_salvar_meta", { p_user_id: userId, p_data: meta });
  if (!error) {
    return;
  }
  const { error: upsertError } = await db
    .from("Activity")
    .upsert({ id: userId, userId, type: "STATUS", mediaItemId: null, data: meta });
  falha(upsertError);
}
