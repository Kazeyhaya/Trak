import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
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
  }

  getClient() {
    return this.client;
  }
}
