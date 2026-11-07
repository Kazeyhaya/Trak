-- Bucket publico "avatars" no Supabase Storage para as fotos de perfil.
--
-- A API (service role) grava em avatars/<userId>/<hash>.<ext> e salva so o link em
-- "User"."avatarUrl"; antes a foto ia em base64 na propria coluna (ate 60 KB por pessoa
-- em cada lista de perfis). Leitura e publica pelo link; nenhuma politica em
-- storage.objects e necessaria, porque so a service role grava e apaga.
--
-- Depois de aplicar, converta as fotos antigas:
--   node --env-file=aplicativos/backend/.env scripts/migrar-avatares.mjs           (so conta)
--   node --env-file=aplicativos/backend/.env scripts/migrar-avatares.mjs --aplicar
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
