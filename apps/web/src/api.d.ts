export declare function getGuestKey(): string;
export declare function setGuestKey(key: string): void;
export declare function getSaveId(): string;
export declare function setSaveId(id: string): void;
export declare function clearLocalStorage(): void;
export declare function authGuest(): Promise<string>;
export declare function ensureGuest(): Promise<string>;
export declare function createSave(name: string, talentId?: string): Promise<import("@eco-era/shared").GameState>;
export declare function getSave(saveId: string): Promise<import("@eco-era/shared").GameState>;
export declare function tickSave(saveId: string): Promise<import("@eco-era/shared").GameState>;
export declare function applyAction(saveId: string, action: string): Promise<import("@eco-era/shared").GameState>;
export declare function unlockNode(saveId: string, nodeId: string): Promise<import("@eco-era/shared").GameState>;
export declare function selectTalentApi(saveId: string, talentId: string): Promise<import("@eco-era/shared").GameState>;
export declare function getSpecies(saveId: string): Promise<import("@eco-era/shared").SpeciesRecord[]>;
export declare function getLogs(saveId: string): Promise<import("@eco-era/shared").EvolutionLog[]>;
export declare function getEvolutionNodes(): Promise<import("@eco-era/shared").EvolutionNode[]>;
export declare function getTalentChoices(): Promise<import("@eco-era/shared").Talent[]>;
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=api.d.ts.map