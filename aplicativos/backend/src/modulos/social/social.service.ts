import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { ehAdmin, esquecerUsuario } from "../../comum/autenticacao/supabase-auth.guard";
import { falha } from "../../comum/erros";
import { emBlocos, fecharPagina, filtroAntesDe, lerCursor } from "../../comum/paginas";
import { ArmazemAvatares } from "./avatares";
import { gravarMetaLegado } from "../../comum/meta-legado";
import { UsuarioAuth } from "../../comum/autenticacao/usuario-auth.decorator";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { importacaoCompleta } from "../importacao/importacao.parsers";
import { statusDoBanco, TABELA_TRACKING } from "../tracking/tracking.banco";
import { SalvarPerfilDto } from "./dto/salvar-perfil.dto";
import { calcularConquistas, resumoCultural } from "./perfil.estatisticas";

// Itens por pagina do feed e das listas de seguidores/seguindo.
const TAMANHO_FEED = 30;
const TAMANHO_CONEXOES = 50;

// O perfil publico mora na propria tabela "User" (id = id do Supabase Auth).
const CAMPOS_PERFIL =
  "id,username,displayName,bio,isPublic,avatarUrl,bannerUrl,theme,language,importedSources,birthDate,adultContent,createdAt";
const CAMPOS_PERFIL_LEGADO = "id,username,displayName,bio,isPublic,createdAt";

const TEMA_PADRAO = "emerald";
const IDIOMA_PADRAO: "pt-BR" | "en-US" = "pt-BR";

type LinhaUser = Omit<Perfil, "userId" | "hasImported"> & { id: string };

type MetaPerfil = {
  kind: "PROFILE_META";
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  theme?: string | null;
  importedSources?: string[];
  hasImported?: boolean;
};

function erroColunaAusente(error: { message: string } | null) {
  if (!error?.message) {
    return false;
  }
  return /column .* does not exist|schema cache/i.test(error.message);
}

function perfilDe(linha: LinhaUser, meta?: MetaPerfil | null): Perfil {
  const { id, ...resto } = linha;
  const importedSources = Array.isArray(linha.importedSources)
    ? linha.importedSources
    : Array.isArray(meta?.importedSources)
      ? meta.importedSources
      : [];
  const todasImportadas = importacaoCompleta(importedSources);

  return {
    ...resto,
    userId: id,
    isPublic: linha.isPublic ?? true,
    avatarUrl: linha.avatarUrl ?? meta?.avatarUrl ?? null,
    bannerUrl: linha.bannerUrl ?? meta?.bannerUrl ?? null,
    theme: linha.theme || meta?.theme || TEMA_PADRAO,
    language: (linha as unknown as { language?: string }).language === "en-US" ? "en-US" : IDIOMA_PADRAO,
    birthDate: linha.birthDate ?? null,
    adultContent: linha.adultContent === true,
    importedSources,
    hasImported: Boolean(meta?.hasImported) || todasImportadas
  };
}

// Idade completa em anos na data `hoje`, a partir de "AAAA-MM-DD".
export function idadeEm(nascimento: string, hoje = new Date()) {
  const [ano, mes, dia] = nascimento.split("-").map(Number);
  let idade = hoje.getUTCFullYear() - ano;
  const fezAniversario = hoje.getUTCMonth() + 1 > mes || (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() >= dia);
  if (!fezAniversario) {
    idade--;
  }
  return idade;
}

// Busca exata sem diferenciar caixa; escapa os curingas do LIKE (_ e %).
export function usernameExato(username: string) {
  return username.replace(/[\\%_]/g, "\\$&");
}

type Perfil = {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  isPublic: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: string;
  language: "pt-BR" | "en-US";
  birthDate: string | null;
  adultContent: boolean;
  importedSources: string[];
  hasImported: boolean;
  createdAt: string;
};

