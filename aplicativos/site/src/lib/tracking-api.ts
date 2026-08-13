const defaultBaseUrl = "http://localhost:3001/api";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl;
}

async function requestTracking<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("trak_token") : null;
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function saveTrackingItem(mediaItemId: string, payload: { status?: string; progress?: number; favorite?: boolean }) {
  return requestTracking<{ id: string; mediaItemId: string; status: string; progress: number; favorite: boolean }>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getTrackingItems() {
  return requestTracking<Array<{ id: string; mediaItemId: string; status: string; progress: number; favorite: boolean }>>("/tracking");
}
