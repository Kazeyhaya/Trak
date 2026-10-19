import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private client: SupabaseClient | null = null;

  getClient() {
    if (this.client) {
      return this.client;
    }

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException(
        "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente."
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    });
    return this.client;
  }

  // Converte o id do Supabase Auth no id da tabela "User". Quando o usuario
  // ainda nao tem linha em "User", usa o proprio id do Auth.
  async resolverUserId(authUserId: string) {
    const { data, error } = await this.getClient()
      .from("User")
      .select("id")
      .eq("authUserId", authUserId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.id ? (data.id as string) : authUserId;
  }
}
