# Trak

This will be the most beautiful app and website about tracking your tv shows, movies, games and possibly books.

## Estrutura

- `aplicativos/backend` — API NestJS (`@trak/api`), fala com Supabase, TMDB e RAWG.
- `aplicativos/frontend` — site Next.js (`@trak/web`), autenticação via Supabase Auth.

## Rodando localmente

Requer Node 22+.

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
- `npm run start:prod` — sobe a API compilada.
