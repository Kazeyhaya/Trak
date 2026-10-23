import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
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

  @Get("perfis")
  buscar(@Query("q") q = "") {
    return this.socialService.buscarPerfis(q);
  }

  @UseGuards(AutenticacaoOpcionalGuard)
  @Get("perfis/:username")
  perfilPublico(@Param("username") username: string, @UsuarioOpcional() usuario?: UsuarioAuth) {
    return this.socialService.perfilPublico(username, usuario);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post("perfis/:username/seguir")
  seguir(@Param("username") username: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.seguir(usuario.id, username);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete("perfis/:username/seguir")
  deixarDeSeguir(@Param("username") username: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.deixarDeSeguir(usuario.id, username);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get("feed")
  feed(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.socialService.feed(usuario.id);
  }
}
