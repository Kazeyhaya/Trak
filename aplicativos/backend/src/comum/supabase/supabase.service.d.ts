import { SupabaseClient } from "@supabase/supabase-js";
export declare class SupabaseService {
    private client;
    getClient(): SupabaseClient<any, "public", any>;
}
