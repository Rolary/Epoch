import { describe, expect, it } from "vitest";
import { createInitialState } from "@eco-era/game-core";
import { countEarlyRoles } from "../src/components/hud/objectiveProgress.js";

describe("current objective progress", () => {
  it("keeps witnessed ecology roles in the mainline progress after species status changes", () => {
    const save = createInitialState("objective-progress", "进度测试潮池");
    save.chapterWitness = {
      ...save.chapterWitness,
      ecologyBurst: {
        ...save.chapterWitness!.ecologyBurst,
        rolesWitnessed: ["producer", "decomposer"],
      },
    };

    expect(countEarlyRoles(save)).toBe(2);
  });

  it("derives ecology role progress from unlocked evolution nodes for migrated saves", () => {
    const save = createInitialState("objective-migration", "迁移测试潮池");
    save.unlockedNodes.push("early_producer_film", "decomposition_layer", "tidal_filter_pores");

    expect(countEarlyRoles(save)).toBe(3);
  });
});
