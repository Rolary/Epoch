const apiBase = process.env.API_BASE ?? "http://127.0.0.1:8787/api";
const webBase = process.env.WEB_BASE ?? "http://127.0.0.1:5174";
const requestedStage = process.env.CHAPTER3_STAGE;
const persistDebugSave = process.env.CHAPTER3_PERSIST === "true";
const stages = requestedStage ? [requestedStage] : ["exposed", "shore", "niches", "event", "exchange"];

const expected = {
  exposed: { stage: "attach_shore", shore: false, niches: false, pressure: false, exchange: false, event: false },
  shore: { stage: "split_niches", shore: true, niches: false, pressure: false, exchange: false, event: false },
  niches: { stage: "endure_dry_wet", shore: true, niches: true, pressure: false, exchange: false, event: false },
  event: { stage: "endure_dry_wet", shore: true, niches: true, pressure: false, exchange: false, event: true },
  exchange: { stage: "shoreline_memory", shore: true, niches: true, pressure: true, exchange: true, event: false },
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
  const { save } = await request(`/debug/third-chapter-save?persist=${persistDebugSave}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-guest-key": guestKey },
    body: JSON.stringify({ stage }),
  });
  const witness = save.chapterWitness?.shorelineDifferentiation;
  if (save.chapterProgress?.chapter !== "shoreline_differentiation") {
    throw new Error(`${stage}: expected shoreline_differentiation, got ${save.chapterProgress?.chapter}`);
  }
  if (save.chapterProgress?.stage !== contract.stage) {
    throw new Error(`${stage}: expected ${contract.stage}, got ${save.chapterProgress?.stage}`);
  }
  if (!witness?.waterlineExposed) throw new Error(`${stage}: waterline was not exposed`);
  if (Boolean(witness.shoreColonized) !== contract.shore) throw new Error(`${stage}: shore witness mismatch`);
  if (Boolean(save.historyTags?.includes("niche_split")) !== contract.niches) throw new Error(`${stage}: niche split mismatch`);
  if (Boolean(witness.dryWetPressureWitnessed) !== contract.pressure) throw new Error(`${stage}: pressure witness mismatch`);
  if (Boolean(witness.shorelineExchangeWitnessed) !== contract.exchange) throw new Error(`${stage}: exchange witness mismatch`);
  if (Boolean(save.pendingEcologyEvent?.id === "ebb_dryness") !== contract.event) throw new Error(`${stage}: pending event mismatch`);
  results.push({ stage, saveId: save.id, chapterStage: save.chapterProgress.stage });
}

const web = await fetch(webBase);
if (!web.ok) throw new Error(`Web root failed: ${web.status}`);
const html = await web.text();
if (!html.includes("root")) throw new Error("Web root did not look like the app shell");

console.log(JSON.stringify({ ok: true, stages: results, webStatus: web.status }, null, 2));
