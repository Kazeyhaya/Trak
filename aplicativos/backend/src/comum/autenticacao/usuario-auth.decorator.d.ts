export interface UsuarioAuth {
    id: string;
    email?: string;
}
export declare const UsuarioLogado: (...dataOrPipes: unknown[]) => ParameterDecorator;
