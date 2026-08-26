import { UsuarioAuth } from "../../comum/autenticacao/usuario-auth.decorator";
import { ComentariosService } from "./comentarios.service";
import { CriarComentarioDto } from "./dto/criar-comentario.dto";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";
import { ListarComentariosQueryDto } from "./dto/listar-comentarios-query.dto";
export declare class ComentariosController {
    private readonly comentariosService;
    constructor(comentariosService: ComentariosService);
    listar(query: ListarComentariosQueryDto, usuario: UsuarioAuth): Promise<{
        likesCount: number;
        likedByUser: boolean;
        id: any;
        userId: any;
        mediaItemId: any;
        content: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    criar(payload: CriarComentarioDto, usuario: UsuarioAuth): Promise<{
        likesCount: number;
        likedByUser: boolean;
        id: any;
        userId: any;
        mediaItemId: any;
        content: any;
        createdAt: any;
        updatedAt: any;
    }>;
    curtir(id: string, usuario: UsuarioAuth): Promise<{
        commentId: string;
        likesCount: number;
    }>;
    descurtir(id: string, usuario: UsuarioAuth): Promise<{
        commentId: string;
        likesCount: number;
    }>;
    denunciar(id: string, payload: DenunciarComentarioDto, usuario: UsuarioAuth): Promise<{
        id: any;
        commentId: any;
        reporterUserId: any;
        reason: any;
        details: any;
        status: any;
        createdAt: any;
    }>;
}
