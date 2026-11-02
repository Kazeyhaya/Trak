-- Adiciona campos opcionais para avaliação fracionada de episódios e o personagem que "Roubou a Cena".
-- Adiciona campos opcionais em UserMedia para a Coroação do "Personagem Favorito da Obra" (Panteão pessoal ao concluir).
-- Idempotente: seguro para rodar múltiplas vezes.

alter table public."EpisodeProgress"
  add column if not exists "rating" numeric(3,1),
  add column if not exists "highlightCharacterId" text,
  add column if not exists "highlightCharacterName" text,
  add column if not exists "highlightCharacterAvatar" text;

alter table public."UserMedia"
  add column if not exists "favoriteCharacterName" text,
  add column if not exists "favoriteCharacterAvatar" text;
