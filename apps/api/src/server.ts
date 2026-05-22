import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import type { FastifyReply } from "fastify";
import Fastify from "fastify";
import {
  advanceState,
  applyEcologyEventChoice,
  applyEnvironmentAction,
  canUnlockEvolutionNode,
  createInitialState,
  evolutionNodes,
  normalizeGameState,
  rollTalentChoices,
  selectTalent,
  talentCatalog,
  unlockEvolutionNode
} from "@eco-era/game-core";
import { closeRepository, getSave, listSaves, listUiAssetUrls, putSave } from "./repository.js";

const publicRoot = resolve(process.cwd(), "apps/web/dist");
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 32 * 1024,
  rewriteUrl: (request) => {
    const url = request.url ?? "/";
    if (url === "/api") return "/";
    if (url.startsWith("/api/")) return url.slice(4);
    return url;
  },
});

server.addHook("onRequest", async (request, reply) => {
  const origin = request.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.length === 0))) {
    reply.header("Access-Control-Allow-Origin", allowedOrigins.length === 0 ? "*" : origin);
  }
  reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "content-type,x-guest-key");
  if (request.method === "OPTIONS") {
    return reply.send();
  }
  if (!consumeRateLimit(request.ip, request.method, request.url)) {
    reply.header("Retry-After", "60");
    return reply.code(429).send({ message: "请求太频繁，请稍后再试" });
  }
});

server.get("/health", async () => ({ ok: true }));

server.post("/auth/guest", async () => ({
  guestKey: createGuestKey()
}));

server.get("/meta/evolution-nodes", async () => ({ nodes: evolutionNodes }));
server.get("/meta/talents", async () => ({ talents: talentCatalog }));
server.get("/meta/talent-choices", async () => ({ choices: rollTalentChoices(undefined, 3) }));
server.get("/meta/ui-assets", async () => ({ assets: await listUiAssetUrls() }));

server.get("/saves", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  return { saves: await listSaves(guestKey) };
});

server.post("/saves", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const body = (request.body ?? {}) as { name?: string; talentId?: string };
  const name = body.name?.trim() || "未命名生态";
  const save = createInitialState(createSaveId(), name.slice(0, 16), body.talentId);
  await putSave(guestKey, save);
  return { save };
});

server.get("/saves/:saveId", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const save = await getSave(guestKey, saveId);
  if (!save) return reply.code(404).send({ message: "存档不存在" });
  const advanced = advanceState(normalizeGameState(save));
  await putSave(guestKey, advanced);
  return { save: advanced };
});

server.post("/saves/:saveId/tick", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const save = await getSave(guestKey, saveId);
  if (!save) return reply.code(404).send({ message: "存档不存在" });
  const advanced = advanceState(normalizeGameState(save));
  await putSave(guestKey, advanced);
  return { save: advanced };
});

server.post("/saves/:saveId/actions/environment", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const { action } = request.body as { action?: string };
  const save = await getSave(guestKey, saveId);
  if (!save) return reply.code(404).send({ message: "存档不存在" });

  try {
    const advanced = advanceState(normalizeGameState(save));
    const next = applyEnvironmentAction(advanced, action ?? "");
    await putSave(guestKey, next);
    return { save: next };
  } catch (error) {
    return reply.code(400).send({ message: error instanceof Error ? error.message : "操作失败" });
  }
});

server.post("/saves/:saveId/evolution/unlock", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const { nodeId } = request.body as { nodeId?: string };
  const save = await getSave(guestKey, saveId);
  if (!save || !nodeId) return reply.code(404).send({ message: "存档或节点不存在" });
  const advanced = advanceState(normalizeGameState(save));
  if (!canUnlockEvolutionNode(advanced, nodeId)) {
    return reply.code(400).send({ message: "演化条件尚未满足" });
  }
  const next = unlockEvolutionNode(advanced, nodeId);
  await putSave(guestKey, next);
  return { save: next };
});

server.post("/saves/:saveId/events/choose", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const { eventId, optionId } = request.body as { eventId?: string; optionId?: string };
  const save = await getSave(guestKey, saveId);
  if (!save || !eventId || !optionId) return reply.code(404).send({ message: "存档或潮池事件不存在" });
  try {
    const advanced = advanceState(normalizeGameState(save));
    const next = applyEcologyEventChoice(advanced, eventId, optionId);
    await putSave(guestKey, next);
    return { save: next };
  } catch (error) {
    return reply.code(400).send({ message: error instanceof Error ? error.message : "选择失败" });
  }
});

