import { UsuarioAuth } from "../../comum/autenticacao/usuario-auth.decorator";
import { AdicionarFavoritoDto } from "./dto/adicionar-favorito.dto";
import { FavoritosService } from "./favoritos.service";
export declare class FavoritosController {
    private readonly favoritosService;
    constructor(favoritosService: FavoritosService);
    listar(usuario: UsuarioAuth): Promise<{
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
    adicionar(usuario: UsuarioAuth, payload: AdicionarFavoritoDto): Promise<{
        ok: boolean;
    }>;
    remover(usuario: UsuarioAuth, mediaItemId: string): Promise<{
        ok: boolean;
    }>;
}
