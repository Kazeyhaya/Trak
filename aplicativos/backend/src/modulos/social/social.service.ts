import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { ehAdmin } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth } from "../../comum/autenticacao/usuario-auth.decorator";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { statusDoBanco, TABELA_TRACKING } from "../tracking/tracking.banco";
import { SalvarPerfilDto } from "./dto/salvar-perfil.dto";
import { calcularConquistas, resumoCultural } from "./perfil.estatisticas";

// O perfil publico mora na propria tabela "User" (id = id do Supabase Auth).
const CAMPOS_PERFIL = "id,username,displayName,bio,isPublic,avatarUrl,bannerUrl,theme,language,importedSources,createdAt";
const CAMPOS_PERFIL_LEGADO = "id,username,displayName,bio,isPublic,createdAt";

const TEMA_PADRAO = "emerald";
const IDIOMA_PADRAO: "pt-BR" | "en-US" = "pt-BR";
const FONTES_IMPORTACAO = ["letterboxd", "trakt", "steam"] as const;

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
  const todasImportadas = FONTES_IMPORTACAO.every((f) => importedSources.includes(f));

  return {
    ...resto,
    userId: id,
    isPublic: linha.isPublic ?? true,
    avatarUrl: linha.avatarUrl ?? meta?.avatarUrl ?? null,
    bannerUrl: linha.bannerUrl ?? meta?.bannerUrl ?? null,
    theme: linha.theme || meta?.theme || TEMA_PADRAO,
    language: (linha as unknown as { language?: string }).language === "en-US" ? "en-US" : IDIOMA_PADRAO,
    importedSources,
    hasImported: Boolean(meta?.hasImported) || todasImportadas
  };
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

function falha(error: { message: string } | null) {
  if (error) {
    throw new InternalServerErrorException(error.message);
  }
}

