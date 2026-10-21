import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    // So informa SE cada chave existe, nunca o valor.
    const configurada = (variavel: string) => Boolean(process.env[variavel]?.trim());
    return {
      status: "ok",
      service: "trak-api",
      sources: {
        tmdb: configurada("TMDB_API_KEY"),
        rawg: configurada("RAWG_API_KEY"),
        openLibrary: true,
        steam: configurada("STEAM_API_KEY"),
        supabase: configurada("SUPABASE_URL") && configurada("SUPABASE_SERVICE_ROLE_KEY")
      }
    };
  }
}
