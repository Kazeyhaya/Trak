import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ProfileHub } from "../../../componentes/profile-hub";
import { PublicProfile } from "../../../lib/api";
import { fetchJson } from "../../../lib/catalogo-api";
import { tokenDoServidor } from "../../../lib/supabase-server";

type ProfilePageProps = { params: Promise<{ username: string }> };

export const dynamic = "force-dynamic";

function sanitizarUsername(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

const getProfile = cache(async (username: string) => {
  const limpo = sanitizarUsername(username);
  const token = await tokenDoServidor();
  return fetchJson<PublicProfile>(`/perfis/${encodeURIComponent(limpo.toLowerCase())}`, token);
});

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    return { title: "Trak | Perfil não encontrado" };
  }

  const nome = data.profile.displayName || `@${data.profile.username}`;
  return {
    title: `${nome} | Trak`,
    description: data.profile.bio ?? `Veja o que ${nome} está assistindo, jogando e lendo no Trak.`,
    robots: data.isPrivate ? { index: false } : undefined
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    notFound();
  }

  return <ProfileHub initialData={data} />;
}
