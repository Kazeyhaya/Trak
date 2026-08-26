import { UsuarioAuth } from "../../comum/autenticacao/usuario-auth.decorator";
import { TrackingService } from "./tracking.service";
declare class TrackingPayloadDto {
    status?: string;
    progress?: number;
    favorite?: boolean;
}
export declare class TrackingController {
    private readonly trackingService;
    constructor(trackingService: TrackingService);
    listar(usuario: UsuarioAuth): Promise<{
        id: any;
        mediaItemId: any;
        status: any;
        progress: any;
        favorite: any;
        updatedAt: any;
    }[]>;
    salvar(usuario: UsuarioAuth, mediaItemId: string, payload: TrackingPayloadDto): Promise<{
        id: any;
        mediaItemId: any;
        status: any;
        progress: any;
        favorite: any;
        updatedAt: any;
    }>;
    atualizar(usuario: UsuarioAuth, mediaItemId: string, payload: TrackingPayloadDto): Promise<{
        id: any;
        mediaItemId: any;
        status: any;
        progress: any;
        favorite: any;
        updatedAt: any;
    }>;
}
export {};
