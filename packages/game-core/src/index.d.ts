import type { EvolutionLog, EvolutionNode, GameState, PlanetProfile, Resources, SpeciesRecord, Talent } from "@eco-era/shared";
export declare const evolutionNodes: EvolutionNode[];
export declare const talentCatalog: Talent[];
export declare function createInitialState(id: string, name?: string, initialTalentId?: string): GameState;
export declare function calculateResourceDelta(state: GameState, elapsedSeconds: number): Resources;
export declare function advanceState(input: GameState, now?: Date): GameState;
export declare function applyEnvironmentAction(input: GameState, action: string): GameState;
export declare function unlockEvolutionNode(input: GameState, nodeId: string): GameState;
export declare function selectTalent(input: GameState, talentId: string): GameState;
export declare function rollTalentChoices(state?: GameState, count?: number): Talent[];
export declare function normalizeGameState(state: GameState): GameState;
export declare function canUnlockEvolutionNode(state: GameState, nodeId: string): boolean;
export declare function calculatePlanetProfile(state: GameState): PlanetProfile;
export declare function generateSpeciesTemplate(state: GameState): SpeciesRecord;
export declare function createLog(type: EvolutionLog["type"], message: string): EvolutionLog;
//# sourceMappingURL=index.d.ts.map