type Atividade = {
  id: string;
  userId: string;
  type: string;
  mediaItemId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class SocialService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    @Optional() private readonly notificacoesService?: NotificacoesService
  ) {}

  private readonly avatares = new ArmazemAvatares(() => this.db);

  private get db() {
    return this.supabaseService.getClient();
  }

  private async lerMetaLegado(userId: string): Promise<MetaPerfil | null> {
    const { data } = await this.db.from("Activity").select("id,data").eq("id", userId).maybeSingle();
    const linha = data && !Array.isArray(data) ? (data as { data?: MetaPerfil }) : null;
    return linha?.data ?? null;
  }

  private async salvarMetaLegado(userId: string, parcial: Partial<Omit<MetaPerfil, "kind">>) {
    const atual = (await this.lerMetaLegado(userId)) ?? { kind: "PROFILE_META" };
    const novo: MetaPerfil = {
      kind: "PROFILE_META",
      avatarUrl: parcial.avatarUrl !== undefined ? parcial.avatarUrl : (atual.avatarUrl ?? null),
      bannerUrl: parcial.bannerUrl !== undefined ? parcial.bannerUrl : (atual.bannerUrl ?? null),
      theme: parcial.theme !== undefined ? parcial.theme : (atual.theme ?? TEMA_PADRAO),
      importedSources: parcial.importedSources ?? atual.importedSources ?? [],
      hasImported: parcial.hasImported ?? atual.hasImported ?? false
    };
    await gravarMetaLegado(this.db, userId, novo);
    return novo;
  }

  private async perfilPorUsername(username: string) {
    let limpo = username;
    try {
      limpo = decodeURIComponent(username);
    } catch {
      limpo = username;
    }
    limpo = limpo.trim();

    if (!limpo) {
      throw new NotFoundException("Perfil nao encontrado.");
    }

    const inicial = await this.db
      .from("User")
      .select(CAMPOS_PERFIL)
      .ilike("username", usernameExato(limpo))
      .limit(10);

    let data: unknown = inicial.data;
    let error = inicial.error;
    let usarMetaLegado = false;

    if (erroColunaAusente(error)) {
      usarMetaLegado = true;
      const legado = await this.db
        .from("User")
        .select(CAMPOS_PERFIL_LEGADO)
        .ilike("username", usernameExato(limpo))
        .limit(10);
      data = legado.data;
      error = legado.error;
    }
    falha(error);

    const linhas = Array.isArray(data)
      ? (data as LinhaUser[]).filter((l) => l && typeof l.id === "string")
      : data && typeof (data as LinhaUser).id === "string"
        ? [data as LinhaUser]
        : [];
    const match = linhas.find((l) => l.username?.toLowerCase() === limpo.toLowerCase()) ?? null;

    if (!match || !match.id) {
      throw new NotFoundException("Perfil nao encontrado.");
    }
    const meta = usarMetaLegado ? await this.lerMetaLegado(match.id) : null;
    return perfilDe(match, meta);
  }

  private async perfisPorIds(userIds: string[]) {
    if (userIds.length === 0) {
      return new Map<string, Perfil>();
    }
    const ler = (campos: string) =>
      emBlocos<LinhaUser>(userIds, (bloco) => this.db.from("User").select(campos).in("id", bloco));
    let linhas: LinhaUser[];
    try {
      linhas = await ler(CAMPOS_PERFIL);
    } catch (erro) {
      if (!erroColunaAusente({ message: (erro as Error).message })) {
        throw erro;
      }
      linhas = await ler(CAMPOS_PERFIL_LEGADO);
    }
    return new Map(linhas.map((linha) => [linha.id, perfilDe(linha)]));
  }

  private async filtrarAtividadesValidas(atividades: Atividade[]) {
    if (atividades.length === 0) {
      return [];
    }

    const userIds = [...new Set(atividades.map((a) => a.userId))];
    // Restringe a validação às obras presentes nesta página do feed, em vez de
    // baixar a biblioteca inteira de cada autor.
    const mediaIds = [...new Set(atividades.map((a) => a.mediaItemId).filter((id): id is string => Boolean(id)))];
    if (mediaIds.length === 0) {
      return [];
    }
    const [{ data: trackings }, { data: favoritos }, { data: episodios }] = await Promise.all([
      this.db.from(TABELA_TRACKING).select("userId,mediaItemId").in("userId", userIds).in("mediaItemId", mediaIds),
      this.db.from("Favorite").select("userId,mediaItemId").in("userId", userIds).in("mediaItemId", mediaIds),
      this.db.from("EpisodeProgress").select("userId,mediaItemId").in("userId", userIds).in("mediaItemId", mediaIds)
    ]);

    const paresTracking = new Set((trackings ?? []).map((t) => `${t.userId}:${t.mediaItemId}`));
    const paresFavorito = new Set((favoritos ?? []).map((f) => `${f.userId}:${f.mediaItemId}`));
    const paresEpisodios = new Set((episodios ?? []).map((e) => `${e.userId}:${e.mediaItemId}`));

    const vistasEpisodios = new Set<string>();

    return atividades.filter((a) => {
      if (!a.mediaItemId || a.data?.kind === "PROFILE_META") {
        return false;
      }
      if (a.type === "STATUS" || a.type === "RATING") {
        return paresTracking.has(`${a.userId}:${a.mediaItemId}`);
      }
      if (a.type === "EPISODES") {
        // Precisa estar em tracking E ter de fato episódios assistidos registrados
        if (
          !paresTracking.has(`${a.userId}:${a.mediaItemId}`) ||
          !paresEpisodios.has(`${a.userId}:${a.mediaItemId}`)
        ) {
          return false;
        }
        // Deduplica entradas repetidas de episódios no feed para a mesma mídia
        const chave = `${a.userId}:${a.mediaItemId}`;
        if (vistasEpisodios.has(chave)) {
          return false;
        }
        vistasEpisodios.add(chave);
        return true;
      }
      if (a.type === "FAVORITE") {
        return paresFavorito.has(`${a.userId}:${a.mediaItemId}`);
      }
      return true;
    });
  }

  // Junta autor e item em cada atividade.
  private async enriquecer(atividades: Atividade[]) {
    const userIds = [...new Set(atividades.map((a) => a.userId))];
    const mediaIds = [...new Set(atividades.flatMap((a) => (a.mediaItemId ? [a.mediaItemId] : [])))];

    const [perfis, itens, capasRes] = await Promise.all([
      this.perfisPorIds(userIds),
      this.catalogoService.buscarSalvos(mediaIds),
      userIds.length > 0 && mediaIds.length > 0
        ? this.db
            .from(TABELA_TRACKING)
            .select("userId,mediaItemId,customCoverUrl")
            .in("userId", userIds)
            .in("mediaItemId", mediaIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    const capasMapa = new Map<string, string>();
    for (const row of (capasRes.data ?? []) as Array<{
      userId?: string;
      mediaItemId?: string;
      customCoverUrl?: string | null;
    }>) {
      if (row.userId && row.mediaItemId && row.customCoverUrl) {
        capasMapa.set(`${row.userId}:${row.mediaItemId}`, row.customCoverUrl);
      }
    }

    return atividades.map((atividade) => {
      const perfil = perfis.get(atividade.userId);
      const itemBase = atividade.mediaItemId ? (itens.get(atividade.mediaItemId) ?? null) : null;
      const customCover =
        atividade.mediaItemId ? capasMapa.get(`${atividade.userId}:${atividade.mediaItemId}`) : undefined;
      const item = itemBase && customCover ? { ...itemBase, coverUrl: customCover } : itemBase;

      return {
        ...atividade,
        user: perfil
          ? {
              username: perfil.username,
              displayName: perfil.displayName,
              avatarUrl: perfil.avatarUrl
            }
          : null,
        item
      };
    });
  }

  // Perfil proprio

  async meuPerfil(usuario: UsuarioAuth) {
    const userId = await this.supabaseService.resolverUserId(usuario.id);
    const inicial = await this.db.from("User").select(CAMPOS_PERFIL).eq("id", userId).maybeSingle();
    let data: unknown = inicial.data;
    let error = inicial.error;
    let usarMetaLegado = false;

    if (erroColunaAusente(error)) {
      usarMetaLegado = true;
      const legado = await this.db.from("User").select(CAMPOS_PERFIL_LEGADO).eq("id", userId).maybeSingle();
      data = legado.data;
      error = legado.error;
    }
    falha(error);

    const meta = data && usarMetaLegado ? await this.lerMetaLegado(userId) : null;
    return { profile: data ? perfilDe(data as LinhaUser, meta) : null, isAdmin: ehAdmin(usuario.email) };
  }

  async salvarPerfil(authUserId: string, recebido: SalvarPerfilDto, email?: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);

    // Foto nova chega como data URI (recorte feito no site): vai para o Storage e o perfil
    // guarda so o link. A anterior e apagada depois que o perfil salvar.
    let payload = recebido;
    let fotoAnterior: string | null = null;
    if (recebido.avatarUrl !== undefined) {
      const { data: atual } = await this.db.from("User").select("avatarUrl").eq("id", userId).maybeSingle();
      fotoAnterior = (atual?.avatarUrl as string | null | undefined) ?? null;
      if (this.avatares.ehDataUri(recebido.avatarUrl)) {
        payload = { ...recebido, avatarUrl: await this.avatares.salvar(userId, recebido.avatarUrl) };
      }
    }

    const normalizado = {
      ...payload,
      // String vazia limpa a foto / capa / volta ao tema padrao.
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl || null } : {}),
      ...(payload.bannerUrl !== undefined ? { bannerUrl: payload.bannerUrl || null } : {}),
      ...(payload.theme !== undefined ? { theme: payload.theme || TEMA_PADRAO } : {})
    };
    const valores: Record<string, unknown> = Object.fromEntries(
      Object.entries(normalizado).filter(([, valor]) => valor !== undefined)
    );
    const agora = new Date().toISOString();

    // Conteudo +18: so com 18 anos ou mais pela data de nascimento (a enviada agora ou a salva).
    if (payload.birthDate !== undefined || payload.adultContent !== undefined) {
      const { data: atual } = await this.db.from("User").select("birthDate").eq("id", userId).maybeSingle();
      const nascimento = payload.birthDate ?? (atual?.birthDate as string | null | undefined) ?? null;
      if (nascimento && (idadeEm(nascimento) < 0 || idadeEm(nascimento) > 120)) {
        throw new BadRequestException("Confira a data de nascimento.");
      }
      const maior = nascimento !== null && idadeEm(nascimento) >= 18;
      if (payload.adultContent === true && !maior) {
        throw new BadRequestException("Conteúdo +18 só pode ser liberado para maiores de 18 anos.");
      }
      if (payload.adultContent === true) {
        valores.adultConsentAt = agora;
      }
      if (!maior) {
        valores.adultContent = false;
      }
    }

    // A linha em "User" normalmente ja existe (trigger de cadastro); se nao, e criada aqui.
    const inicial = await this.db
      .from("User")
      .update({ ...valores, updatedAt: agora })
      .eq("id", userId)
      .select(CAMPOS_PERFIL)
      .maybeSingle();

    let data: unknown = inicial.data;
    let error = inicial.error;
    let metaLegado: MetaPerfil | null = null;

    if (erroColunaAusente(error)) {
      // language nao existe no schema legado: fica de fora.
      const { avatarUrl, bannerUrl, theme, language, ...camposLegados } = normalizado;
      const valoresLegados = Object.fromEntries(
        Object.entries(camposLegados).filter(([, valor]) => valor !== undefined)
      );
      const legado = await this.db
        .from("User")
        .update({ ...valoresLegados, updatedAt: agora })
        .eq("id", userId)
        .select(CAMPOS_PERFIL_LEGADO)
        .maybeSingle();
      data = legado.data;
      error = legado.error;

      if (avatarUrl !== undefined || bannerUrl !== undefined || theme !== undefined) {
        metaLegado = await this.salvarMetaLegado(userId, { avatarUrl, bannerUrl, theme });
      }
    }

    if (!error && !data) {
      if (!valores.username) {
        throw new BadRequestException("Escolha um nome de usuário primeiro.");
      }
      const novoRegistro = {
        ...valores,
        id: userId,
        authUserId,
        ...(email ? { email } : {}),
        createdAt: agora,
        updatedAt: agora
      };
      const inserido = await this.db
        .from("User")
        .insert(novoRegistro)
        .select(CAMPOS_PERFIL)
        .maybeSingle();
      data = inserido.data;
      error = inserido.error;
    }

    if (error?.code === "23505") {
      throw new ConflictException("Este nome de usuario ja esta em uso.");
    }
    falha(error);
    if (payload.avatarUrl !== undefined && fotoAnterior && fotoAnterior !== (payload.avatarUrl || null)) {
      await this.avatares.remover(fotoAnterior);
    }
    return perfilDe(data as LinhaUser, metaLegado);
  }

  // Exclui a conta: apaga os dados no banco (trak_excluir_usuario) e depois o login no
  // Supabase Auth. Comentarios denunciados ficam ocultos, com o original para a moderacao.
  async excluirConta(authUserId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    // O historico de importacoes (com titulos nao encontrados) sai tambem quando a linha
    // em "User" fica anonima por causa de um comentario denunciado.
    const { error: importacoesError } = await this.db.from("ImportJob").delete().eq("userId", userId);
    if (importacoesError && !erroColunaAusente(importacoesError) && !/relation .* does not exist/i.test(importacoesError.message)) {
      falha(importacoesError);
    }
    const { error } = await this.db.rpc("trak_excluir_usuario", { usuario: userId });
    falha(error);
    await this.avatares.removerTodas(userId);

    const { error: authError } = await this.db.auth.admin.deleteUser(authUserId);
    falha(authError);

    esquecerUsuario(authUserId);
    return { ok: true };
  }

  // Perfil publico

  async buscarPerfis(query: string) {
    let limpo = query;
    try {
      limpo = decodeURIComponent(query);
    } catch {
      limpo = query;
    }
    const termo = limpo.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (termo.length < 2) {
      return [];
    }

    const { data, error } = await this.db
      .from("User")
      .select("username,displayName")
      .eq("isPublic", true)
      .ilike("username", `%${usernameExato(termo)}%`)
      .limit(10);
    falha(error);
    return data ?? [];
  }

  async perfilPublico(username: string, visitante?: UsuarioAuth) {
    const perfil = await this.perfilPorUsername(username);
    const visitanteId = visitante ? await this.supabaseService.resolverUserId(visitante.id) : null;
    const isMe = visitanteId === perfil.userId;

    const [seguidores, seguindo, segueEle, eleSegue] = await Promise.all([
      this.db.from("Follow").select("followerId", { count: "exact", head: true }).eq("followingId", perfil.userId),
      this.db.from("Follow").select("followingId", { count: "exact", head: true }).eq("followerId", perfil.userId),
      visitanteId && !isMe
        ? this.db
            .from("Follow")
            .select("followerId")
            .eq("followerId", visitanteId)
            .eq("followingId", perfil.userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      visitanteId && !isMe
        ? this.db
            .from("Follow")
            .select("followerId")
            .eq("followerId", perfil.userId)
            .eq("followingId", visitanteId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    const base = {
      profile: {
        username: perfil.username,
        displayName: perfil.displayName,
        bio: perfil.bio,
        isPublic: perfil.isPublic,
        avatarUrl: perfil.avatarUrl,
        bannerUrl: perfil.bannerUrl,
        theme: perfil.theme
      },
      followers: seguidores.count ?? 0,
      following: seguindo.count ?? 0,
      isFollowing: Boolean(segueEle.data),
      followsYou: Boolean(eleSegue.data),
      isMe
    };

    if (!perfil.isPublic && !isMe) {
      return {
        ...base,
        isPrivate: true,
        stats: null,
        summary: null,
        achievements: [],
        inProgress: [],
        library: [],
        favorites: [],
        activity: []
      };
    }

    const [tracking, favoritos, atividades] = await Promise.all([
      this.db
        .from(TABELA_TRACKING)
        .select("mediaItemId,status,personalRating,progressCurrent,customCoverUrl,updatedAt")
        .eq("userId", perfil.userId)
        .order("updatedAt", { ascending: false })
        .limit(200),
      this.db
        .from("Favorite")
        .select("mediaItemId")
        .eq("userId", perfil.userId)
        .order("createdAt", { ascending: false })
        .limit(48),
      this.db
        .from("Activity")
        .select("id,userId,type,mediaItemId,data,createdAt")
        .eq("userId", perfil.userId)
        .order("createdAt", { ascending: false })
        .limit(20)
    ]);
    falha(tracking.error);

    const registros = (tracking.data ?? []) as Array<{
      mediaItemId?: string;
      status: string;
      personalRating: number | null;
      progressCurrent?: number | null;
      customCoverUrl?: string | null;
      updatedAt?: string | null;
    }>;
    const notas = registros.flatMap((r) => (r.personalRating ? [r.personalRating] : []));
    const porStatus = registros.reduce<Record<string, number>>((acc, r) => {
      const status = statusDoBanco(r.status);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    const idsFavoritos = (favoritos.data ?? []).map((f) => f.mediaItemId as string);
    const idsTracking = registros.flatMap((r) => (r.mediaItemId ? [r.mediaItemId] : []));
    const idsComDuracao = registros
      .filter((r) => r.mediaItemId && statusDoBanco(r.status) !== "WANT")
      .map((r) => r.mediaItemId!);

    // Duracoes que faltam so sao buscadas nas fontes externas quando a pessoa ve o proprio
    // perfil: uma visita anonima nao pode disparar chamadas ao TMDB nem gravar no banco.
    const [itensMapa, duracoes] = await Promise.all([
      this.catalogoService.buscarSalvos([...new Set([...idsFavoritos, ...idsTracking])]),
      this.catalogoService.duracoes(idsComDuracao, isMe ? 15 : 0)
    ]);

    const summary = resumoCultural(
      registros.map((r) => ({
        status: statusDoBanco(r.status),
        progress: r.progressCurrent ?? null,
        type: r.mediaItemId ? itensMapa.get(r.mediaItemId)?.type : undefined,
        durationMinutes: r.mediaItemId ? duracoes.get(r.mediaItemId) : null
      }))
    );
    const achievements = calcularConquistas(summary, {
      ratingsCount: notas.length,
      favoritesCount: idsFavoritos.length
    });

    const inProgress = registros
      .filter((r) => statusDoBanco(r.status) === "WATCHING" && r.mediaItemId && itensMapa.has(r.mediaItemId))
      .slice(0, 4)
      .map((r) => {
        const itemBase = itensMapa.get(r.mediaItemId!)!;
        const item = r.customCoverUrl ? { ...itemBase, coverUrl: r.customCoverUrl } : itemBase;
        return {
          item,
          status: statusDoBanco(r.status),
          progress: r.progressCurrent ?? 0,
          rating: r.personalRating ?? null
        };
      });

    const library = registros
      .filter((r) => r.mediaItemId && itensMapa.has(r.mediaItemId))
      .map((r) => {
        const itemBase = itensMapa.get(r.mediaItemId!)!;
        const item = r.customCoverUrl ? { ...itemBase, coverUrl: r.customCoverUrl } : itemBase;
        return {
          mediaItemId: r.mediaItemId!,
          status: statusDoBanco(r.status),
          rating: r.personalRating ?? null,
          progress: r.progressCurrent ?? 0,
          updatedAt: r.updatedAt ?? null,
          item
        };
      });

    const capasPersonalizadas = new Map<string, string>();
    for (const r of registros) {
      if (r.mediaItemId && r.customCoverUrl) {
        capasPersonalizadas.set(r.mediaItemId, r.customCoverUrl);
      }
    }

    return {
      ...base,
      isPrivate: false,
      stats: {
        total: registros.length,
        byStatus: porStatus,
        averageRating: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null
      },
      summary,
      achievements,
      inProgress,
      library,
      favorites: idsFavoritos.flatMap((id) => {
        const itemBase = itensMapa.get(id);
        if (!itemBase) return [];
        const customCover = capasPersonalizadas.get(id);
        return [customCover ? { ...itemBase, coverUrl: customCover } : itemBase];
      }),
      activity: await this.enriquecer(
        await this.filtrarAtividadesValidas((atividades.data ?? []) as Atividade[])
      )
    };
  }

  // Seguidores

  async seguir(authUserId: string, username: string) {
    const [userId, alvo] = await Promise.all([
      this.supabaseService.resolverUserId(authUserId),
      this.perfilPorUsername(username)
    ]);

    if (alvo.userId === userId) {
      throw new BadRequestException("Voce nao pode seguir a si mesmo.");
    }

    const { error } = await this.db
      .from("Follow")
      .upsert({ followerId: userId, followingId: alvo.userId }, { onConflict: "followerId,followingId", ignoreDuplicates: true });
    falha(error);

    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (
      this.notificacoesService &&
      !(await this.notificacoesService.existeRecente(alvo.userId, userId, "FOLLOW", umDiaAtras))
    ) {
      try {
        const { data: seguidor } = await this.db
          .from("User")
          .select("username,displayName")
          .eq("id", userId)
          .maybeSingle();

        const nome = seguidor?.displayName || (seguidor?.username ? `@${seguidor.username}` : "Alguém");
        await this.notificacoesService.criar({
          userId: alvo.userId,
          actorId: userId,
          type: "FOLLOW",
          title: `${nome} começou a seguir você`,
          link: `/u/${seguidor?.username || ""}`
        });
      } catch {
        // Notificação falha silenciosamente sem interromper o follow
      }
    }

    return { ok: true };
  }

  async deixarDeSeguir(authUserId: string, username: string) {
    const [userId, alvo] = await Promise.all([
      this.supabaseService.resolverUserId(authUserId),
      this.perfilPorUsername(username)
    ]);

    const { error } = await this.db.from("Follow").delete().eq("followerId", userId).eq("followingId", alvo.userId);
    falha(error);
    return { ok: true };
  }

  // Feed: atividades suas e de quem voce segue, em paginas de TAMANHO_FEED a partir do
  // cursor. A juncao com os seguidos e a paginacao ficam no banco (trak_feed).
  async feed(authUserId: string, cursorTexto?: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const cursor = lerCursor(cursorTexto);
    const [seguindo, atividades] = await Promise.all([
      this.db.from("Follow").select("followingId", { count: "exact", head: true }).eq("followerId", userId),
      this.db.rpc("trak_feed", {
        usuario: userId,
        antes_em: cursor?.em ?? null,
        antes_id: cursor?.id ?? null,
        limite: TAMANHO_FEED + 1
      })
    ]);
    falha(seguindo.error);
    falha(atividades.error);

    const { itens: pagina, proximo } = fecharPagina((atividades.data ?? []) as Atividade[], TAMANHO_FEED, (a) => ({
      em: a.createdAt,
      id: a.id
    }));

    const perfis = await this.perfisPorIds(pagina.map((a) => a.userId));
    // Perfis privados nao aparecem no feed de outras pessoas (o banco ja filtra; aqui e
    // a garantia caso um perfil mude de visibilidade no meio do caminho).
    const visiveis = pagina.filter((atividade) => atividade.userId === userId || perfis.get(atividade.userId)?.isPublic);
    const validas = await this.filtrarAtividadesValidas(visiveis);
    const idsMidia = validas.flatMap((a) => (a.mediaItemId ? [a.mediaItemId] : []));

    const [enrichedItems, naMinhaEstante] = await Promise.all([
      this.enriquecer(validas),
      emBlocos<{ mediaItemId: string }>(idsMidia, (bloco) =>
        this.db.from(TABELA_TRACKING).select("mediaItemId").eq("userId", userId).in("mediaItemId", bloco)
      )
        .then((linhas) => new Set(linhas.map((linha) => linha.mediaItemId)))
        .catch(() => new Set<string>())
    ]);

    const items = enrichedItems.map((item) => ({
      ...item,
      inMyLibrary: item.mediaItemId ? item.userId === userId || naMinhaEstante.has(item.mediaItemId) : false
    }));

    return { followingCount: seguindo.count ?? 0, items, proximo };
  }

  listarSeguidores(username: string, visitante?: UsuarioAuth, cursor?: string) {
    return this.listarConexoes(username, "seguidores", visitante, cursor);
  }

  listarSeguindo(username: string, visitante?: UsuarioAuth, cursor?: string) {
    return this.listarConexoes(username, "seguindo", visitante, cursor);
  }

  // Pessoas em paginas de TAMANHO_CONEXOES, das mais recentes, com o que o visitante tem
  // em comum com cada uma.
  private async listarConexoes(
    username: string,
    direcao: "seguidores" | "seguindo",
    visitante?: UsuarioAuth,
    cursorTexto?: string
  ) {
    const cursor = lerCursor(cursorTexto);
    const alvo = await this.perfilPorUsername(username);
    const visitanteId = visitante ? await this.supabaseService.resolverUserId(visitante.id) : null;
    const isMe = visitanteId === alvo.userId;

    if (!alvo.isPublic && !isMe) {
      throw new ForbiddenException("Este perfil é privado.");
    }

    // Seguidores: linhas em que o alvo e seguido. Seguindo: em que ele segue.
    const [colunaAlvo, colunaOutro] =
      direcao === "seguidores" ? (["followingId", "followerId"] as const) : (["followerId", "followingId"] as const);
    let consulta = this.db
      .from("Follow")
      .select(`${colunaOutro},createdAt`)
      .eq(colunaAlvo, alvo.userId);
    if (cursor) {
      consulta = consulta.or(filtroAntesDe(cursor, "createdAt", colunaOutro));
    }
    const { data: follows, error } = await consulta
      .order("createdAt", { ascending: false })
      .order(colunaOutro, { ascending: false })
      .limit(TAMANHO_CONEXOES + 1);
    falha(error);

    const { itens: linhas, proximo } = fecharPagina(
      (follows ?? []) as unknown as Array<Record<string, string>>,
      TAMANHO_CONEXOES,
      (f) => ({ em: f.createdAt, id: f[colunaOutro] })
    );
    const ids = linhas.map((f) => f[colunaOutro]);
    if (ids.length === 0) {
      return { items: [], proximo: null };
    }

    const [perfisMap, seguidosPeloVisitante, seguemVisitante] = await Promise.all([
      this.perfisPorIds(ids),
      visitanteId
        ? this.db
            .from("Follow")
            .select("followingId")
            .eq("followerId", visitanteId)
            .in("followingId", ids)
            .then((r) => new Set((r.data ?? []).map((row) => row.followingId as string)))
        : Promise.resolve(new Set<string>()),
      visitanteId
        ? this.db
            .from("Follow")
            .select("followerId")
            .eq("followingId", visitanteId)
            .in("followerId", ids)
            .then((r) => new Set((r.data ?? []).map((row) => row.followerId as string)))
        : Promise.resolve(new Set<string>())
    ]);

    const items = ids.flatMap((id) => {
      const p = perfisMap.get(id);
      if (!p) {
        return [];
      }
      return [
        {
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          bio: p.bio,
          avatarUrl: p.avatarUrl,
          isFollowing: seguidosPeloVisitante.has(p.userId),
          followsYou: seguemVisitante.has(p.userId),
          isMe: visitanteId === p.userId
        }
      ];
    });
    return { items, proximo };
  }
}
