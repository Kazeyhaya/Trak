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
}
