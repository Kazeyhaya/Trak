# Mudanças: rodada de melhorias (outubro/2026)

Guia para revisar o que mudou. Cada seção diz **o que foi feito**, **onde está no código** e **como verificar**.
Caminhos relativos à raiz do repositório.

---

## 0. Antes de rodar: passos obrigatórios

1. **Aplique a migration no Supabase:** `supabase/migrations/20261019000000_trak_social.sql` (SQL Editor ou
   `supabase db push`). Ela **complementa o schema existente** e não apaga nem renomeia nada:
   - defaults de `createdAt`/`updatedAt` (o Prisma não cria default para `@updatedAt`);
   - colunas `displayName` e `isPublic` em `User` (o perfil público é a própria tabela `User`);
   - trigger `trak_criar_usuario`: cria a linha em `User` em cada cadastro (id = id do Auth, username provisório
     `user_` + 12 caracteres) e preenche as contas que já existiam;
   - índices únicos usados pelos upserts (`UserMedia`, `Favorite`, `CommentLike`, `CommentReport`), criados só se
     ainda não houver um equivalente nem linhas duplicadas;
   - tabelas novas `EpisodeProgress`, `Follow` e `Activity`, com RLS ativo e sem políticas.

   Foi testada no Postgres 17 (PGlite) contra uma réplica do schema atual: aplicada duas vezes, com trigger,
   preenchimento das contas, índices, chaves estrangeiras e as escritas exatas do backend conferidos.
2. **Novas variáveis de ambiente** (veja os `.env.example`):
   - Backend: `ADMIN_EMAILS` (quem acessa a moderação), `STEAM_API_KEY` (opcional, para importar da Steam),
     `TRUST_PROXY=1` (quando a API estiver atrás de um proxy ou load balancer, senão o rate limit trata todo
     mundo como um único IP).
   - Frontend: `NEXT_PUBLIC_SITE_URL` (URL pública, usada na prévia de links compartilhados).
   - Atenção: variáveis `NEXT_PUBLIC_*` são embutidas **no build**. Mudou o valor? Rode o build de novo.
3. **Mapeamento entre a API e o banco.** O tracking fica na tabela `UserMedia`. A tradução está toda em
   `aplicativos/backend/src/modulos/tracking/tracking.banco.ts`:
   `WATCHING` ↔ `IN_PROGRESS`, `progress` ↔ `progressCurrent` (guarda a **porcentagem**, 0–100),
   `rating` ↔ `personalRating` (escala de **1 a 5**). Ao mudar de status, o backend também preenche
   `startedAt`, `finishedAt` e `timesConsumed`. Favoritos usam só a tabela `Favorite`.

---

## 1. Páginas públicas + autenticação no servidor

**O que mudou:** a sessão do Supabase saiu do `localStorage` e foi para cookies (`@supabase/ssr`), que o servidor
consegue ler. Catálogo, itens, perfis e landing são públicos e renderizados no servidor (bom para SEO e para a
prévia de links). Só as rotas pessoais exigem login.

| Onde | O quê |
|---|---|
| `aplicativos/frontend/src/proxy.ts` | Renova a sessão a cada navegação e redireciona para `/entrar?next=…` quem não está logado (no Next 16, o antigo `middleware.ts` se chama `proxy.ts`) |
| `aplicativos/frontend/src/lib/rotas.ts` | Lista de rotas privadas (`ROTAS_PRIVADAS`) e `destinoSeguro()`, que impede redirecionamento aberto pelo `?next=` |
| `aplicativos/frontend/src/lib/supabase-client.ts` / `supabase-server.ts` / `supabase-config.ts` | Cliente do navegador (cookies) e cliente do servidor |
| `aplicativos/frontend/src/app/itens/[slug]/page.tsx` | Sem `AuthGuard`; `generateMetadata` gera Open Graph (título, capa), Twitter card e canonical |
| `aplicativos/frontend/src/componentes/auth-shell.tsx` | Depois do login, volta para a página de origem (`next`) |
| `aplicativos/backend/src/comum/autenticacao/supabase-auth.guard.ts` | `AutenticacaoOpcionalGuard`: rotas públicas que personalizam a resposta quando há login (ex.: comentários) |

**Como verificar:** deslogado, abra `/painel` (deve ir para `/entrar?next=%2Fpainel`) e `/itens/<id>` (deve abrir).
Rode `curl <site>/itens/<id>` e procure `<h1>` e `og:image` no HTML.

