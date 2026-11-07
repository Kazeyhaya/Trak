import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  AutenticacaoOpcionalGuard,
  SupabaseAuthGuard
} from "../../comum/autenticacao/supabase-auth.guard";
import {
  UsuarioAuth,
  UsuarioLogado,
  UsuarioOpcional
} from "../../comum/autenticacao/usuario-auth.decorator";
import { SalvarPerfilDto } from "./dto/salvar-perfil.dto";
import { SocialService } from "./social.service";

@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get("perfis/eu")
  meuPerfil(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.meuPerfil(usuario);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put("perfis/eu")
  salvarPerfil(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: SalvarPerfilDto) {
    return this.socialService.salvarPerfil(usuario.id, payload, usuario.email);
  }

  // Irreversivel: no maximo 3 tentativas a cada 10 minutos.
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  @Delete("perfis/eu")
  excluirConta(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.excluirConta(usuario.id);
  }

  @Get("perfis")
  buscar(@Query("q") q = "") {
    return this.socialService.buscarPerfis(q);
  }

  @UseGuards(AutenticacaoOpcionalGuard)
  @Get("perfis/:username")
  perfilPublico(@Param("username") username: string, @UsuarioOpcional() usuario?: UsuarioAuth) {
    return this.socialService.perfilPublico(username, usuario);
  }

  @UseGuards(AutenticacaoOpcionalGuard)
  @Get("perfis/:username/seguidores")
  seguidores(
    @Param("username") username: string,
    @Query("cursor") cursor?: string,
    @UsuarioOpcional() usuario?: UsuarioAuth
  ) {
    return this.socialService.listarSeguidores(username, usuario, cursor);
  }

  @UseGuards(AutenticacaoOpcionalGuard)
  @Get("perfis/:username/seguindo")
  seguindo(
    @Param("username") username: string,
    @Query("cursor") cursor?: string,
    @UsuarioOpcional() usuario?: UsuarioAuth
  ) {
    return this.socialService.listarSeguindo(username, usuario, cursor);
  }

  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("perfis/:username/seguir")
  seguir(@Param("username") username: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.seguir(usuario.id, username);
  }

  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Delete("perfis/:username/seguir")
  deixarDeSeguir(@Param("username") username: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.deixarDeSeguir(usuario.id, username);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get("feed")
  feed(@UsuarioLogado() usuario: UsuarioAuth, @Query("cursor") cursor?: string) {
    return this.socialService.feed(usuario.id, cursor);
  }
}
