import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { ImportarLetterboxdDto, ImportarSteamDto, ImportarTraktDto } from "./dto/importar.dto";
import { ImportacaoService } from "./importacao.service";

// Importacoes fazem muitas chamadas externas: no maximo 3 a cada 10 minutos.
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
@Controller("importacao")
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Post("letterboxd")
  letterboxd(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarLetterboxdDto) {
    return this.importacaoService.letterboxd(usuario.id, payload.csv, payload.lista);
  }

  @Post("trakt")
  trakt(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarTraktDto) {
    return this.importacaoService.trakt(usuario.id, payload.json);
  }

  @Post("steam")
  steam(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarSteamDto) {
    return this.importacaoService.steam(usuario.id, payload.perfil);
  }
}