## 2. Landing page em `/`

`aplicativos/frontend/src/app/page.tsx`: Server Component com proposta de valor, recursos e destaques reais
da semana. Quem já está logado vai direto para `/painel`.

## 3. Livros (Open Library)

O Open Library não exige chave, então o catálogo funciona mesmo sem TMDB/RAWG configurados.

| Onde | O quê |
|---|---|
| `aplicativos/backend/src/modulos/catalogo/catalogo.fontes.ts` | `mapearOpenLibrary()`, formato de id `openlibrary_book_OL…W` em `parsearId()`/`montarId()` |
| `aplicativos/backend/src/modulos/catalogo/catalogo.service.ts` | `listarLivros()` (em alta da semana e busca) e `carregarItem()` (detalhe da obra) |
| `aplicativos/frontend/src/componentes/filter-bar.tsx` | Filtro "Livros" de volta |
| `aplicativos/frontend/next.config.ts` | `covers.openlibrary.org` liberado para o `next/image` |

## 4. Progresso por episódio (séries)

| Onde | O quê |
|---|---|
| `aplicativos/backend/src/modulos/catalogo/catalogo.service.ts` | `listarTemporadas()`, `listarEpisodios()` e `totalEpisodiosExibidos()` (só conta episódios já exibidos, sem especiais) |
| `aplicativos/backend/src/modulos/tracking/tracking.service.ts` | `marcarEpisodios()`: grava ou remove episódios e recalcula progresso e status |
| `aplicativos/backend/src/modulos/tracking/tracking.regras.ts` | Regras puras: `calcularProgresso()` e `statusAposEpisodios()` (100% conclui; pausado e abandonado não mudam sozinhos) |
| `aplicativos/frontend/src/componentes/episodes-panel.tsx` | Abas de temporada, checkbox por episódio e "marcar temporada"; episódios futuros ficam desabilitados |
| Tabela `EpisodeProgress` | Na migration (passo 5) |

Endpoints: `GET /api/catalogo/:id/temporadas`, `GET /api/catalogo/:id/temporadas/:n`,
`GET|PUT /api/tracking/items/:id/episodios`.

## 5. Notas 1–5, anotações e status "Abandonado"

| Onde | O quê |
|---|---|
| `aplicativos/backend/src/modulos/tracking/dto/salvar-tracking.dto.ts` | `DROPPED` em `STATUS_TRACKING`; `rating` de 1 a 5 (null limpa); `notes` até 2000 caracteres |
| `aplicativos/frontend/src/componentes/rating-stars.tsx` | Estrelas acessíveis (radiogroup); clicar na nota atual remove a nota |
| `aplicativos/frontend/src/componentes/item-shell.tsx` | `PersonalTracking`: status, progresso, nota, anotações, favorito, compartilhar |
| `aplicativos/frontend/src/lib/api.ts` | `getStatusLabel()`, com rótulo por tipo ("Zerado" para jogo, "Lido" para livro, "Abandonado") |

## 6. Perfil público, seguidores e feed

| Onde | O quê |
|---|---|
| `aplicativos/backend/src/modulos/social/social.service.ts` | Perfil na tabela `User` (`meuPerfil`, `salvarPerfil`), `perfilPublico` (busca de username sem diferenciar maiúsculas, via `usernameExato()`), `seguir`/`deixarDeSeguir`, `feed` (perfis privados não aparecem no feed dos outros) |
| `aplicativos/backend/src/modulos/social/atividades.service.ts` | `registrar()`, best-effort: se falhar, não derruba a ação principal |
| Onde as atividades são geradas | `tracking.service.ts` (status, nota, episódios), `favoritos.service.ts`, `comentarios.service.ts` |
| `aplicativos/frontend/src/app/u/[username]/page.tsx` | Perfil público renderizado no servidor |
| `aplicativos/frontend/src/componentes/feed-shell.tsx` | Feed e busca de pessoas |
| `aplicativos/frontend/src/componentes/profile-form.tsx` | Criar e editar perfil (`/perfil`) |
| `aplicativos/frontend/src/lib/atividades.ts` | Texto de cada atividade e "há 5 min" |

## 7. Recomendações e alertas

