# Trak

Caderno de filmes, séries, jogos e livros: progresso por episódio, página ou hora jogada, notas em meias
estrelas, quem roubou a cena em cada episódio e o Panteão com o personagem favorito de cada obra concluída.

## Estrutura

- `aplicativos/backend` — API NestJS (`@trak/api`). Fala com o Supabase (service role) e com as fontes do
  catálogo: TMDB, RAWG, IGDB, Open Library, Google Books e Hardcover (um adaptador por fonte em
  `src/modulos/catalogo/fontes`).
- `aplicativos/frontend` — site Next.js (`@trak/web`), autenticação via Supabase Auth.

## Rodando localmente

Requer Node 22+.

O schema base do Supabase (`User`, `MediaItem`, `UserMedia`, `Favorite`, `Follow`, `Activity`,
`EpisodeProgress`, `Comment`, `CommentLike`, `CommentReport` e o trigger `trak_criar_usuario`) ainda não está
versionado neste repositório. As migrações em `supabase/migrations` o complementam: aplique-as em ordem de nome
no SQL Editor antes de subir uma versão nova da API.

O site não lê tabelas pelo Supabase; tudo passa pela API. Por isso todas as tabelas têm RLS ativo e nenhuma
policy (a anon key não acessa dados).

```bash
npm install
cp aplicativos/backend/.env.example aplicativos/backend/.env    # preencha as chaves
cp aplicativos/frontend/.env.example aplicativos/frontend/.env.local
npm run dev:api   # http://localhost:3001/api
npm run dev:web   # http://localhost:3000
```

## Scripts

- `npm run build` — compila os dois workspaces.
- `npm run lint` — roda o ESLint nos dois workspaces.
- `npm run typecheck` — checagem de tipos (`strict`) nos dois workspaces.
- `npm test` — testes (Jest no backend, Vitest no frontend).
- `npm run start:prod` — sobe a API compilada.

## Documentação

- [docs/MUDANCAS.md](docs/MUDANCAS.md) — o que mudou na última rodada, onde está no código e como verificar.
