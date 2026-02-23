import type { LifeOS } from "./types";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  syncPull: () =>
    apiFetch<Omit<LifeOS, "pools">>("/api/sync"),

  syncPush: (data: LifeOS) =>
    apiFetch<{ ok: boolean }>("/api/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
