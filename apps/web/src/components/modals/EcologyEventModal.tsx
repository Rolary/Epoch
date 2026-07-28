import type { EcologyEvent } from "@eco-era/shared";
import { useState } from "react";
import { chooseEcologyEvent } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function EcologyEventModal() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const hideModal = useUIStore((s) => s.hideModal);
  const snoozeEcologyEvent = useUIStore((s) => s.snoozeEcologyEvent);
  const completeNarrative = useUIStore((s) => s.completeNarrative);
  const modalData = useUIStore((s) => s.modalData);
  const narrativeId = modalData.narrativeId as string | undefined;
  const event = save?.pendingEcologyEvent as EcologyEvent | null | undefined;
  const [previewOptionId, setPreviewOptionId] = useState<string | null>(null);

  if (!save || !event) {
    hideModal();
    return null;
  }
  const shorelineEvent = isShorelineEvent(event.id);

  const choose = async (optionId: string) => {
    const option = event.options.find((item) => item.id === optionId);
    if (!option) return;
    useUIStore.getState().showModal("decision-confirm", {
      title: `确定选择“${option.title}”吗？`,
      description: option.description,
      gain: option.title,
      cost: tradeoffCopy(option.resourceEffect, option.environmentEffect),
      confirmLabel: "确认选择",
      cancelLabel: "返回事件",
      previewOptionId: shorelineEvent ? optionId : undefined,
      onCancel: () => {
        useUIStore.getState().showModal("ecology-event", narrativeId ? { narrativeId } : {});
      },
      onConfirm: async () => {
        try {
          const next = await chooseEcologyEvent(save.id, event.id, optionId);
          previewShorelineChoice(null);
          snoozeEcologyEvent(null);
          setSave(next);
          if (narrativeId) completeNarrative(narrativeId);
        } catch {
          hideModal();
        }
      },
    });
  };

  const preview = (optionId: string | null) => {
    setPreviewOptionId(optionId);
    previewShorelineChoice(optionId);
  };

  const snooze = () => {
    previewShorelineChoice(null);
    snoozeEcologyEvent(event.id);
    if (narrativeId) completeNarrative(narrativeId);
    else hideModal();
  };

  return (
    <GameModal title={event.title} onClose={snooze}>
      <div className="ecology-event-modal">
        {shorelineEvent ? (
          <div className={`event-visual shoreline-event-visual event-${event.id} preview-${previewOptionId ?? "idle"}`} aria-hidden="true">
            <img className="shoreline-event-base" src={uiAssets.events.ebbDryness} alt="" />
            {(previewOptionId || event.id === "salt_crystal_rise") && (
              <img className="shoreline-event-trace" src={shorelineTraceAsset(event.id, previewOptionId)} alt="" />
            )}
          </div>
        ) : (
          <img className="event-visual" src={eventAssetFor(event)} alt="" aria-hidden="true" />
        )}
        <span className="event-choice-kicker">{shorelineEvent ? "岸线时刻" : "潮池时刻"} · 选择一项回应</span>
        <p className="event-description">{event.description}</p>
        <span className="event-tendency">潮池正在显露：{event.tendencyTag}</span>
        <div className="event-options">
          {event.options.map((option) => (
            <button
              key={option.id}
              className="event-option"
              onClick={() => choose(option.id)}
              onMouseEnter={() => shorelineEvent && preview(option.id)}
              onMouseLeave={() => shorelineEvent && preview(null)}
              onFocus={() => shorelineEvent && preview(option.id)}
              onBlur={() => shorelineEvent && preview(null)}
            >
              <span className="event-option-title">{option.title}</span>
              <span className="event-option-desc">{option.description}</span>
              <span className="event-option-effect">
                {shorelineEvent ? shorelineEffectCopy(event.id, option.id) : `环境变化：${effectCopy(option.resourceEffect, option.environmentEffect)}`}
              </span>
            </button>
          ))}
        </div>
        <button className="btn-secondary event-snooze" onClick={snooze}>
          稍后再选
        </button>
      </div>
    </GameModal>
  );
}

