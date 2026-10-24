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

// O perfil publico mora na propria tabela "User" (id = id do Supabase Auth).
const CAMPOS_PERFIL = "id,username,displayName,bio,isPublic,createdAt";

type LinhaUser = Omit<Perfil, "userId"> & { id: string };

function perfilDe(linha: LinhaUser): Perfil {
  const { id, ...resto } = linha;
  return { ...resto, userId: id, isPublic: linha.isPublic ?? true };
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

type MetaPerfil = {
  kind: "PROFILE_META";
  bannerUrl?: string | null;
  theme?: string | null;
  hasImported?: boolean;
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

  private async perfilPorUsername(username: string) {
    const { data, error } = await this.db
      .from("User")
      .select(CAMPOS_PERFIL)
      .ilike("username", usernameExato(username))
      .limit(1)
      .maybeSingle();
    falha(error);

    if (!data) {
      throw new NotFoundException("Perfil nao encontrado.");
    }
    return perfilDe(data as LinhaUser);
  }

  private async perfisPorIds(userIds: string[]) {
    if (userIds.length === 0) {
      return new Map<string, Perfil>();
    }
    const { data, error } = await this.db.from("User").select(CAMPOS_PERFIL).in("id", [...new Set(userIds)]);
    falha(error);
    return new Map(((data ?? []) as LinhaUser[]).map((linha) => [linha.id, perfilDe(linha)]));
  }

  private async lerMetaPerfil(userId: string): Promise<MetaPerfil> {
    const { data } = await this.db
      .from("Activity")
      .select("id,data")
      .eq("id", userId)
      .maybeSingle();
    const linha = data && !Array.isArray(data) ? (data as { data?: MetaPerfil }) : null;
    const meta = linha?.data;
    return {
      kind: "PROFILE_META",
      bannerUrl: typeof meta?.bannerUrl === "string" ? meta.bannerUrl : null,
      theme: typeof meta?.theme === "string" ? meta.theme : "emerald",
      hasImported: Boolean(meta?.hasImported)
    };
  }

  async salvarMetaPerfil(userId: string, parcial: Partial<Omit<MetaPerfil, "kind">>) {
    const atual = await this.lerMetaPerfil(userId);
    const novo: MetaPerfil = {
      kind: "PROFILE_META",
      bannerUrl: parcial.bannerUrl !== undefined ? (parcial.bannerUrl || null) : (atual.bannerUrl ?? null),
      theme: parcial.theme !== undefined ? (parcial.theme || "emerald") : (atual.theme ?? "emerald"),
      hasImported: parcial.hasImported !== undefined ? parcial.hasImported : Boolean(atual.hasImported)
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
    const { data, error } = await this.db.from("User").select(CAMPOS_PERFIL).eq("id", userId).maybeSingle();
    falha(error);
    const meta = data ? await this.lerMetaPerfil(userId) : null;

    return {
      profile: data
        ? {
            ...perfilDe(data as LinhaUser),
            bannerUrl: meta?.bannerUrl ?? null,
            theme: meta?.theme ?? "emerald",
            hasImported: Boolean(meta?.hasImported)
          }
        : null,
      isAdmin: ehAdmin(usuario.email)
    };
  }

  async salvarPerfil(authUserId: string, payload: SalvarPerfilDto, email?: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { bannerUrl, theme, ...camposUser } = payload;
    const valores = Object.fromEntries(Object.entries(camposUser).filter(([, valor]) => valor !== undefined));
    const agora = new Date().toISOString();

    // A linha em "User" normalmente ja existe (trigger de cadastro); se nao, e criada aqui.
    let resultado = await this.db
      .from("User")
      .update({ ...valores, updatedAt: agora })
      .eq("id", userId)
      .select(CAMPOS_PERFIL)
      .maybeSingle();

    if (!resultado.error && !resultado.data) {
      const novoRegistro = {
        ...valores,
        id: userId,
        authUserId,
        ...(email ? { email } : {}),
        createdAt: agora,
        updatedAt: agora
      };
      resultado = await this.db
        .from("User")
        .insert(novoRegistro)
        .select(CAMPOS_PERFIL)
        .maybeSingle();
    }

    if (resultado.error?.code === "23505") {
      throw new ConflictException("Este nome de usuario ja esta em uso.");
    }
    falha(resultado.error);

    let meta: MetaPerfil | null = null;
    if (bannerUrl !== undefined || theme !== undefined) {
      meta = await this.salvarMetaPerfil(userId, {
        ...(bannerUrl !== undefined ? { bannerUrl: bannerUrl || null } : {}),
        ...(theme !== undefined ? { theme: theme || "emerald" } : {})
      });
    }

    const perfilBase = perfilDe(resultado.data as LinhaUser);
    return meta
      ? {
          ...perfilBase,
          bannerUrl: meta.bannerUrl ?? null,
          theme: meta.theme ?? "emerald",
          hasImported: Boolean(meta.hasImported)
        }
      : perfilBase;
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

    const [seguidores, seguindo, segueEle, meta] = await Promise.all([
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
      this.lerMetaPerfil(perfil.userId)
    ]);

    const base = {
      profile: {
        username: perfil.username,
        displayName: perfil.displayName,
        bio: perfil.bio,
        isPublic: perfil.isPublic,
        bannerUrl: meta.bannerUrl ?? null,
        theme: meta.theme ?? "emerald"
      },
      followers: seguidores.count ?? 0,
      following: seguindo.count ?? 0,
      isFollowing: Boolean(segueEle.data),
      isMe
    };

    if (!perfil.isPublic && !isMe) {
      return { ...base, isPrivate: true, stats: null, summary: null, inProgress: [], favorites: [], activity: [] };
    }

    const [tracking, favoritos, atividades] = await Promise.all([
      this.db.from(TABELA_TRACKING).select("mediaItemId,status,personalRating,progressCurrent").eq("userId", perfil.userId),
      this.db
        .from("Favorite")
        .select("mediaItemId")
        .eq("userId", perfil.userId)
        .order("createdAt", { ascending: false })
        .limit(12),
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
    }>;
    const notas = registros.flatMap((r) => (r.personalRating ? [r.personalRating] : []));
    const porStatus = registros.reduce<Record<string, number>>((acc, r) => {
      const status = statusDoBanco(r.status);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    const idsFavoritos = (favoritos.data ?? []).map((f) => f.mediaItemId as string);
    const idsTracking = registros.flatMap((r) => (r.mediaItemId ? [r.mediaItemId] : []));
    const itensMapa = await this.catalogoService.buscarSalvos([...new Set([...idsFavoritos, ...idsTracking])]);

    let gamesCompleted = 0;
    let booksRead = 0;
    let moviesWatched = 0;
    let seriesCompleted = 0;
    let estimatedHours = 0;

    for (const r of registros) {
      const status = statusDoBanco(r.status);
      const item = r.mediaItemId ? itensMapa.get(r.mediaItemId) : undefined;
      const prog = Math.max(0, Math.min(100, r.progressCurrent ?? (status === "COMPLETED" ? 100 : 25)));

      if (item?.type === "GAME") {
        if (status === "COMPLETED") {
          gamesCompleted++;
          estimatedHours += 25;
        } else if (status === "WATCHING" || status === "PAUSED") {
          estimatedHours += Math.max(2, Math.round(25 * (prog / 100)));
        }
      } else if (item?.type === "BOOK") {
        if (status === "COMPLETED") {
          booksRead++;
          estimatedHours += 8;
        } else if (status === "WATCHING" || status === "PAUSED") {
          estimatedHours += Math.max(1, Math.round(8 * (prog / 100)));
        }
      } else if (item?.type === "MOVIE") {
        if (status === "COMPLETED") {
          moviesWatched++;
          estimatedHours += 2;
        }
      } else if (item?.type === "SERIES") {
        if (status === "COMPLETED") {
          seriesCompleted++;
          estimatedHours += 12;
        } else if (status === "WATCHING" || status === "PAUSED") {
          estimatedHours += 5;
        }
      }
    }

    const inProgress = registros
      .filter((r) => statusDoBanco(r.status) === "WATCHING" && r.mediaItemId && itensMapa.has(r.mediaItemId))
      .slice(0, 4)
      .map((r) => ({
        item: itensMapa.get(r.mediaItemId!)!,
        status: statusDoBanco(r.status),
        progress: r.progressCurrent ?? 0,
        rating: r.personalRating ?? null
      }));

    return {
      ...base,
      isPrivate: false,
      stats: {
        total: registros.length,
        byStatus: porStatus,
        averageRating: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null
      },
      summary: {
        gamesCompleted,
        booksRead,
        moviesWatched,
        seriesCompleted,
        estimatedHours
      },
      inProgress,
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
