import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface UsuarioAuth {
  id: string;
  email?: string;
}

export const UsuarioLogado = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAuth => {
    const request = ctx.switchToHttp().getRequest();
    return request.usuarioAuth;
  }
);

// Igual ao UsuarioLogado, mas pode ser undefined (AutenticacaoOpcionalGuard).
export const UsuarioOpcional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAuth | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.usuarioAuth;
  }
);
