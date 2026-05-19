import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GameState } from "@eco-era/shared";

interface LegacySaveDatabase {
  guests?: Record<string, string[]>;
  saves?: Record<string, GameState>;
}

interface SaveRow {
  state_json: string;
}

interface CountRow {
  count: number;
}

const dataDir = process.env.ECO_ERA_DATA_DIR ?? join(process.cwd(), "data");
const sqlitePath = join(dataDir, "saves.sqlite");
const legacyJsonPath = join(dataDir, "saves.json");

let cachedDb: DatabaseSync | undefined;

function getDb() {
  if (cachedDb) return cachedDb;

  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new DatabaseSync(sqlitePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guest_saves (
      guest_key TEXT NOT NULL,
      save_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guest_key, save_id),
      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
    );
  `);

  migrateLegacyJsonIfNeeded(db);
  cachedDb = db;
  return db;
}

function migrateLegacyJsonIfNeeded(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM saves").get() as unknown as CountRow;
  if (row.count > 0 || !existsSync(legacyJsonPath)) return;

  let inTransaction = false;
  try {
    const legacy = JSON.parse(readFileSync(legacyJsonPath, "utf8")) as LegacySaveDatabase;
    const saves = legacy.saves ?? {};
    const guests = legacy.guests ?? {};
    const now = new Date().toISOString();

    db.exec("BEGIN");
    inTransaction = true;
    const saveStmt = db.prepare("INSERT OR REPLACE INTO saves (id, state_json, updated_at) VALUES (?, ?, ?)");
    const guestStmt = db.prepare("INSERT OR IGNORE INTO guest_saves (guest_key, save_id) VALUES (?, ?)");

    for (const [id, save] of Object.entries(saves)) {
      saveStmt.run(id, JSON.stringify(save), save.updatedAt ?? now);
    }

    for (const [guestKey, saveIds] of Object.entries(guests)) {
      for (const saveId of saveIds) {
        if (saves[saveId]) {
          guestStmt.run(guestKey, saveId);
        }
      }
    }
    db.exec("COMMIT");
    inTransaction = false;
  } catch (error) {
    if (inTransaction) {
      db.exec("ROLLBACK");
    }
    console.warn("Skipped legacy saves.json migration:", error);
  }
}

function parseSave(row: SaveRow | undefined) {
  return row ? (JSON.parse(row.state_json) as GameState) : undefined;
}

export async function listSaves(guestKey: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT saves.state_json
      FROM guest_saves
      JOIN saves ON saves.id = guest_saves.save_id
      WHERE guest_saves.guest_key = ?
      ORDER BY saves.updated_at DESC
      `
    )
    .all(guestKey) as unknown as SaveRow[];

  return rows.map((row) => JSON.parse(row.state_json) as GameState);
}

export async function getSave(guestKey: string, saveId: string) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT saves.state_json
      FROM guest_saves
      JOIN saves ON saves.id = guest_saves.save_id
      WHERE guest_saves.guest_key = ? AND guest_saves.save_id = ?
      `
    )
    .get(guestKey, saveId) as unknown as SaveRow | undefined;

  return parseSave(row);
}

export async function putSave(guestKey: string, save: GameState) {
  const db = getDb();
  const updatedAt = save.updatedAt ?? new Date().toISOString();
  db.prepare("INSERT OR REPLACE INTO saves (id, state_json, updated_at) VALUES (?, ?, ?)").run(
    save.id,
    JSON.stringify(save),
    updatedAt
  );
  db.prepare("INSERT OR IGNORE INTO guest_saves (guest_key, save_id) VALUES (?, ?)").run(guestKey, save.id);
  return save;
}
