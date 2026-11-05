import { normalizarTitulo } from "./catalogo.fontes";
import { ClienteCatalogo } from "./catalogo.http";
import { ItemCatalogo, PersonagemEpisodio } from "./catalogo.types";

export type MembroElenco = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type ArteAniList = { nomes: string[][]; imagem: string };

function palavras(nome: string) {
  return normalizarTitulo(nome).split(" ").filter(Boolean);
}

// "Goku" casa com "Son Goku" (todas as palavras de um estao no outro), mas
// "Jason" nao casa com "Son Goku": compara palavras inteiras, nunca trechos.
export function arteDoPersonagem(personagem: string, artes: ArteAniList[]): string | null {
  const alvo = palavras(personagem);
  if (alvo.length === 0) {
    return null;
  }
  const contido = (menor: string[], maior: string[]) => menor.every((p) => maior.includes(p));
  const exata = artes.find((a) => a.nomes.some((n) => n.join(" ") === alvo.join(" ")));
  const parcial = artes.find((a) => a.nomes.some((n) => contido(alvo, n) || contido(n, alvo)));
  return (exata ?? parcial)?.imagem ?? null;
}

// Elenco do TMDB virado em personagens (um por nome). Em animacoes, a foto do dublador
// nao representa o personagem: usa a arte do AniList quando encontra.
export async function montarPersonagens(
  http: ClienteCatalogo,
  obra: ItemCatalogo | null,
  membros: MembroElenco[],
  limite: number
): Promise<PersonagemEpisodio[]> {
  const temDublagem = membros.some((m) => /\((?:voice|voz)\)/i.test(m.character ?? ""));
  const ehAnimacao = obra?.subtype === "ANIME" || obra?.subtype === "ANIMACAO" || temDublagem;
  const artes = ehAnimacao && obra?.title ? await artesAniList(http, obra.title) : [];

  const unicos = new Map<string, PersonagemEpisodio>();
  for (const m of membros) {
    const personagem = (m.character ?? "")
      .replace(/\s*\((?:voice|voz|japanese|english)\)/gi, "")
      .replace(/["']/g, "")
      .trim();
    const chave = personagem.toLowerCase();
    if (!personagem || unicos.has(chave)) {
      continue;
    }
    const foto = m.profile_path ? `https://image.tmdb.org/t/p/w185${m.profile_path}` : null;
    unicos.set(chave, {
      id: String(m.id),
      name: m.name,
      character: personagem,
      avatarUrl: arteDoPersonagem(personagem, artes) ?? foto
    });
  }
  return Array.from(unicos.values()).slice(0, limite);
}

const CONSULTA_ANILIST = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      characters(sort: ROLE, perPage: 25) {
        edges { node { name { full userPreferred } image { medium large } } }
      }
    }
  }
`;

type RespostaAniList = {
  data?: {
    Media?: {
      characters?: {
        edges?: Array<{
          node?: { name?: { full?: string; userPreferred?: string }; image?: { medium?: string; large?: string } };
        }>;
      };
    };
  };
};

async function artesAniList(http: ClienteCatalogo, titulo: string): Promise<ArteAniList[]> {
  const busca = titulo.trim();
  if (!busca) {
    return [];
  }

  // Falha volta null para nao ficar em cache; quem chama recebe lista vazia.
  const artes = await http.comCache(`anilist:chars:${normalizarTitulo(busca)}`, async () => {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: CONSULTA_ANILIST, variables: { search: busca } }),
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) {
        return null;
      }
      const json = (await res.json()) as RespostaAniList;
      return (json.data?.Media?.characters?.edges ?? []).flatMap((e) => {
        const imagem = e.node?.image?.medium || e.node?.image?.large;
        const nomes = [e.node?.name?.full, e.node?.name?.userPreferred].flatMap((n) => (n ? [palavras(n)] : []));
        return imagem && nomes.length ? [{ nomes, imagem }] : [];
      });
    } catch {
      return null;
    }
  });
  return artes ?? [];
}
