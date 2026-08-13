import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import {
  UsuarioAuth,
  UsuarioLogado
} from "../../comum/autenticacao/usuario-auth.decorator";
import { ComentariosService } from "./comentarios.service";
import { CriarComentarioDto } from "./dto/criar-comentario.dto";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";
import { ListarComentariosQueryDto } from "./dto/listar-comentarios-query.dto";

@UseGuards(SupabaseAuthGuard)
@Controller("comentarios")
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Get()
  listar(
    @Query() query: ListarComentariosQueryDto,
    @UsuarioLogado() usuario: UsuarioAuth
  ) {
    return this.comentariosService.listarPorMidia(query.mediaItemId, usuario.id);
  }

  @Post()
  criar(@Body() payload: CriarComentarioDto, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.criar(payload.mediaItemId, usuario.id, payload.content);
  }

  @Post(":id/curtidas")
  curtir(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.curtir(id, usuario.id);
  }

  @Delete(":id/curtidas")
  descurtir(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.comentariosService.descurtir(id, usuario.id);
  }

  @Post(":id/denuncias")
  denunciar(
    @Param("id") id: string,
    @Body() payload: DenunciarComentarioDto,
    @UsuarioLogado() usuario: UsuarioAuth
  ) {
    return this.comentariosService.denunciar(id, usuario.id, payload);
  }
}
