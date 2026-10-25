"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";

export type Language = "pt-BR" | "en-US";

type Translations = Record<string, string>;

const TRANSLATIONS: Record<Language, Translations> = {
  "pt-BR": {
    // Navegação
    "nav.catalog": "Catálogo",
    "nav.feed": "Feed",
    "nav.forYou": "Para você",
    "nav.moderation": "Moderação",
    "nav.signIn": "Entrar",
    "nav.signOut": "Sair",
    "nav.myProfile": "Meu perfil",
    "nav.createProfile": "Criar perfil",

    // Catálogo e Filtros
    "catalog.searchPlaceholder": "Buscar filmes, séries, jogos e livros",
    "catalog.noResults": "Sem resultados",
    "catalog.noResultsFor": "Nada encontrado para",
    "catalog.clearSearch": "Limpar busca",
    "catalog.all": "Todos",
    "catalog.movies": "Filmes",
    "catalog.series": "Séries",
    "catalog.games": "Jogos",
    "catalog.books": "Livros",
    "catalog.anime": "Animes",
    "catalog.novelas": "Novelas",
    "catalog.doramas": "Doramas",

    // Tracking e Ações
    "tracking.saveChanges": "Salvar alterações",
    "tracking.discard": "Descartar",
    "tracking.saving": "Salvando…",
    "tracking.unsavedChanges": "Alterações não salvas",
    "tracking.notStarted": "Não iniciado",
    "tracking.outOfTracking": "Fora do tracking",
    "tracking.remove": "Remover do tracking",
    "tracking.favorite": "★ Favorito",
    "tracking.addFavorite": "☆ Favoritar",
    "tracking.share": "Compartilhar",
    "tracking.notes": "Suas anotações (só você vê)",
    "tracking.notesPlaceholder": "O que você achou? Onde parou?",
    "tracking.rating": "Sua nota",

    // Status
    "status.want_see": "Quero ver",
    "status.watching": "Assistindo",
    "status.completed_see": "Concluído",
    "status.want_play": "Quero jogar",
    "status.playing": "Jogando",
    "status.completed_play": "Zerado",
    "status.want_read": "Quero ler",
    "status.reading": "Lendo",
    "status.completed_read": "Lido",
    "status.paused": "Pausado",
    "status.dropped": "Abandonado",

    // Perfil
    "profile.language": "Idioma da interface e catálogo",
    "profile.lang_pt": "Português (Brasil)",
    "profile.lang_en": "English (US)",
    "profile.save": "Salvar perfil"
  },
  "en-US": {
    // Navigation
    "nav.catalog": "Catalog",
    "nav.feed": "Feed",
    "nav.forYou": "For you",
    "nav.moderation": "Moderation",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "nav.myProfile": "My profile",
    "nav.createProfile": "Create profile",

    // Catalog & Filters
    "catalog.searchPlaceholder": "Search movies, series, games and books",
    "catalog.noResults": "No results",
    "catalog.noResultsFor": "Nothing found for",
    "catalog.clearSearch": "Clear search",
    "catalog.all": "All",
    "catalog.movies": "Movies",
    "catalog.series": "Series",
    "catalog.games": "Games",
    "catalog.books": "Books",
    "catalog.anime": "Anime",
    "catalog.novelas": "Telenovelas",
    "catalog.doramas": "K-Dramas",

    // Tracking & Actions
    "tracking.saveChanges": "Save changes",
    "tracking.discard": "Discard",
    "tracking.saving": "Saving…",
    "tracking.unsavedChanges": "Unsaved changes",
    "tracking.notStarted": "Not started",
    "tracking.outOfTracking": "Not tracked",
    "tracking.remove": "Remove from tracking",
    "tracking.favorite": "★ Favorited",
    "tracking.addFavorite": "☆ Favorite",
    "tracking.share": "Share",
    "tracking.notes": "Your private notes",
    "tracking.notesPlaceholder": "What did you think? Where did you stop?",
    "tracking.rating": "Your rating",

    // Status
    "status.want_see": "Want to watch",
    "status.watching": "Watching",
    "status.completed_see": "Completed",
    "status.want_play": "Want to play",
    "status.playing": "Playing",
    "status.completed_play": "Completed",
    "status.want_read": "Want to read",
    "status.reading": "Reading",
    "status.completed_read": "Read",
    "status.paused": "Paused",
    "status.dropped": "Dropped",

    // Profile
    "profile.language": "Interface and catalog language",
    "profile.lang_pt": "Português (Brasil)",
    "profile.lang_en": "English (US)",
    "profile.save": "Save profile"
  }
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  language: "pt-BR",
  setLanguage: () => undefined,
  t: (key, fallback) => fallback ?? key
});

const STORAGE_KEY = "trak:language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "pt-BR";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "pt-BR" || stored === "en-US") return stored;
    return "pt-BR";
  });

  // Se o perfil do usuario logado tiver idioma definido, sincroniza
  useEffect(() => {
    if (profile?.language && (profile.language === "pt-BR" || profile.language === "en-US")) {
      const nextLang = profile.language;
      queueMicrotask(() => {
        setLanguageState(nextLang);
      });
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLang);
      } catch {
        // ignora
      }
    }
  }, [profile?.language]);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignora
    }
  }

  function t(key: string, fallback?: string): string {
    const dict = TRANSLATIONS[language] || TRANSLATIONS["pt-BR"];
    return dict[key] ?? fallback ?? key;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