| Onde | O quê |
|---|---|
| `aplicativos/backend/src/modulos/recomendacoes/recomendacoes.regras.ts` | `escolherSementes()` (notas altas, favoritos, concluídos; ignora abandonados e notas ≤ 3) e `ranquear()` (soma pontos de quem aparece em várias listas, remove o que você já acompanha) |
| `aplicativos/backend/src/modulos/catalogo/catalogo.service.ts` | `relacionados()` (TMDB recommendations, mesmo gênero no RAWG, mesmo assunto no Open Library) e `novidades()` |
| `aplicativos/frontend/src/componentes/alerts-section.tsx` | Alertas no painel: novo episódio (últimos 7 dias), próximo episódio (próximos 30 dias), estreias (próximos 60 dias) |
| `aplicativos/frontend/src/componentes/related-items.tsx` | "Parecidos com este" na página do item |

Os alertas aparecem **dentro do app** (painel). Notificação push ainda não existe (veja "Limitações").

## 8. PWA + importação

**PWA:** `aplicativos/frontend/src/app/manifest.ts`, `app/pwa-icon/[size]/route.tsx`, `app/icon.tsx` e
`app/apple-icon.tsx` (ícones gerados em código, em `lib/icone.tsx`), `public/sw.js` (cache dos arquivos estáticos
e página `/offline` sem internet; a API nunca sai do cache) e `componentes/pwa-register.tsx` (só registra em
produção).

**Importação**: o backend fica em `aplicativos/backend/src/modulos/importacao/`.

| Fonte | Entrada | Parser |
|---|---|---|
| Letterboxd | CSV (watched, ratings, diary, watchlist) | `linhasLetterboxd()` em `importacao.parsers.ts`; busca o filme no TMDB por título e ano |
| Trakt | JSON da exportação | `itensTrakt()`; usa o id do TMDB direto, sem busca, e importa episódios |
| Steam | URL do perfil ou SteamID64 | `interpretarPerfilSteam()` e `jogosSteam()`; busca o jogo no RAWG pelo nome |

Regras (`importacao.service.ts`): até 500 itens por vez, **não sobrescreve** o que já está no Trak, não gera
atividade no feed por item e devolve a lista do que não foi encontrado. Tela: `componentes/import-shell.tsx`.

## 9. Parte técnica

| Item | Onde |
|---|---|
| `strict: true` | `aplicativos/backend/tsconfig.json`, `aplicativos/frontend/tsconfig.json` (o backend também passou a compilar para ES2022) |
| Rate limit | `aplicativos/backend/src/app.module.ts` (120 req/min por IP); limites menores com `@Throttle` em `comentarios.controller.ts` (10/min para publicar, 5/min para denunciar) e `importacao.controller.ts` (3 a cada 10 min) |
| Helmet e limite de corpo (6 MB) | `aplicativos/backend/src/main.ts` |
| Headers de segurança no site | `aplicativos/frontend/next.config.ts` |
| Moderação | Backend: `modulos/moderacao/`, protegido por `AdminGuard` + `ADMIN_EMAILS`. Tela: `componentes/moderation-shell.tsx` (`/moderacao`). Remover comentário fecha todas as denúncias dele; se o banco impedir o DELETE (chave estrangeira), o conteúdo é ocultado (`apagarOuOcultar()` em `comentarios.service.ts`) |
| Botão "Denunciar" | `componentes/comments-section.tsx` (antes não havia como denunciar pela interface) |
| CI | `.github/workflows/ci.yml`: `npm ci`, lint, typecheck, testes e build a cada push e PR |

---

## 10. Testes

`npm test` na raiz roda tudo. São **174 testes** (122 no backend com Jest, 52 no frontend com Vitest).

| Arquivo | Cobre |
|---|---|
| `backend/src/app.e2e.spec.ts` | Sobe a API de verdade: helmet, 401 nas rotas privadas, 400/404 de validação, **429 do rate limit** |
| `backend/src/comum/validacao.spec.ts` | Todos os DTOs com o mesmo `ValidationPipe` do `main.ts` |
| `backend/src/comum/autenticacao/supabase-auth.guard.spec.ts` | Guards de login, login opcional e admin |
| `backend/src/modulos/tracking/tracking.banco.spec.ts` | Tradução API ↔ `UserMedia` (status, nomes de coluna, datas, `timesConsumed`) |
| `backend/src/modulos/social/social.service.spec.ts` | Perfil na tabela `User`, conflito de username (409), estatísticas a partir de `UserMedia` |
| `backend/src/modulos/tracking/tracking.service.spec.ts` | Atualização parcial, atividades, episódios (com o mock em `src/testes/supabase.mock.ts`) |
| `backend/src/modulos/catalogo/*.spec.ts` | IDs, mapeadores, cache, temporadas e alertas (com `fetch` simulado) |
| `backend/src/modulos/importacao/importacao.parsers.spec.ts` | CSV (aspas, BOM, CRLF), Letterboxd, Trakt, Steam |
| `backend/src/modulos/recomendacoes/recomendacoes.regras.spec.ts` | Escolha de sementes e ranking |
| `frontend/src/lib/*.test.ts` | Cliente de API, rotas e `?next=`, textos do feed, importação |

