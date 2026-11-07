import { TRACKING_PAGES_MAX } from "../../lib/api";

export type CheckpointMeta = {
  hoursPlayed?: number;
  platform?: string;
  platinum?: boolean;
  currentPage?: number;
  totalPages?: number;
};

export const GAME_PLATFORMS = [
  "PC / Steam",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "Portátil / Mobile"
];

export const PAGE_INPUT_MAX_DIGITS = 5;

export function parsePageInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : Math.min(TRACKING_PAGES_MAX, Math.max(0, parsed));
}

export const checkpointStorageKey = (mediaItemId: string) => `trak:checkpoint:${mediaItemId}`;

export function carregarCheckpoint(mediaItemId: string, totalPagesPadrao?: number | null): CheckpointMeta {
  const defaults: CheckpointMeta = {
    hoursPlayed: 0,
    platform: "PC / Steam",
    platinum: false,
    currentPage: 0,
    totalPages: totalPagesPadrao ?? 320
  };
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(checkpointStorageKey(mediaItemId));
    return raw ? { ...defaults, ...(JSON.parse(raw) as CheckpointMeta) } : defaults;
  } catch {
    return defaults;
  }
}

export function salvarCheckpoint(mediaItemId: string, meta: CheckpointMeta): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(checkpointStorageKey(mediaItemId), JSON.stringify(meta));
  } catch {
    // ignora em caso de modo privado ou cota de armazenamento cheia
  }
}

export const lerCheckpoint = carregarCheckpoint;
export const gravarCheckpoint = salvarCheckpoint;
