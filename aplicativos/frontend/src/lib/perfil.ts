import type { ProfileLibraryItem, TrackingStatus } from "./api";
import type { CatalogItem, MediaType } from "./catalogo-api";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Explica por que o nome de usuario digitado nao e aceito.
export function problemaUsername(valor: string) {
  const normalizado = valor.trim().toLowerCase();
  if (normalizado.includes("@")) {
    return "Use um nome de usuário, não o seu e-mail (ex.: alex_allen).";
  }
  if (normalizado.length < 3) {
    return "Use pelo menos 3 caracteres.";
  }
  if (normalizado.length > 20) {
    return "Use no máximo 20 caracteres.";
  }
  return USERNAME_PATTERN.test(normalizado) ? null : "Use só letras sem acento, números ou _ (sem espaços ou pontos).";
}

// Filtra as obras concluidas na estante no ano especificado (para a meta anual).
export function filtrarConcluidosNoAno(
  library: ProfileLibraryItem[],
  currentYear: number
): ProfileLibraryItem[] {
  return library.filter((entry) => {
    if (entry.status !== "COMPLETED") {
      return false;
    }
    if (!entry.updatedAt) {
      return true;
    }
    return new Date(entry.updatedAt).getFullYear() === currentYear;
  });
}

// Filtra a estante por status e por tipo de midia.
export function filtrarEstante(
  library: ProfileLibraryItem[],
  statusFilter?: TrackingStatus | "",
  typeFilter?: MediaType | ""
): ProfileLibraryItem[] {
  return library.filter((entry) => {
    if (statusFilter && entry.status !== statusFilter) {
      return false;
    }
    if (typeFilter && entry.item.type !== typeFilter) {
      return false;
    }
    return true;
  });
}

// Filtra a lista de favoritos por tipo de midia.
export function filtrarFavoritos(
  favorites: CatalogItem[],
  favTypeFilter?: MediaType | ""
): CatalogItem[] {
  if (!favTypeFilter) {
    return favorites;
  }
  return favorites.filter((fav) => fav.type === favTypeFilter);
}

export const completedThisYear = filtrarConcluidosNoAno;
export const filteredLibrary = filtrarEstante;
export const filteredFavorites = filtrarFavoritos;