function previewShorelineChoice(optionId: string | null) {
  window.dispatchEvent(new CustomEvent("shoreline-choice-preview", { detail: { optionId } }));
}

function isShorelineEvent(eventId: string) {
  return eventId === "ebb_dryness" || eventId === "salt_crystal_rise";
}

function shorelineEffectCopy(eventId: string, optionId: string) {
  if (eventId === "salt_crystal_rise") {
    if (optionId === "bind_salt_crust") return "更易形成：矿物结面与牢固附着 · 代价：岸缘生长暂时放慢";
    if (optionId === "rinse_salt_crystals") return "更易恢复：薄水膜与浅水回流 · 代价：失去一部分矿物结面";
    return "可能留下：耐盐结构与突变 · 代价：脆弱附着斑可能退化";
  }
  if (optionId === "protect_moisture_film") return "更易存活：薄水膜与稳定附着 · 代价：暂缓向远处岩面扩张";
  if (optionId === "expose_wet_rock") return "更易存活：耐晒结面与强附着 · 代价：水分和稳定性下降";
  return "更易形成：回流与播散倾向 · 代价：岸边定居机会减少";
}

function shorelineTraceAsset(eventId: string, optionId: string | null) {
  if (eventId === "salt_crystal_rise") {
    if (optionId === "rinse_salt_crystals") return uiAssets.shoreline.tidalDispersal;
    return uiAssets.shoreline.rockAttachment;
  }
  if (optionId === "expose_wet_rock") return uiAssets.shoreline.rockAttachment;
  if (optionId === "return_to_shallows") return uiAssets.shoreline.tidalDispersal;
  return uiAssets.shoreline.moistureFilm;
}

function eventAssetFor(event: EcologyEvent): string {
  if (/hot|spring|heat|thermal|volcanic|泉|热/.test(event.id + event.title + event.tendencyTag)) {
    return uiAssets.events.hotSpring;
  }
  return uiAssets.events.clearTide;
}

function effectCopy(
  resources: EcologyEvent["options"][number]["resourceEffect"],
  environment: EcologyEvent["options"][number]["environmentEffect"],
) {
  const resourceCopy = Object.entries(resources ?? {})
    .map(([key, value]) => `${resourceLabel(key)} ${value > 0 ? "+" : ""}${value}`)
    .join(" · ");
  const envCopy = Object.entries(environment ?? {})
    .map(([key, value]) => `${envLabel(key)} ${value > 0 ? "+" : ""}${value}`)
    .join(" · ");
  return [resourceCopy, envCopy].filter(Boolean).join(" / ") || "这次应对会形成长期生态倾向";
}

function tradeoffCopy(
  resources: EcologyEvent["options"][number]["resourceEffect"],
  environment: EcologyEvent["options"][number]["environmentEffect"],
) {
  const pressures = Object.entries(resources ?? {})
    .filter(([, value]) => value < 0)
    .map(([key]) => `${resourceLabel(key)}会暂时回落`);
  if ((environment?.volatility ?? 0) > 0) pressures.push("水体会变得更不安定");
  if ((environment?.light ?? 0) < 0) pressures.push("浅层光照会减少");
  if ((environment?.tide ?? 0) < 0) pressures.push("潮汐带回材料的速度会放慢");
  return pressures.join("；") || "这个选择会改变后续环境，并记录在潮池记忆中。";
}

function resourceLabel(key: string) {
  const map: Record<string, string> = {
    organic: "有机质",
    energy: "能量",
    minerals: "矿物质",
    stability: "稳定性",
    mutation: "突变",
    biomass: "生物量",
  };
  return map[key] ?? key;
}

function envLabel(key: string) {
  const map: Record<string, string> = {
    light: "光照",
    tide: "潮汐",
    heat: "温度",
    mineralFlow: "矿物流",
    volatility: "波动",
  };
  return map[key] ?? key;
}
