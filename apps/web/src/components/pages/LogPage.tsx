import type { EvolutionLog, HiddenTraceRecord } from "@eco-era/shared";
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
            第一批稳定结构出现后，这里会记录潮池的重要变化。
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
      <p className="page-hint">重复现象会合并整理，物种出现、环境转折和生态互动会单独记录。</p>
      {save?.chapterProgress?.chapter === "shoreline_differentiation" && <ShorelineMemoryBand save={save} />}
      {save?.chapterProgress?.chapter === "ecology_burst" && save.chapterProgress.stage === "complete" && <ChapterTwoSummary save={save} />}
      {(save?.hiddenTraces?.records.length ?? 0) > 0 && <HiddenTraceMemories records={save!.hiddenTraces!.records} />}
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

function ShorelineMemoryBand({ save }: { save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]> }) {
  const witness = save.chapterWitness?.shorelineDifferentiation;
  if (!witness?.waterlineExposed) return null;
  const moments = [
    {
      id: "waterline",
      title: "水线露出",
      description: "退潮第一次在浅水之外露出湿岩。",
      visible: true,
      traceAsset: null,
    },
    {
      id: "attachment",
      title: "第一次附着",
      description: witness.dryWetPressureWitnessed
        ? shorelineStrategyMemory(witness.shorelineStrategy)
        : "一支原有生命随水流附着在湿岸。",
      visible: witness.shoreColonized,
      traceAsset: shorelineMemoryTraceAsset(witness.shorelineStrategy),
    },
    {
      id: "exchange",
      title: "第一次回流",
      description: "岸边碎屑回到浅水，两处栖位接成往返。",
      visible: witness.shorelineExchangeWitnessed,
      traceAsset: uiAssets.shoreline.tidalDispersal,
    },
  ];
  return (
    <section className="shoreline-memory-band" aria-labelledby="shoreline-memory-title">
      <div className="shoreline-memory-heading">
        <span>岸线记录</span>
        <h3 id="shoreline-memory-title">水线怎样形成</h3>
      </div>
      <div className="shoreline-memory-moments">
        {moments.map((moment) => (
          <article key={moment.id} className={`shoreline-memory-moment ${moment.visible ? "visible" : "waiting"}`}>
            <div className={`shoreline-memory-scene scene-${moment.id}`} aria-hidden="true">
              <span className="shoreline-memory-water" />
              <img className="shoreline-memory-rock" src={uiAssets.shoreline.wetRockOverlay} alt="" />
              {moment.traceAsset && <img className="shoreline-memory-trace" src={moment.traceAsset} alt="" />}
            </div>
            <h4>{moment.visible ? moment.title : "岸线仍在等待"}</h4>
            <p>{moment.visible ? moment.description : "这一段变化还没有发生。"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function shorelineStrategyMemory(strategy: string | undefined) {
  if (strategy === "rock_attachment") return "湿岩见光后，耐晒附着斑仍停留在岸面。";
  if (strategy === "tidal_dispersal") return "附着斑随回潮退回浅水，播散比定居更占优势。";
  return "薄水膜延缓了失水，第一处附着斑得以存活。";
}

function shorelineMemoryTraceAsset(strategy: string | undefined) {
  if (strategy === "rock_attachment") return uiAssets.shoreline.rockAttachment;
  if (strategy === "tidal_dispersal") return uiAssets.shoreline.tidalDispersal;
  return uiAssets.shoreline.moistureFilm;
}

function HiddenTraceMemories({ records }: { records: HiddenTraceRecord[] }) {
  return (
    <section className="hidden-trace-memory" aria-labelledby="hidden-trace-title">
      <div className="hidden-trace-memory-head">
        <div>
          <span>潮池之外的回声</span>
          <h3 id="hidden-trace-title">隐秘潮痕</h3>
        </div>
        <strong>+{records.reduce((sum, record) => sum + record.score, 0)}</strong>
      </div>
      <div className="hidden-trace-list">
        {records.map((record) => (
          <article className="hidden-trace-record" key={record.id}>
            <img src={uiAssets.hiddenTraces.emblem} alt="" aria-hidden="true" />
            <div>
              <div className="hidden-trace-record-title">
                <h4>{record.name}</h4>
                <span>+{record.score}</span>
              </div>
              <p>{record.description}</p>
              <small>{record.echo}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChapterTwoSummary({ save }: { save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]> }) {
  const livingRoles = save.species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole);
  const witnessedRoles = save.chapterWitness?.ecologyBurst.rolesWitnessed ?? [];
  const roles = Array.from(new Set([...livingRoles, ...witnessedRoles])).map(roleLabel);
  const imbalances = (save.eventHistory ?? [])
    .filter((id) => ["bloom_pressure", "murky_low_oxygen", "decomposer_layer_spread"].includes(id))
    .map(eventLabel);
  const resonances = (save.resonanceHistory ?? []).map(resonanceLabel);
  return (
    <section className="chapter-summary-card">
      <div className="chapter-summary-head">
        <img src={uiAssets.emblems.ecologyResonance} alt="" aria-hidden="true" />
        <div>
          <span className="chapter-summary-kicker">潮池记忆</span>
          <h3>第一组生态循环已经形成</h3>
        </div>
      </div>
      <p>当前生态倾向：{planetProfileLabel(save.planetProfile)}。</p>
      <div className="chapter-summary-grid">
        <span><strong>维持循环的生命</strong>{roles.join(" / ") || "尚未记录"}</span>
        <span><strong>发生过的生态互动</strong>{resonances.slice(-2).join(" / ") || "生产、分解、滤食形成小循环"}</span>
        <span><strong>承受过的过盛</strong>{imbalances.join(" / ") || "繁盛压力"}</span>
        <span><strong>形成的倾向</strong>{planetProfileLabel(save.planetProfile)}</span>
      </div>
    </section>
  );
}

function buildMemoryEntries(logs: EvolutionLog[]): MemoryEntry[] {
  const grouped = new Map<MemoryTone, MemoryEntry>();
  const keyGrouped = new Map<string, MemoryEntry>();
  const entries: MemoryEntry[] = [];

  for (const log of logs.slice(0, 50)) {
    const keyMemory = createKeyMemory(log);
    if (keyMemory) {
      const groupKey = `${keyMemory.tone}:${keyMemory.title}:${keyMemory.description}`;
      const existing = keyGrouped.get(groupKey);
      if (existing) {
        existing.count += 1;
        existing.firstAt = log.createdAt;
      } else {
        keyGrouped.set(groupKey, keyMemory);
      }
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

  entries.push(...keyGrouped.values(), ...grouped.values());
  return entries.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

function createKeyMemory(log: EvolutionLog): MemoryEntry | null {
  if (/水线露出来|水线显现/.test(log.message)) {
    return keyMemory(log, "tide", "水线露出来了", "退潮第一次在浅水之外露出湿岩，浅水与岸面由此分开。");
  }

  if (/贴住了湿岩|第一次贴岸|随水流抵达湿岩|附着在湿岸/.test(log.message)) {
    return keyMemory(log, "species", "有一支生命附着湿岸", "水流把原有谱系带向岸边，它靠自身结构附着在湿岩上。");
  }

  if (/岸线往返|岸边碎屑带回浅水/.test(log.message)) {
    return keyMemory(log, "tide", "岸边与浅水形成往返", "回潮把岸边碎屑带回浅水，两个栖位由此交换材料。");
  }

  if (/生态共鸣|水中回响/.test(log.message)) {
    return keyMemory(log, "species", "第一次生态互动", "两个生态角色交换了材料，水体清澈度与生长速度随之改变。");
  }

  if (/第一个小生态循环|互养小循环|生态组合显现/.test(log.message)) {
    return keyMemory(log, "species", "第一个小循环形成了", "生产、分解和过滤已经能够循环利用材料。");
  }

  if (/繁盛薄膜|生态失衡|过盛薄膜|经历失衡|水面太满|过盛/.test(log.message)) {
    return keyMemory(log, "tide", "水面太满了", "薄膜过度生长，清水、空隙和下层呼吸受到挤压。");
  }

  if (/生态性格|潮池留下自己的样子|稳定循环|突变爆发|共生网络|极端适应/.test(log.message)) {
    return keyMemory(log, "era", "长期生态倾向形成", "反复出现的环境变化被记录为稳定循环、突变偏向或其他生态倾向。");
  }

  if (log.type === "species") {
    const name = extractName(log.message);
    return keyMemory(log, "species", "新生命被记住", name ? `${name}第一次出现在潮池里，生命史多了一条新的分支。` : "潮池里出现了新的生命分支。");
  }

  if (log.type === "era") {
    return keyMemory(log, "era", "环境出现长期变化", "一次关键环境变化正在持续影响后续演化。");
  }

  if (log.type === "legacy") {
    const name = extractName(log.message);
    return keyMemory(log, "legacy", "物种退出当前生态", name ? `${name}已经离开，它造成的结构、空位或警示仍会影响后来生命。` : "一个物种退出生态，并留下了持续影响。");
  }

  if (log.type === "system" && /印记|源质/.test(log.message)) {
    const name = extractLastQuotedName(log.message);
    return keyMemory(log, "talent", "获得源质印记", name ? `${name}开始长期影响这片潮池。` : "新的源质印记开始长期影响这片潮池。");
  }

  if (log.type === "system" && /演化节点|解锁|结构跃迁/.test(log.message)) {
    return keyMemory(log, "era", "确认了一项演化", "这项结构变化已经生效，并成为后续生命的生长基础。");
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
    legacy: { title: "物种退出当前生态", description: "它留下的结构、空位或警示仍会影响后来生命。" },
    era: { title: "环境出现长期变化", description: "一次关键环境变化正在持续影响后续演化。" },
    talent: { title: "获得源质印记", description: "新的源质印记开始长期影响这片潮池。" },
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
