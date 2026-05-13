import type { GameState } from "@eco-era/shared";
interface SaveDatabase {
    guests: Record<string, string[]>;
    saves: Record<string, GameState>;
}
export declare function loadDb(): Promise<SaveDatabase>;
export declare function saveDb(db: SaveDatabase): Promise<void>;
export declare function listSaves(guestKey: string): Promise<GameState[]>;
export declare function getSave(guestKey: string, saveId: string): Promise<GameState | undefined>;
export declare function putSave(guestKey: string, save: GameState): Promise<GameState>;
export {};
//# sourceMappingURL=repository.d.ts.map