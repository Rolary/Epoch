const API_BASE = "/api";

let guestKey = localStorage.getItem("eco-era-guest-key");

export function getGuestKey(): string {
  if (!guestKey) {
    guestKey = localStorage.getItem("eco-era-guest-key") ?? "";
  }
  return guestKey;
}

export function setGuestKey(key: string): void {
  guestKey = key;
  localStorage.setItem("eco-era-guest-key", key);
}

export function getSaveId(): string {
  return localStorage.getItem("eco-era-save-id") ?? "";
}

export function setSaveId(id: string): void {
  localStorage.setItem("eco-era-save-id", id);
}

export function clearLocalStorage(): void {
  guestKey = "";
  localStorage.removeItem("eco-era-guest-key");
  localStorage.removeItem("eco-era-save-id");
  localStorage.removeItem("eco-era-guide-done");
  localStorage.removeItem("eco-era-seen-unlock-hints");
  localStorage.removeItem("eco-era-objective-details-open");
  localStorage.removeItem("eco-era-objective-minimized");
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const gk = getGuestKey();
  if (gk) {
    headers["x-guest-key"] = gk;
  }
  if (options.body) {
    headers["content-type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...((options.headers as Record<string, string>) ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "网络请求失败" }));
    throw new Error(err.message ?? "请求失败");
  }
  return res.json() as Promise<T>;
}

export async function authGuest(): Promise<string> {
  const data = await fetchJson<{ guestKey: string }>("/auth/guest", { method: "POST" });
  setGuestKey(data.guestKey);
  return data.guestKey;
}

export async function ensureGuest(): Promise<string> {
  if (getGuestKey()) return getGuestKey();
  return authGuest();
}

export async function createSave(name: string, talentId?: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>("/saves", {
    method: "POST",
    body: JSON.stringify({ name, talentId }),
  });
  setSaveId(data.save.id);
  return data.save;
}

export async function listSaves(guestKeyOverride?: string) {
  const headers = guestKeyOverride ? { "x-guest-key": guestKeyOverride } : undefined;
  const data = await fetchJson<{ saves: import("@eco-era/shared").GameState[] }>("/saves", { headers });
  return data.saves;
}

export async function restoreGuestKey(key: string) {
  const restoredKey = key.trim();
  if (!restoredKey) {
    throw new Error("请输入旧游客印记");
  }

  const saves = await listSaves(restoredKey);
  const save = saves[0];
  if (!save) {
    throw new Error("没有找到这个印记下的生态档案");
  }

  setGuestKey(restoredKey);
  setSaveId(save.id);
  return save;
}

export async function getSave(saveId: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}`,
  );
  return data.save;
}

export async function tickSave(saveId: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}/tick`,
    { method: "POST" },
  );
  return data.save;
}

export async function applyAction(saveId: string, action: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}/actions/environment`,
    { method: "POST", body: JSON.stringify({ action }) },
  );
  return data.save;
}

export async function unlockNode(saveId: string, nodeId: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}/evolution/unlock`,
    { method: "POST", body: JSON.stringify({ nodeId }) },
  );
  return data.save;
}

export async function selectTalentApi(saveId: string, talentId: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}/talents/select`,
    { method: "POST", body: JSON.stringify({ talentId }) },
  );
  return data.save;
}

export async function chooseEcologyEvent(saveId: string, eventId: string, optionId: string) {
  const data = await fetchJson<{ save: import("@eco-era/shared").GameState }>(
    `/saves/${saveId}/events/choose`,
    { method: "POST", body: JSON.stringify({ eventId, optionId }) },
  );
  return data.save;
}

export async function getSpecies(saveId: string) {
  const data = await fetchJson<{ species: import("@eco-era/shared").SpeciesRecord[] }>(
    `/saves/${saveId}/species`,
  );
  return data.species;
}

export async function getLogs(saveId: string) {
  const data = await fetchJson<{ logs: import("@eco-era/shared").EvolutionLog[] }>(
    `/saves/${saveId}/logs`,
  );
  return data.logs;
}

export async function getEvolutionNodes() {
  const data = await fetchJson<{ nodes: import("@eco-era/shared").EvolutionNode[] }>(
    "/meta/evolution-nodes",
  );
  return data.nodes;
}

export async function getTalentChoices() {
  const data = await fetchJson<{ choices: import("@eco-era/shared").Talent[] }>(
    "/meta/talent-choices",
  );
  return data.choices;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
