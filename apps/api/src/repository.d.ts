import type { GameState } from "@eco-era/shared";
export declare const schemaSql = "\n  CREATE TABLE IF NOT EXISTS saves (\n    id TEXT PRIMARY KEY,\n    state_json JSONB NOT NULL,\n    updated_at TIMESTAMPTZ NOT NULL\n  );\n\n  CREATE TABLE IF NOT EXISTS guest_saves (\n    guest_key TEXT NOT NULL,\n    save_id TEXT NOT NULL,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n    PRIMARY KEY (guest_key, save_id),\n    FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE\n  );\n\n  CREATE INDEX IF NOT EXISTS guest_saves_save_id_idx ON guest_saves(save_id);\n  CREATE INDEX IF NOT EXISTS saves_updated_at_idx ON saves(updated_at DESC);\n";
export declare function getDatabaseUrl(): string;
export declare function listSaves(guestKey: string): Promise<GameState[]>;
export declare function getSave(guestKey: string, saveId: string): Promise<GameState | undefined>;
export declare function putSave(guestKey: string, save: GameState): Promise<GameState>;
export declare function closeRepository(): Promise<void>;
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=repository.d.ts.map