server.post("/saves/:saveId/talents/select", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const { talentId } = request.body as { talentId?: string };
  const save = await getSave(guestKey, saveId);
  if (!save || !talentId) return reply.code(404).send({ message: "存档或源质印记不存在" });
  try {
    const next = selectTalent(normalizeGameState(save), talentId);
    await putSave(guestKey, next);
    return { save: next };
  } catch (error) {
    return reply.code(400).send({ message: error instanceof Error ? error.message : "选择失败" });
  }
});

server.get("/saves/:saveId/species", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const save = await getSave(guestKey, saveId);
  if (!save) return reply.code(404).send({ message: "存档不存在" });
  return { species: normalizeGameState(save).species };
});

server.get("/saves/:saveId/logs", async (request, reply) => {
  const guestKey = requireGuestKey(request.headers["x-guest-key"]);
  if (!guestKey) return reply.code(401).send({ message: "缺少游客身份" });
  const { saveId } = request.params as { saveId: string };
  const save = await getSave(guestKey, saveId);
  if (!save) return reply.code(404).send({ message: "存档不存在" });
  return { logs: normalizeGameState(save).logs };
});

server.get("/", async (_request, reply) => sendPublicFile(reply, "index.html", "html"));
server.get("/index.html", async (_request, reply) => sendPublicFile(reply, "index.html", "html"));
server.get("/assets/*", async (request, reply) => {
  const requestedPath = decodeURIComponent(request.url.split("?")[0]?.slice(1) ?? "");
  return sendPublicFile(reply, requestedPath, "asset");
});

function requireGuestKey(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createGuestKey() {
  return `guest_${randomBytes(32).toString("base64url")}`;
}

function createSaveId() {
  return `save_${randomBytes(12).toString("base64url")}`;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

interface RateRule {
  id: string;
  limit: number;
  methods?: string[];
  pattern: RegExp;
  windowMs: number;
}

const rateRules: RateRule[] = [
  { id: "auth", methods: ["POST"], pattern: /^\/auth\/guest$/, limit: 12, windowMs: 60_000 },
  { id: "create-save", methods: ["POST"], pattern: /^\/saves$/, limit: 20, windowMs: 60_000 },
  { id: "tick", methods: ["POST"], pattern: /^\/saves\/[^/]+\/tick$/, limit: 90, windowMs: 60_000 },
  { id: "write-save", methods: ["POST"], pattern: /^\/saves\/[^/]+\//, limit: 120, windowMs: 60_000 },
  { id: "api", pattern: /^\/(auth|meta|saves)(\/|$)/, limit: 360, windowMs: 60_000 },
];

const rateBuckets = new Map<string, RateBucket>();

function consumeRateLimit(ip: string, method: string, url: string) {
  const pathname = normalizeApiPath(url);
  const rule = rateRules.find(
    (candidate) => (!candidate.methods || candidate.methods.includes(method)) && candidate.pattern.test(pathname),
  );
  if (!rule) return true;

  const now = Date.now();
  const key = `${ip}:${rule.id}`;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    pruneRateBuckets(now);
    return true;
  }
  bucket.count += 1;
  return bucket.count <= rule.limit;
}

function normalizeApiPath(url: string) {
  const pathname = url.split("?")[0] || "/";
  if (pathname === "/api") return "/";
  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}

function pruneRateBuckets(now: number) {
  if (rateBuckets.size < 1000) return;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}

function sendPublicFile(reply: FastifyReply, requestedPath: string, cacheKind: "asset" | "html") {
  const filePath = resolve(publicRoot, requestedPath);
  if (!filePath.startsWith(`${publicRoot}${sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return reply.code(404).send({ message: "Not found" });
  }
  const stat = statSync(filePath);
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  reply.header("Cache-Control", cacheKind === "asset" ? "public, max-age=31536000, immutable" : "no-cache");
  reply.header("ETag", etag);
  reply.header("Last-Modified", stat.mtime.toUTCString());
  reply.type(contentTypeFor(filePath));
  return reply.send(createReadStream(filePath));
}

function contentTypeFor(filePath: string) {
  const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return types[extname(filePath)] ?? "application/octet-stream";
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? (isProduction ? "0.0.0.0" : "127.0.0.1");
const maxListenAttempts = 10;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listenWithRetry(attempt = 1): Promise<void> {
  try {
    await server.listen({ port, host });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE" && attempt < maxListenAttempts) {
      server.log.warn({ port, attempt }, "Port is busy, retrying server listen");
      await delay(250 * attempt);
      return listenWithRetry(attempt + 1);
    }
    server.log.error(error);
    process.exit(1);
  }
}

async function shutdown() {
  try {
    await server.close();
    await closeRepository();
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

void listenWithRetry();
