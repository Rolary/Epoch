import type { EcologyEvent } from "@eco-era/shared";
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
  const event = save?.pendingEcologyEvent as EcologyEvent | null | undefined;

  if (!save || !event) {
    hideModal();
    return null;
  }

  const choose = async (optionId: string) => {
    try {
      const next = await chooseEcologyEvent(save.id, event.id, optionId);
      snoozeEcologyEvent(null);
      setSave(next);
      hideModal();
    } catch {
      hideModal();
    }
  };

  const snooze = () => {
    snoozeEcologyEvent(event.id);
    hideModal();
  };

  return (
    <GameModal title={event.title} onClose={() => snoozeEcologyEvent(event.id)}>
      <div className="ecology-event-modal">
        <img className="event-visual" src={eventAssetFor(event)} alt="" aria-hidden="true" />
        <span className="event-choice-kicker">潮池时刻 · 选择一项回应</span>
        <p className="event-description">{event.description}</p>
        <span className="event-tendency">潮池正在显露：{event.tendencyTag}</span>
        <div className="event-options">
          {event.options.map((option, index) => (
            <button key={option.id} className="event-option" onClick={() => choose(option.id)}>
              <span className="event-option-index">{index + 1}</span>
              <span className="event-option-title">{option.title}</span>
              <span className="event-option-desc">{option.description}</span>
              <span className="event-option-effect">{effectCopy(option.resourceEffect, option.environmentEffect)}</span>
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
  return [resourceCopy, envCopy].filter(Boolean).join(" / ") || "潮池性格会被记录";
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
