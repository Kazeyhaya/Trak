import { redirect } from "next/navigation";

// O antigo formulario de perfil virou a pagina de configuracoes; links antigos continuam valendo.
export default function PerfilPage() {
  redirect("/configuracoes");
}
