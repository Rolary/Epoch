import { Pool, type PoolConfig } from "pg";
import type { GameState } from "@eco-era/shared";

const DEV_DATABASE_URL = "postgres://admin:123456@localhost:5432/epoch";

interface SaveRow {
  state_json: GameState | string;
}

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export const schemaSql = `
  CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY,
    state_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guest_saves (
    guest_key TEXT NOT NULL,
    save_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (guest_key, save_id),
    FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS guest_saves_save_id_idx ON guest_saves(save_id);
  CREATE INDEX IF NOT EXISTS saves_updated_at_idx ON saves(updated_at DESC);
`;

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== "production") return DEV_DATABASE_URL;

  throw new Error("DATABASE_URL is required for PostgreSQL saves storage in production.");
}

function getPool() {
  if (pool) return pool;
  const config: PoolConfig = {
    connectionString: getDatabaseUrl(),
    max: Number(process.env.PG_POOL_MAX ?? 10),
  };

  const ssl = getDatabaseSslConfig();
  if (ssl) config.ssl = ssl;

  pool = new Pool(config);
  return pool;
}

function getDatabaseSslConfig(): PoolConfig["ssl"] {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };
  if (process.env.NODE_ENV === "production") return { rejectUnauthorized: false };
  return undefined;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = getPool()
    .query(schemaSql)
    .then(() => undefined)
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });

  return schemaReady;
}

function parseSave(row: SaveRow | undefined) {
  if (!row) return undefined;
  return typeof row.state_json === "string" ? (JSON.parse(row.state_json) as GameState) : row.state_json;
}

export async function listSaves(guestKey: string) {
  await ensureSchema();
  const result = await getPool().query<SaveRow>(
    `
    SELECT saves.state_json
    FROM guest_saves
    JOIN saves ON saves.id = guest_saves.save_id
    WHERE guest_saves.guest_key = $1
    ORDER BY saves.updated_at DESC
    `,
    [guestKey]
  );

  return result.rows.map((row) => parseSave(row)).filter((save): save is GameState => Boolean(save));
}

export async function getSave(guestKey: string, saveId: string) {
  await ensureSchema();
  const result = await getPool().query<SaveRow>(
    `
    SELECT saves.state_json
    FROM guest_saves
    JOIN saves ON saves.id = guest_saves.save_id
    WHERE guest_saves.guest_key = $1 AND guest_saves.save_id = $2
    `,
    [guestKey, saveId]
  );

  return parseSave(result.rows[0]);
}

export async function putSave(guestKey: string, save: GameState) {
  await ensureSchema();
  const updatedAt = save.updatedAt ?? new Date().toISOString();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
      INSERT INTO saves (id, state_json, updated_at)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (id) DO UPDATE
      SET state_json = EXCLUDED.state_json,
          updated_at = EXCLUDED.updated_at
      `,
      [save.id, JSON.stringify(save), updatedAt]
    );
    await client.query(
      `
      INSERT INTO guest_saves (guest_key, save_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [guestKey, save.id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return save;
}

export async function closeRepository() {
  await pool?.end();
  pool = undefined;
  schemaReady = undefined;
}

export async function initializeDatabase() {
  await ensureSchema();
}
