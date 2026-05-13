import Fastify from "fastify";
import {
  advanceState,
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
import { getSave, listSaves, putSave } from "./repository.js";

const server = Fastify({ logger: true });

server.addHook("onRequest", async (request, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "content-type,x-guest-key");
  if (request.method === "OPTIONS") {
    return reply.send();
  }
});

server.get("/health", async () => ({ ok: true }));

server.post("/auth/guest", async () => ({
  guestKey: `guest_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}));

server.get("/meta/evolution-nodes", async () => ({ nodes: evolutionNodes }));
server.get("/meta/talents", async () => ({ talents: talentCatalog }));
server.get("/meta/talent-choices", async () => ({ choices: rollTalentChoices(undefined, 3) }));

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
  const save = createInitialState(`save_${Math.random().toString(36).slice(2, 10)}`, name.slice(0, 16), body.talentId);
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

function requireGuestKey(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const port = Number(process.env.PORT ?? 8787);
server.listen({ port, host: "127.0.0.1" }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});
