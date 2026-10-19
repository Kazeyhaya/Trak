import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
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
import { ComentariosService } from "./comentarios.service";
import { CriarComentarioDto } from "./dto/criar-comentario.dto";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";
import { ListarComentariosQueryDto } from "./dto/listar-comentarios-query.dto";

@Controller("comentarios")
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  // Publico; com login, informa curtidas e autoria do usuario.
  @UseGuards(AutenticacaoOpcionalGuard)
  @Get()
  listar(@Query() query: ListarComentariosQueryDto, @UsuarioOpcional() usuario?: UsuarioAuth) {
    return this.comentariosService.listarPorMidia(query.mediaItemId, usuario?.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  criar(@Body() payload: CriarComentarioDto, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.criar(payload.mediaItemId, usuario.id, payload.content);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(":id/curtidas")
  curtir(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.curtir(id, usuario.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete(":id/curtidas")
  descurtir(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.descurtir(id, usuario.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete(":id")
  remover(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.remover(id, usuario.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(":id/denuncias")
  denunciar(
    @Param("id") id: string,
    @Body() payload: DenunciarComentarioDto,
    @UsuarioLogado() usuario: UsuarioAuth
  ) {
    return this.comentariosService.denunciar(id, usuario.id, payload);
  }
}