@Injectable()
export class SocialService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService
  ) {}

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
    await this.db.from("Activity").delete().eq("id", userId);
    await this.db.from("Activity").insert({
      id: userId,
      userId,
      type: "STATUS",
      mediaItemId: null,
      data: novo
    });
    return novo;
  }

  private async perfilPorUsername(username: string) {
    const inicial = await this.db
      .from("User")
      .select(CAMPOS_PERFIL)
      .ilike("username", usernameExato(username))
      .limit(1)
      .maybeSingle();

    let data: unknown = inicial.data;
    let error = inicial.error;
    let usarMetaLegado = false;

    if (erroColunaAusente(error)) {
      usarMetaLegado = true;
      const legado = await this.db
        .from("User")
        .select(CAMPOS_PERFIL_LEGADO)
        .ilike("username", usernameExato(username))
        .limit(1)
        .maybeSingle();
      data = legado.data;
      error = legado.error;
    }
    falha(error);

    if (!data) {
      throw new NotFoundException("Perfil nao encontrado.");
    }
    const linha = data as LinhaUser;
    const meta = usarMetaLegado ? await this.lerMetaLegado(linha.id) : null;
    return perfilDe(linha, meta);
  }

  private async perfisPorIds(userIds: string[]) {
    if (userIds.length === 0) {
      return new Map<string, Perfil>();
    }
    const ids = [...new Set(userIds)];
    const inicial = await this.db.from("User").select(CAMPOS_PERFIL).in("id", ids);
    let data: unknown = inicial.data;
    let error = inicial.error;
    if (erroColunaAusente(error)) {
      const legado = await this.db.from("User").select(CAMPOS_PERFIL_LEGADO).in("id", ids);
      data = legado.data;
      error = legado.error;
    }
    falha(error);
    return new Map(((data ?? []) as LinhaUser[]).map((linha) => [linha.id, perfilDe(linha)]));
  }

  private async filtrarAtividadesValidas(atividades: Atividade[]) {
    if (atividades.length === 0) {
      return [];
    }

    const userIds = [...new Set(atividades.map((a) => a.userId))];
    const [{ data: trackings }, { data: favoritos }] = await Promise.all([
      this.db.from(TABELA_TRACKING).select("userId,mediaItemId").in("userId", userIds),
      this.db.from("Favorite").select("userId,mediaItemId").in("userId", userIds)
    ]);

    const paresTracking = new Set((trackings ?? []).map((t) => `${t.userId}:${t.mediaItemId}`));
    const paresFavorito = new Set((favoritos ?? []).map((f) => `${f.userId}:${f.mediaItemId}`));

    return atividades.filter((a) => {
      if (!a.mediaItemId || a.data?.kind === "PROFILE_META") {
        return false;
      }
      if (a.type === "STATUS" || a.type === "RATING" || a.type === "EPISODES") {
        return paresTracking.has(`${a.userId}:${a.mediaItemId}`);
      }
      if (a.type === "FAVORITE") {
        return paresFavorito.has(`${a.userId}:${a.mediaItemId}`);
      }
      return true;
    });
  }

  // Junta autor e item em cada atividade.
  private async enriquecer(atividades: Atividade[]) {
    const [perfis, itens] = await Promise.all([
      this.perfisPorIds(atividades.map((a) => a.userId)),
      this.catalogoService.buscarSalvos(atividades.flatMap((a) => (a.mediaItemId ? [a.mediaItemId] : [])))
    ]);

    return atividades.map((atividade) => {
      const perfil = perfis.get(atividade.userId);
      return {
        ...atividade,
        user: perfil ? { username: perfil.username, displayName: perfil.displayName } : null,
        item: atividade.mediaItemId ? (itens.get(atividade.mediaItemId) ?? null) : null
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

  async salvarPerfil(authUserId: string, payload: SalvarPerfilDto, email?: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const normalizado = {
      ...payload,
      // String vazia limpa a foto / capa / volta ao tema padrao.
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl || null } : {}),
      ...(payload.bannerUrl !== undefined ? { bannerUrl: payload.bannerUrl || null } : {}),
      ...(payload.theme !== undefined ? { theme: payload.theme || TEMA_PADRAO } : {})
    };
    const valores = Object.fromEntries(Object.entries(normalizado).filter(([, valor]) => valor !== undefined));
    const agora = new Date().toISOString();

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
      const { avatarUrl, bannerUrl, theme, language, ...camposLegados } = normalizado;
      void language;
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
    return perfilDe(data as LinhaUser, metaLegado);
  }

  // Perfil publico

  async buscarPerfis(query: string) {
    const termo = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (termo.length < 2) {
      return [];
    }

    const { data, error } = await this.db
      .from("User")
      .select("username,displayName")
      .eq("isPublic", true)
      .ilike("username", `%${termo}%`)
      .limit(10);
    falha(error);
    return data ?? [];
  }

  async perfilPublico(username: string, visitante?: UsuarioAuth) {
    const perfil = await this.perfilPorUsername(username);
    const visitanteId = visitante ? await this.supabaseService.resolverUserId(visitante.id) : null;
    const isMe = visitanteId === perfil.userId;

    const [seguidores, seguindo, segueEle] = await Promise.all([
      this.db.from("Follow").select("followerId", { count: "exact", head: true }).eq("followingId", perfil.userId),
      this.db.from("Follow").select("followingId", { count: "exact", head: true }).eq("followerId", perfil.userId),
      visitanteId && !isMe
        ? this.db
            .from("Follow")
            .select("followerId")
            .eq("followerId", visitanteId)
            .eq("followingId", perfil.userId)
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
        .select("mediaItemId,status,personalRating,progressCurrent,updatedAt")
        .eq("userId", perfil.userId),
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

    const [itensMapa, duracoes] = await Promise.all([
      this.catalogoService.buscarSalvos([...new Set([...idsFavoritos, ...idsTracking])]),
      typeof this.catalogoService.duracoes === "function"
        ? this.catalogoService.duracoes(idsComDuracao)
        : Promise.resolve(new Map<string, number>())
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
      .map((r) => ({
        item: itensMapa.get(r.mediaItemId!)!,
        status: statusDoBanco(r.status),
        progress: r.progressCurrent ?? 0,
        rating: r.personalRating ?? null
      }));

    const library = registros
      .filter((r) => r.mediaItemId && itensMapa.has(r.mediaItemId))
      .map((r) => ({
        mediaItemId: r.mediaItemId!,
        status: statusDoBanco(r.status),
        rating: r.personalRating ?? null,
        progress: r.progressCurrent ?? 0,
        updatedAt: r.updatedAt ?? null,
        item: itensMapa.get(r.mediaItemId!)!
      }));

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
        const item = itensMapa.get(id);
        return item ? [item] : [];
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

  // Feed: atividades de quem voce segue, mais as suas.

  async feed(authUserId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data: seguindo, error } = await this.db.from("Follow").select("followingId").eq("followerId", userId);
    falha(error);

    const autores = [userId, ...(seguindo ?? []).map((f) => f.followingId as string)];
    const { data: atividades, error: atividadesError } = await this.db
      .from("Activity")
      .select("id,userId,type,mediaItemId,data,createdAt")
      .in("userId", autores)
      .order("createdAt", { ascending: false })
      .limit(50);
    falha(atividadesError);

    const perfis = await this.perfisPorIds(autores);
    // Perfis privados nao aparecem no feed de outras pessoas.
    const visiveis = ((atividades ?? []) as Atividade[]).filter(
      (atividade) => atividade.userId === userId || perfis.get(atividade.userId)?.isPublic
    );

    const validas = await this.filtrarAtividadesValidas(visiveis);

    return {
      followingCount: autores.length - 1,
      items: await this.enriquecer(validas)
    };
  }
}
