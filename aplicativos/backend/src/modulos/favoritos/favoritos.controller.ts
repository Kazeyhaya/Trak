import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import {
  UsuarioAuth,
  UsuarioLogado
} from "../../comum/autenticacao/usuario-auth.decorator";
import { AdicionarFavoritoDto } from "./dto/adicionar-favorito.dto";
import { ReordenarFavoritosDto } from "./dto/reordenar-favoritos.dto";
import { FavoritosService } from "./favoritos.service";

@UseGuards(SupabaseAuthGuard)
@Controller("favoritos")
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Get()
  listar(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.favoritosService.listar(usuario.id);
  }

  @Put("ordem")
  reordenar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Body() payload: ReordenarFavoritosDto
  ) {
    return this.favoritosService.reordenar(usuario.id, payload.mediaItemIds);
  }

  @Get(":mediaItemId")
  verificar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string
  ) {
    return this.favoritosService.verificar(usuario.id, mediaItemId);
  }

  @Post()
  adicionar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Body() payload: AdicionarFavoritoDto
  ) {
    return this.favoritosService.adicionar(usuario.id, payload.mediaItemId);
  }

  @Delete(":mediaItemId")
  remover(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string
  ) {
    return this.favoritosService.remover(usuario.id, mediaItemId);
  }
}
