import { talentCatalog } from "@eco-era/game-core";
import type { Talent } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { RARITY_LABELS, talentAssetFor } from "../talents/talentPresentation.js";

type ConsumedTalent = {
  talent: Talent;
  count: number;
};

export function TalentArchivePage() {
  const save = useGameStore((s) => s.save);
  const setPage = useUIStore((s) => s.setPage);

  if (!save) {
    return (
      <div className="page talent-archive-page">
        <button className="btn-back" onClick={() => setPage("settings")}>← 档案</button>
        <h2 className="page-title">源质印记</h2>
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.talents.typeCrystal} alt="" aria-hidden="true" />
          <p className="empty-title">还没有潮池档案</p>
          <p className="empty-hint">创建生态后，源质印记会在这里留下记录。</p>
        </div>
      </div>
    );
  }

  const permanentTalents = save.talents.filter((talent) => !talent.consumable);
  const consumedTalents = buildConsumedTalents(save.consumedTalents ?? []);
  const permanentTotal = talentCatalog.filter((talent) => !talent.consumable).length;
  const consumableTotal = talentCatalog.filter((talent) => talent.consumable).length;
  const collectedIds = new Set([
    ...permanentTalents.map((talent) => talent.id),
    ...consumedTalents.map(({ talent }) => talent.id),
  ]);
  const hasVisibleTalents = permanentTalents.length > 0 || consumedTalents.length > 0;

  return (
    <div className="page talent-archive-page">
      <button className="btn-back" onClick={() => setPage("settings")}>← 档案</button>
      <h2 className="page-title">源质印记</h2>
      <p className="page-hint">这里只记录已经融入潮池，或已经回响过的一次性印记。</p>

      <section className="archive-section">
        <h3 className="archive-section-title">收集进度</h3>
        <div className="talent-progress-grid">
          <ProgressStat label="永久印记" value={`${permanentTalents.length}/${permanentTotal}`} />
          <ProgressStat label="一次性种类" value={`${consumedTalents.length}/${consumableTotal}`} />
          <ProgressStat label="全图鉴" value={`${collectedIds.size}/${talentCatalog.length}`} />
        </div>
      </section>

      {!hasVisibleTalents && (
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.talents.typeTide} alt="" aria-hidden="true" />
          <p className="empty-title">还没有印记留下记录</p>
          <p className="empty-hint">选择或唤醒源质印记后，这里会出现已解锁的卡片。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      )}

      {permanentTalents.length > 0 && (
        <section className="talent-archive-section">
          <h3 className="archive-section-title">已融入</h3>
          <div className="talent-cards archive">
            {permanentTalents.map((talent) => (
              <TalentCard key={talent.id} talent={talent} statusLabel="已融入" />
            ))}
          </div>
        </section>
      )}

      {consumedTalents.length > 0 && (
        <section className="talent-archive-section">
          <h3 className="archive-section-title">已回响</h3>
          <div className="talent-cards archive">
            {consumedTalents.map(({ talent, count }) => (
              <TalentCard key={talent.id} talent={talent} statusLabel={`已回响 x${count}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TalentCard({ talent, statusLabel }: { talent: Talent; statusLabel: string }) {
  return (
    <article className={`talent-card talent-card-owned rarity-${talent.rarity}`}>
      <div className="talent-card-head">
        <img className="talent-icon" src={talentAssetFor(talent)} alt="" aria-hidden="true" />
        <span className="talent-card-meta">
          <span className="talent-name">{talent.name}</span>
          <span className={`talent-rarity-pill rarity-${talent.rarity}`}>{RARITY_LABELS[talent.rarity]}</span>
        </span>
        <span className="talent-owned-badge">{statusLabel}</span>
      </div>
      <span className="talent-summary">{talent.summary}</span>
      <span className="talent-desc">{talent.description}</span>
      {talent.trait && (
        <span className="talent-trait">
          {talent.trait.name}: {talent.trait.desc}
        </span>
      )}
    </article>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="archive-stat">
      <span className="archive-stat-value">{value}</span>
      <span className="archive-stat-label">{label}</span>
    </div>
  );
}

function buildConsumedTalents(consumedIds: string[]): ConsumedTalent[] {
  const counts = consumedIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const catalogById = new Map(talentCatalog.map((talent) => [talent.id, talent]));
  return Object.entries(counts)
    .map(([id, count]) => {
      const talent = catalogById.get(id);
      return talent?.consumable ? { talent, count } : null;
    })
    .filter((item): item is ConsumedTalent => item !== null);
}
