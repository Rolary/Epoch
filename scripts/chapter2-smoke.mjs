const apiBase = process.env.API_BASE ?? "http://127.0.0.1:8787/api";
const webBase = process.env.WEB_BASE ?? "http://127.0.0.1:5174";
const requestedStage = process.env.CHAPTER2_STAGE;
const persistDebugSave = process.env.CHAPTER2_PERSIST === "true";
const stages = requestedStage
  ? [requestedStage]
  : ["light", "roles", "resonance", "cycle", "imbalance", "personality", "complete"];

const expected = {
  light: { stage: "pursue_light", roles: 0, resonance: false, cycle: false, imbalance: false, personality: false },
  roles: { stage: "form_cycle", roles: 2, resonance: false, cycle: false, imbalance: false, personality: false },
  resonance: { stage: "form_cycle", roles: 2, resonance: true, cycle: false, imbalance: false, personality: false },
  cycle: { stage: "face_imbalance", roles: 3, resonance: false, cycle: true, imbalance: false, personality: false },
  imbalance: { stage: "face_imbalance", roles: 3, resonance: false, cycle: true, imbalance: false, personality: false },
  personality: { stage: "ecological_personality", roles: 3, resonance: false, cycle: true, imbalance: true, personality: false },
  complete: { stage: "complete", roles: 3, resonance: false, cycle: true, imbalance: true, personality: true },
};

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${data.message ?? text}`);
  }
  return data;
}

const results = [];
for (const stage of stages) {
  const contract = expected[stage];
  if (!contract) throw new Error(`Unknown smoke stage: ${stage}`);

  const { guestKey } = await request("/auth/guest", { method: "POST" });
  const headers = {
    "content-type": "application/json",
    "x-guest-key": guestKey,
  };
  const { save } = await request(`/debug/second-chapter-save?persist=${persistDebugSave}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ stage }),
  });

  if (save.chapterProgress?.chapter !== "ecology_burst") {
    throw new Error(`${stage}: expected ecology_burst chapter, got ${save.chapterProgress?.chapter}`);
  }
  if (save.chapterProgress?.stage !== contract.stage) {
    throw new Error(`${stage}: expected ${contract.stage}, got ${save.chapterProgress?.stage}`);
  }

  const witness = save.chapterWitness?.ecologyBurst;
  if ((witness?.rolesWitnessed?.length ?? 0) < contract.roles) {
    throw new Error(`${stage}: expected at least ${contract.roles} witnessed roles`);
  }
  if (Boolean(witness?.firstResonanceWitnessed) !== contract.resonance) throw new Error(`${stage}: resonance witness mismatch`);
  if (Boolean(witness?.cycleWitnessed) !== contract.cycle) throw new Error(`${stage}: cycle witness mismatch`);
  if (Boolean(witness?.imbalanceWitnessed) !== contract.imbalance) throw new Error(`${stage}: imbalance witness mismatch`);
  if (Boolean(witness?.personalityWitnessed) !== contract.personality) throw new Error(`${stage}: personality witness mismatch`);
  if ((stage === "imbalance") !== Boolean(save.pendingEcologyEvent)) throw new Error(`${stage}: pending imbalance mismatch`);

  results.push({
    stage,
    saveId: save.id,
    chapterStage: save.chapterProgress.stage,
    species: save.species.length,
  });
}

const web = await fetch(webBase);
if (!web.ok) throw new Error(`Web root failed: ${web.status}`);
const html = await web.text();
if (!html.includes("root")) throw new Error("Web root did not look like the app shell");

console.log(JSON.stringify({
  ok: true,
  stages: results,
  webStatus: web.status,
}, null, 2));
