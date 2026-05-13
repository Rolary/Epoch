import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GameState } from "@eco-era/shared";

interface SaveDatabase {
  guests: Record<string, string[]>;
  saves: Record<string, GameState>;
}

const dbPath = join(process.cwd(), "data", "saves.json");

const emptyDb = (): SaveDatabase => ({
  guests: {},
  saves: {}
});

export async function loadDb(): Promise<SaveDatabase> {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw) as SaveDatabase;
  } catch {
    return emptyDb();
  }
}

export async function saveDb(db: SaveDatabase) {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export async function listSaves(guestKey: string) {
  const db = await loadDb();
  return (db.guests[guestKey] ?? []).map((id) => db.saves[id]).filter(Boolean);
}

export async function getSave(guestKey: string, saveId: string) {
  const db = await loadDb();
  if (!(db.guests[guestKey] ?? []).includes(saveId)) {
    return undefined;
  }
  return db.saves[saveId];
}

export async function putSave(guestKey: string, save: GameState) {
  const db = await loadDb();
  db.guests[guestKey] = db.guests[guestKey] ?? [];
  if (!db.guests[guestKey].includes(save.id)) {
    db.guests[guestKey].push(save.id);
  }
  db.saves[save.id] = save;
  await saveDb(db);
  return save;
}
