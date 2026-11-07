import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { ImportarLetterboxdDto, ImportarSteamDto, ImportarTraktDto } from "./dto/importar.dto";
import { ImportacaoService } from "./importacao.service";

// Iniciar uma importacao dispara muitas chamadas externas: no maximo 3 a cada 10 minutos.
// Acompanhar o progresso (GET) fica no limite geral, porque o site consulta a cada 2s.
const LIMITE_IMPORTACOES = { default: { limit: 3, ttl: 10 * 60_000 } };

// POST cria a tarefa e responde 202 na hora; os itens sao processados em segundo plano.
@UseGuards(SupabaseAuthGuard)
@Controller("importacao")
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Throttle(LIMITE_IMPORTACOES)
  @HttpCode(202)
  @Post("letterboxd")
  letterboxd(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarLetterboxdDto) {
    return this.importacaoService.letterboxd(usuario.id, payload.csv, payload.lista);
  }

  @Throttle(LIMITE_IMPORTACOES)
  @HttpCode(202)
  @Post("trakt")
  trakt(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarTraktDto) {
    return this.importacaoService.trakt(usuario.id, payload.json);
  }

  @Throttle(LIMITE_IMPORTACOES)
  @HttpCode(202)
  @Post("steam")
  steam(@UsuarioLogado() usuario: UsuarioAuth, @Body() payload: ImportarSteamDto) {
    return this.importacaoService.steam(usuario.id, payload.perfil);
  }

  @Get("tarefas")
  tarefas(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.importacaoService.tarefas(usuario.id);
  }

  @Get("tarefas/:id")
  tarefa(@UsuarioLogado() usuario: UsuarioAuth, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.importacaoService.tarefa(usuario.id, id);
  }
}
