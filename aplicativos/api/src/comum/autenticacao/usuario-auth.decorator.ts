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
