import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { ProfileForm } from "../../componentes/profile-form";

export const metadata: Metadata = { title: "Trak | Seu perfil" };

export default function PerfilPage() {
  return (
    <AuthGuard>
      <ProfileForm />
    </AuthGuard>
  );
}