## 11. Bugs encontrados durante os testes (já corrigidos)

1. **Os chips selecionados não tinham estilo** (bug anterior a esta rodada): `.filter-chip.is-active` não existia no
   CSS, então o status escolhido na página do item e o filtro ativo do catálogo não apareciam selecionados.
   Correção em `styles/pages/social.css`.
2. **Livros parecidos sem capa**: a API `/subjects` do Open Library devolve `cover_id`, e não `cover_i` como a de
   busca. Correção em `mapearOpenLibrary()`, com teste.
3. **Detalhes internos apareciam na tela**: erros 500 mostravam a mensagem crua do servidor (ex.: "Configure
   SUPABASE_URL…"). Agora `errorMessage()` em `lib/api.ts` mostra um texto genérico; os 503 intencionais (ex.:
   Steam) continuam visíveis.
4. **Capas cortadas**: os cards usavam proporção 16:9, mas pôsteres e capas são 2:3. A grade passou a ter várias
   colunas (`styles/pages/content.css`).
5. **No celular, a capa empurrava o título para fora da tela** (cerca de 800px de altura). Agora ela tem no máximo
   260px de largura (`styles/responsive.css`).

6. **O código não batia com o schema real do banco** (encontrado ao aplicar a migration): o backend usava
   `TrackingItem`/`progress`/`rating`/`WATCHING`, mas o banco tem `UserMedia`/`progressCurrent`/`personalRating`/
   `IN_PROGRESS`, e a tabela `Profile` duplicava campos de `User`. O código foi adaptado ao schema existente
   (`tracking.banco.ts`, `social.service.ts`) e as escritas passaram a enviar `updatedAt`, que é obrigatório.

7. **Capa da página do item recortada e saindo do quadro**: a grade usava `align-items: stretch`, então a
   capa esticava até a altura da coluna de texto (que fica alta para quem está logado) e o `object-fit: cover`
   recortava uma fatia ampliada da imagem. Agora a capa tem proporção fixa 2:3 e fica fixa ao rolar a página
   (`styles/pages/item.css`, `styles/responsive.css`).

**Filtro "Animes e animações"** (catálogo): séries e filmes do gênero Animação do TMDB (id 16), via
`/discover`, ordenados por popularidade. Na busca por texto, os resultados são filtrados pelo mesmo gênero.
Código em `listarAnimacoes()` (`catalogo.service.ts`) e no chip de `filter-bar.tsx`.

## 12. O que **não** foi testado e limitações

- **Nada foi testado contra um Supabase real.** As consultas ao banco foram verificadas com mock. Depois de aplicar
  a migration, teste à mão: criar conta, criar perfil, seguir alguém, marcar episódios, dar nota, importar,
  denunciar e moderar.
- **As telas logadas não foram vistas no navegador** (painel, feed, episódios, importação, moderação), pela mesma
  razão. As telas públicas (landing, catálogo, item, desktop e mobile) foram conferidas por screenshot.
- **TMDB, RAWG e Steam reais não foram testados** (não havia chaves); só o Open Library, que funcionou ao vivo.
- **Sem notificação push**: os alertas só aparecem no painel. Push exige chaves VAPID, uma tabela de inscrições e
  um job agendado.
- **Linha em `User`**: resolvido pelo trigger `trak_criar_usuario` da migration base, que usa o mesmo id do
  Auth. Assim, o fallback de `resolverUserId()` em `supabase.service.ts` e a linha do banco sempre coincidem.
- **O cache do catálogo fica em memória** (`catalogo.service.ts`): com várias instâncias da API, cada uma tem o
  seu próprio. Para escalar, troque por Redis.
- **A importação é síncrona**: 500 itens podem levar cerca de 1 a 2 minutos com a requisição aberta. Para listas
  maiores, o próximo passo seria uma fila de jobs.
