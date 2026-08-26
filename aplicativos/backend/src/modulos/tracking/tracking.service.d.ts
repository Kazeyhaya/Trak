import { SupabaseService } from "../../comum/supabase/supabase.service";
export declare class TrackingService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    private resolverUserId;
    listar(authUserId: string): Promise<{
        id: any;
        mediaItemId: any;
        status: any;
        progress: any;
        favorite: any;
        updatedAt: any;
    }[]>;
    salvar(authUserId: string, mediaItemId: string, payload: {
        status?: string;
        progress?: number;
        favorite?: boolean;
    }): Promise<{
        id: any;
        mediaItemId: any;
        status: any;
        progress: any;
        favorite: any;
        updatedAt: any;
    }>;
}
