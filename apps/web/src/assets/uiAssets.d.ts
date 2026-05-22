export declare function loadUiAssetUrlMap(): Promise<void>;
export declare const uiAssets: {
    readonly backgrounds: {
        readonly tidepoolBoard: string;
        readonly homeTidepool: string;
    };
    readonly scene: {
        readonly poolCenterpiece: string;
    };
    readonly resources: {
        readonly organic: string;
        readonly energy: string;
        readonly minerals: string;
        readonly stability: string;
        readonly mutation: string;
        readonly biomass: string;
    };
    readonly pickups: {
        readonly crystal: string;
        readonly spark: string;
        readonly droplet: string;
        readonly pulse: string;
    };
    readonly cards: {
        readonly crystal: string;
        readonly energy: string;
        readonly tide: string;
    };
    readonly emblems: {
        readonly discovery: string;
        readonly system: string;
        readonly reward: string;
    };
    readonly species: {
        readonly producer: string;
        readonly decomposer: string;
        readonly symbiont: string;
        readonly extremophile: string;
        readonly filterer: string;
        readonly catalyst: string;
    };
    readonly events: {
        readonly hotSpring: string;
        readonly clearTide: string;
    };
    readonly evolution: {
        readonly organicRichness: string;
        readonly replicatingChain: string;
        readonly primitiveVesicle: string;
        readonly metabolicLoop: string;
        readonly protoCell: string;
        readonly photoPigment: string;
    };
};
export type UIAssetKey = keyof typeof uiAssets;
//# sourceMappingURL=uiAssets.d.ts.map