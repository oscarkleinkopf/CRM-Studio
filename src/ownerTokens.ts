const KEY = "crm-studio:owner-tokens";

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof token === "string" && token) out[id] = token;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function rememberOwnerToken(id: number, token: string): void {
  const map = readMap();
  map[String(id)] = token;
  writeMap(map);
}

export function getOwnerToken(id: number): string | undefined {
  return readMap()[String(id)];
}

export function forgetOwnerToken(id: number): void {
  const map = readMap();
  delete map[String(id)];
  writeMap(map);
}

export function allOwnerTokens(): string[] {
  return Object.values(readMap());
}
