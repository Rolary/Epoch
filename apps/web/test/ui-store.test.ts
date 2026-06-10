import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe("narrative queue", () => {
  it("presents ecology events before milestones and chapter completion last", async () => {
    const { useUIStore } = await import("../src/stores/uiStore.js");
    const store = useUIStore.getState();

    store.enqueueNarrative({ id: "complete", type: "system-unlock", priority: 5 });
    store.enqueueNarrative({ id: "milestone", type: "system-unlock", priority: 60 });
    store.enqueueNarrative({ id: "event", type: "ecology-event", priority: 100 });

    useUIStore.getState().activateNextNarrative();
    expect(useUIStore.getState().activeNarrative?.id).toBe("event");
    useUIStore.getState().completeNarrative("event");

    useUIStore.getState().activateNextNarrative();
    expect(useUIStore.getState().activeNarrative?.id).toBe("milestone");
    useUIStore.getState().completeNarrative("milestone");

    useUIStore.getState().activateNextNarrative();
    expect(useUIStore.getState().activeNarrative?.id).toBe("complete");
  });

  it("marks a milestone seen only after its active prompt is completed", async () => {
    const { useUIStore } = await import("../src/stores/uiStore.js");
    useUIStore.getState().enqueueNarrative({
      id: "cycle",
      type: "system-unlock",
      priority: 60,
      seenHintId: "ecology-witness-cycle",
    });

    expect(useUIStore.getState().seenUnlockHints).not.toContain("ecology-witness-cycle");
    useUIStore.getState().activateNextNarrative();
    expect(useUIStore.getState().seenUnlockHints).not.toContain("ecology-witness-cycle");

    useUIStore.getState().completeNarrative("cycle");
    expect(useUIStore.getState().seenUnlockHints).toContain("ecology-witness-cycle");
  });

  it("keeps an unresolved required choice active when its modal is hidden", async () => {
    const { useUIStore } = await import("../src/stores/uiStore.js");
    useUIStore.getState().enqueueNarrative({
      id: "talent-awakening:save:one,two,three",
      type: "talent-awakening",
      priority: 68,
    });
    useUIStore.getState().enqueueNarrative({
      id: "later-milestone",
      type: "system-unlock",
      priority: 60,
    });

    useUIStore.getState().activateNextNarrative();
    useUIStore.getState().showModal("talent-awakening");
    useUIStore.getState().hideModal();
    useUIStore.getState().activateNextNarrative();

    expect(useUIStore.getState().activeNarrative?.id).toBe("talent-awakening:save:one,two,three");
    expect(useUIStore.getState().narrativeQueue.map((item) => item.id)).toContain("later-milestone");
  });
});
