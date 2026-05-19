import type { GameState } from "@eco-era/shared";
export declare function listSaves(guestKey: string): Promise<GameState[]>;
export declare function getSave(guestKey: string, saveId: string): Promise<GameState | undefined>;
export declare function putSave(guestKey: string, save: GameState): Promise<GameState>;
//# sourceMappingURL=repository.d.ts.map