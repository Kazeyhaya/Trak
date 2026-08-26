import { SupabaseService } from "../../comum/supabase/supabase.service";
export declare class FavoritosService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    private resolverUserId;
    listar(authUserId: string): Promise<{
        mediaItemId: any;
        createdAt: any;
        item: {
            id: any;
            externalId: any;
            source: any;
            type: any;
            title: any;
            coverUrl: any;
            synopsis: any;
            releaseYear: any;
        };
    }[]>;
    adicionar(authUserId: string, mediaItemId: string): Promise<{
        ok: boolean;
    }>;
    remover(authUserId: string, mediaItemId: string): Promise<{
        ok: boolean;
    }>;
}
