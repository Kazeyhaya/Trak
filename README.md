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

O banco é um projeto Supabase. `supabase/schema.sql` é o retrato do schema `public` da produção, e
`supabase/migrations` guarda só as mudanças feitas depois dele. Para montar um banco novo, aplique no SQL Editor
o `schema.sql` e depois as migrações, em ordem de nome. Como criar uma migração e atualizar o retrato:
[supabase/README.md](supabase/README.md).

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
- `npm run db:verificar` — monta o banco num Postgres em memória (retrato + migrações) e roda os testes de SQL.
- `node --env-file=aplicativos/backend/.env scripts/migrar-avatares.mjs [--aplicar]` — passa as fotos de perfil
  antigas (base64 no banco) para o bucket `avatars` do Storage. Sem `--aplicar`, só conta.
- `npm run start:prod` — sobe a API compilada.

## Documentação

- [docs/MUDANCAS.md](docs/MUDANCAS.md) — o que mudou na última rodada, onde está no código e como verificar.
