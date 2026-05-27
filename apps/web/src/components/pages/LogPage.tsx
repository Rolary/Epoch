import type { EvolutionLog } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

type MemoryTone = "energy" | "mineral" | "tide" | "heat" | "species" | "legacy" | "era" | "talent" | "system";

interface MemoryEntry {
  id: string;
  tone: MemoryTone;
  asset: string;
  title: string;
  description: string;
  count: number;
  firstAt: string;
  lastAt: string;
}

const TONE_ASSETS: Record<MemoryTone, string> = {
  energy: uiAssets.resources.energy,
  mineral: uiAssets.resources.minerals,
  tide: uiAssets.resources.organic,
  heat: uiAssets.resources.mutation,
  species: uiAssets.emblems.discovery,
  legacy: uiAssets.emblems.reward,
  era: uiAssets.resources.mutation,
  talent: uiAssets.emblems.system,
  system: uiAssets.emblems.system,
};

export function LogPage() {
  const logs = useGameStore((s) => s.logs());
  const save = useGameStore((s) => s.save);
  const setPage = useUIStore((s) => s.setPage);
  const memories = buildMemoryEntries(logs);

  if (memories.length === 0) {
    return (
      <div className="page log-page memory-page">
        <h2 className="page-title">潮池记忆</h2>
        <p className="page-hint">生命史会把重复变化整理成可以读懂的片段。</p>
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.emblems.system} alt="" aria-hidden="true" />
          <p className="empty-title">潮池记忆尚未开始</p>
          <p className="empty-hint">
            若生命能留下第一道痕迹，这颗星球的故事就会有第一行。
          </p>
          <button className="btn-secondary" onClick={() => setPage("home")}>
            返回潮池
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page log-page memory-page">
      <h2 className="page-title">潮池记忆</h2>
      <p className="page-hint">重复的细小反应会被合并成一段记忆，重要变化会单独留下。</p>
      {save?.chapterProgress?.stage === "complete" && <ChapterTwoSummary save={save} />}
      <div className="memory-timeline">
        {memories.map((entry) => (
          <article key={entry.id} className={`memory-card memory-${entry.tone}`}>
            <div className="memory-icon-wrap">
              <img className="memory-icon" src={entry.asset} alt="" aria-hidden="true" />
            </div>
            <div className="memory-body">
              <div className="memory-head">
                <h3 className="memory-title">{entry.title}</h3>
                {entry.count > 1 && <span className="memory-count">x{entry.count}</span>}
              </div>
              <p className="memory-desc">{entry.description}</p>
              <span className="memory-time">{formatMemoryTime(entry.firstAt, entry.lastAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ChapterTwoSummary({ save }: { save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]> }) {
  const roles = Array.from(new Set(
    save.species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => roleLabel(item.ecologicalRole)),
  ));
  const imbalances = (save.eventHistory ?? [])
    .filter((id) => ["bloom_pressure", "murky_low_oxygen", "decomposer_layer_spread"].includes(id))
    .map(eventLabel);
  const resonances = (save.resonanceHistory ?? []).map(resonanceLabel);
  return (
    <section className="chapter-summary-card">
      <div className="chapter-summary-head">
        <img src={uiAssets.emblems.ecologyResonance} alt="" aria-hidden="true" />
        <div>
          <span className="chapter-summary-kicker">第二章总结</span>
          <h3>生态爆发篇完成</h3>
        </div>
      </div>
      <p>这片潮池已经形成自己的生态性格：{planetProfileLabel(save.planetProfile)}。</p>
      <div className="chapter-summary-grid">
        <span><strong>关键角色</strong>{roles.join(" / ") || "尚未记录"}</span>
        <span><strong>角色组合</strong>{resonances.at(-1) ?? "生产、分解、滤食接成小循环"}</span>
        <span><strong>经历失衡</strong>{imbalances.join(" / ") || "繁盛压力"}</span>
      </div>
    </section>
  );
}

function buildMemoryEntries(logs: EvolutionLog[]): MemoryEntry[] {
  const grouped = new Map<MemoryTone, MemoryEntry>();
  const entries: MemoryEntry[] = [];

  for (const log of logs.slice(0, 50)) {
    const keyMemory = createKeyMemory(log);
    if (keyMemory) {
      entries.push(keyMemory);
      continue;
    }

    const tone = classifyRoutineMemory(log);
    const copy = routineCopy(tone);
    const existing = grouped.get(tone);
    if (existing) {
      existing.count += 1;
      existing.firstAt = log.createdAt;
      existing.description = routineCopy(tone, existing.count).description;
    } else {
      grouped.set(tone, {
        id: `memory-${tone}-${log.id}`,
        tone,
        asset: TONE_ASSETS[tone],
        title: copy.title,
        description: copy.description,
        count: 1,
        firstAt: log.createdAt,
        lastAt: log.createdAt,
      });
    }
  }

  entries.push(...grouped.values());
  return entries.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

function createKeyMemory(log: EvolutionLog): MemoryEntry | null {
  if (/生态共鸣/.test(log.message)) {
    return keyMemory(log, "species", "生态共鸣被观察到", "两个生态角色之间出现了可读懂的互动方向，这段关系会影响潮池后来的性格。");
  }

  if (/第一个小生态循环|互养小循环|生态组合显现/.test(log.message)) {
    return keyMemory(log, "species", "第一个小循环接上了", "生产、分解和滤食不再只是分别存在，它们开始互相喂养这片潮池。");
  }

  if (/繁盛薄膜|生态失衡|过盛薄膜|经历失衡/.test(log.message)) {
    return keyMemory(log, "tide", "繁盛带来压力", "潮池第一次处理生态失衡，繁盛不再只是奖励，也会带来取舍。");
  }

  if (/生态性格|稳定循环|突变爆发|共生网络|极端适应/.test(log.message)) {
    return keyMemory(log, "era", "潮池留下生态性格", "这些选择被生命史归纳下来，这片潮池拥有了自己的生态循环。");
  }

  if (log.type === "species") {
    const name = extractName(log.message);
    return keyMemory(log, "species", "新生命被记住", name ? `${name}第一次出现在潮池里，生命史多了一条新的分支。` : "潮池里出现了新的生命分支。");
  }

  if (log.type === "era") {
    return keyMemory(log, "era", "潮池进入新的阶段", "一次关键变化改变了这片潮池之后的生命方向。");
  }

  if (log.type === "legacy") {
    const name = extractName(log.message);
    return keyMemory(log, "legacy", "旧生命沉入遗产", name ? `${name}离开了当前生态，却把影响留在了后来的潮水里。` : "一段生命退出当下，沉淀成后续生态的遗产。");
  }

  if (log.type === "system" && /印记|源质/.test(log.message)) {
    const name = extractLastQuotedName(log.message);
    return keyMemory(log, "talent", "源质印记融入潮池", name ? `${name}改变了这片潮池后续成长的倾向。` : "新的源质印记融入潮池，改变了之后的成长倾向。");
  }

  if (log.type === "system" && /演化节点|解锁|结构跃迁/.test(log.message)) {
    return keyMemory(log, "era", "关键结构被记录", "潮池确认了一次重要变化，生命史向前推进了一步。");
  }

  return null;
}

function keyMemory(log: EvolutionLog, tone: MemoryTone, title: string, description: string): MemoryEntry {
  return {
    id: `memory-${log.id}`,
    tone,
    asset: TONE_ASSETS[tone],
    title,
    description,
    count: 1,
    firstAt: log.createdAt,
    lastAt: log.createdAt,
  };
}

function classifyRoutineMemory(log: EvolutionLog): MemoryTone {
  const message = log.message;
  if (/光|能量|闪电/.test(message)) return "energy";
  if (/矿|晶|附着/.test(message)) return "mineral";
  if (/潮|有机|养料|分子/.test(message)) return "tide";
  if (/温|热|突变|异常|脉冲/.test(message)) return "heat";
  return log.type === "system" ? "system" : "tide";
}

function routineCopy(tone: MemoryTone, count = 1): Pick<MemoryEntry, "title" | "description"> {
  const prefix = count > 1 ? "多次" : "一次";
  const map: Record<MemoryTone, Pick<MemoryEntry, "title" | "description">> = {
    energy: {
      title: "能量在水面闪过",
      description: count > 1 ? "潮池连续吸收了几次能量闪光，水面变得更活跃。" : "一道能量闪光进入潮池，水面短暂亮了起来。",
    },
    mineral: {
      title: "矿物沉入池底",
      description: count > 1 ? "矿物颗粒多次沉入池底，新的附着面正在增加。" : "矿物颗粒落入池底，为反应留下新的附着面。",
    },
    tide: {
      title: "养料被带回潮池",
      description: count > 1 ? "潮水反复带回养料，生命材料正在富集。" : "潮水带回了一批养料，生命材料开始聚集。",
    },
    heat: {
      title: "异常反应升温",
      description: count > 1 ? "几次异常反应让潮池更不安分，也带来了新的可能。" : "一次异常反应改变了水里的倾向。",
    },
    system: {
      title: "潮池自我调整",
      description: `${prefix}内部调整让潮池继续维持在可演化的边界上。`,
    },
    species: { title: "新生命被记住", description: "潮池里出现了新的生命分支。" },
    legacy: { title: "旧生命沉入遗产", description: "一段生命沉淀成后续生态的遗产。" },
    era: { title: "潮池进入新的阶段", description: "一次关键变化改变了这片潮池之后的生命方向。" },
    talent: { title: "源质印记融入潮池", description: "新的源质印记改变了之后的成长倾向。" },
  };
  return map[tone];
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    producer: "生产者",
    decomposer: "分解者",
    filterer: "滤食者",
    symbiont: "共生者",
    extremophile: "极端适应者",
    catalyst: "催化者",
  };
  return map[role] ?? role;
}

function eventLabel(eventId: string): string {
  const map: Record<string, string> = {
    bloom_pressure: "繁盛压力",
    murky_low_oxygen: "浑浊缺氧",
    decomposer_layer_spread: "分解层扩张",
  };
  return map[eventId] ?? eventId;
}

function resonanceLabel(resonanceId: string): string {
  const map: Record<string, string> = {
    decomposer_feeds_producer: "分解层回喂生产者",
    filter_pores_clear_tide: "滤孔清理浑浊水体",
    bloom_selection_pressure: "繁盛薄膜接受筛选",
  };
  return map[resonanceId] ?? resonanceId;
}

function planetProfileLabel(profile: string): string {
  const map: Record<string, string> = {
    stable_pool: "稳定循环",
    high_mutation: "突变爆发",
    symbiotic: "共生网络",
    extreme: "极端适应",
    cataclysmic: "灾变遗产",
    balanced: "平衡潮池",
  };
  return map[profile] ?? profile;
}

function extractQuotedName(message: string): string {
  return message.match(/[「《](.*?)[」》]/)?.[1] ?? "";
}

function extractLastQuotedName(message: string): string {
  const matches = [...message.matchAll(/[「《](.*?)[」》]/g)];
  return matches.at(-1)?.[1] ?? "";
}

function extractName(message: string): string {
  return message.match(/[:：](.*?)[。\.]/)?.[1]?.trim() ?? extractQuotedName(message);
}

function formatMemoryTime(firstIso: string, lastIso: string): string {
  const last = formatTime(lastIso);
  const first = formatTime(firstIso);
  if (!last) return "";
  if (first && first !== last) return `${first} - ${last}`;
  return last;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
