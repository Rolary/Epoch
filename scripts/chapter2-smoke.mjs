const apiBase = process.env.API_BASE ?? "http://127.0.0.1:8787/api";
const webBase = process.env.WEB_BASE ?? "http://127.0.0.1:5174";
const stage = process.env.CHAPTER2_STAGE ?? "complete";

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${data.message ?? text}`);
  }
  return data;
}

const { guestKey } = await request("/auth/guest", { method: "POST" });
const headers = {
  "content-type": "application/json",
  "x-guest-key": guestKey,
};

const { save } = await request("/debug/second-chapter-save", {
  method: "POST",
  headers,
  body: JSON.stringify({ stage }),
});

if (save.chapterProgress?.chapter !== "ecology_burst") {
  throw new Error(`Expected ecology_burst chapter, got ${save.chapterProgress?.chapter}`);
}
if (stage === "complete" && save.chapterProgress?.stage !== "complete") {
  throw new Error(`Expected complete stage, got ${save.chapterProgress?.stage}`);
}

const web = await fetch(webBase);
if (!web.ok) throw new Error(`Web root failed: ${web.status}`);
const html = await web.text();
if (!html.includes("root")) throw new Error("Web root did not look like the app shell");

console.log(JSON.stringify({
  ok: true,
  saveId: save.id,
  chapter: save.chapterProgress.chapter,
  stage: save.chapterProgress.stage,
  species: save.species.length,
  webStatus: web.status,
}, null, 2));
