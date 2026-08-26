import { SupabaseService } from "../../comum/supabase/supabase.service";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";
export declare class ComentariosService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    private resolverUserId;
    listarPorMidia(mediaItemId: string, authUserId: string): Promise<{
        likesCount: number;
        likedByUser: boolean;
        id: any;
        userId: any;
        mediaItemId: any;
        content: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    criar(mediaItemId: string, authUserId: string, content: string): Promise<{
        likesCount: number;
        likedByUser: boolean;
        id: any;
        userId: any;
        mediaItemId: any;
        content: any;
        createdAt: any;
        updatedAt: any;
    }>;
    curtir(comentarioId: string, authUserId: string): Promise<{
        commentId: string;
        likesCount: number;
    }>;
    descurtir(comentarioId: string, authUserId: string): Promise<{
        commentId: string;
        likesCount: number;
    }>;
    private contarCurtidas;
    denunciar(comentarioId: string, authUserId: string, payload: DenunciarComentarioDto): Promise<{
        id: any;
        commentId: any;
        reporterUserId: any;
        reason: any;
        details: any;
        status: any;
        createdAt: any;
    }>;
}
