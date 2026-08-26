export declare class CatalogoService {
    private getReleaseYear;
    private fetchJson;
    private listarTmdb;
    private listarRawg;
    listar(): Promise<any[]>;
    buscarPorId(id: string): Promise<{
        id: string;
        externalId: string;
        source: "tmdb";
        type: "MOVIE" | "SERIES";
        title: string;
        coverUrl: string;
        synopsis: string;
        releaseYear: number;
    } | {
        id: string;
        externalId: string;
        source: "rawg";
        type: "GAME";
        title: string;
        coverUrl: string;
        synopsis: string;
        releaseYear: number;
    }>;
}
