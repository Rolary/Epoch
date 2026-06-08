import type { LeaderboardEntry, LeaderboardResponse } from "@eco-era/shared";
import { formatChineseNumber } from "@eco-era/shared";
import { useEffect, useState } from "react";
import { getLeaderboard } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

const ERA_LABELS: Record<string, string> = {
  primordial_pool: "始源潮池",
  self_replicators: "自复制链",
  proto_cell: "原初细胞",
  photosynthesis_eve: "光合作用前夜",
};

const PROFILE_LABELS: Record<string, string> = {
  balanced: "均衡演化",
  high_mutation: "高频突变",
  stable_pool: "稳定富集",
  cataclysmic: "灾变频发",
  symbiotic: "共生繁盛",
  extreme: "极端环境",
};

export function LeaderboardPage() {
  const setPage = useUIStore((s) => s.setPage);
  const save = useGameStore((s) => s.save);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getLeaderboard(50)
      .then((response) => {
        if (!alive) return;
        setData(response);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "排行榜暂时无法读取");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [save?.updatedAt]);

  const entries = data?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="page leaderboard-page">
      <h2 className="page-title">生态排行</h2>
      <p className="page-hint">全服匿名总榜会比较潮池的演化进度、物种记录、遗产沉淀和资源活性。</p>

      {loading && (
        <div className="empty-state leaderboard-loading">
          <img className="empty-icon asset-empty-icon" src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
          <p className="empty-title">正在读取潮池回声</p>
          <p className="empty-hint">榜单会隐藏游客印记，只保留生态名和成长摘要。</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.emblems.system} alt="" aria-hidden="true" />
          <p className="empty-title">排行榜暂时沉寂</p>
          <p className="empty-hint">{error}</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>
            返回潮池
          </button>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.scene.poolCenterpiece} alt="" aria-hidden="true" />
          <p className="empty-title">还没有生态登上榜单</p>
          <p className="empty-hint">创建并推进一片潮池后，它会以匿名生态名加入全服总榜。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>
            返回潮池
          </button>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <section className="leaderboard-hero">
            <img className="leaderboard-hero-icon" src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
            <div className="leaderboard-hero-copy">
              <span className="leaderboard-kicker">全服总榜</span>
              <span className="leaderboard-scoreline">{formatChineseNumber(entries[0]?.score ?? 0)}</span>
              <span className="leaderboard-subcopy">最高生态评分</span>
            </div>
          </section>

          {podium.length > 0 && (
            <section className="leaderboard-podium" aria-label="前三名">
              {podium.map((entry) => (
                <LeaderboardPodiumCard key={entry.rank} entry={entry} />
              ))}
            </section>
          )}

          {data?.mine && <MineRank entry={data.mine} />}

          <section className="leaderboard-list" aria-label="完整排名">
            {rest.map((entry) => (
              <LeaderboardRow key={entry.rank} entry={entry} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function LeaderboardPodiumCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <article className={`leaderboard-podium-card rank-${entry.rank} ${entry.isMine ? "is-mine" : ""}`}>
      <span className="leaderboard-rank">#{entry.rank}</span>
      <img className="leaderboard-entry-icon" src={iconForRank(entry.rank)} alt="" aria-hidden="true" />
      <div className="leaderboard-entry-main">
        <h3 className="leaderboard-name">{entry.ecologyName}</h3>
        <span className="leaderboard-meta">{entryLabel(entry)}</span>
        <ScoreBreakdown entry={entry} />
      </div>
      <span className="leaderboard-score">{formatChineseNumber(entry.score)}</span>
      {entry.isMine && <span className="leaderboard-mine">你</span>}
    </article>
  );
}

function MineRank({ entry }: { entry: LeaderboardEntry }) {
  return (
    <section className="leaderboard-mine-card">
      <span className="leaderboard-mine-label">你的当前排名</span>
      <LeaderboardRow entry={entry} compact />
    </section>
  );
}

function LeaderboardRow({ entry, compact = false }: { entry: LeaderboardEntry; compact?: boolean }) {
  return (
    <article className={`leaderboard-row ${entry.isMine ? "is-mine" : ""} ${compact ? "compact" : ""}`}>
      <span className="leaderboard-row-rank">#{entry.rank}</span>
      <div className="leaderboard-row-body">
        <div className="leaderboard-row-head">
          <h3 className="leaderboard-name">{entry.ecologyName}</h3>
          {entry.isMine && <span className="leaderboard-mine">你</span>}
        </div>
        <span className="leaderboard-meta">{entryLabel(entry)}</span>
        <ScoreBreakdown entry={entry} compact={compact} />
      </div>
      <span className="leaderboard-row-score">{formatChineseNumber(entry.score)}</span>
    </article>
  );
}

function ScoreBreakdown({ entry, compact = false }: { entry: LeaderboardEntry; compact?: boolean }) {
  const items = [
    ["纪元", entry.scoreBreakdown.era],
    ["演化", entry.scoreBreakdown.evolution],
    ["物种", entry.scoreBreakdown.species],
    ["资源", entry.scoreBreakdown.resources],
    ["遗产", entry.scoreBreakdown.legacy],
    ["印记", entry.scoreBreakdown.talents],
  ] as const;
  const visibleItems = compact ? items.slice(0, 4) : items;

  return (
    <div className="leaderboard-breakdown" aria-label="评分来源">
      {visibleItems.map(([label, value]) => (
        <span className="leaderboard-breakdown-chip" key={label}>
          <span>{label}</span>
          <strong>{formatChineseNumber(value)}</strong>
        </span>
      ))}
    </div>
  );
}

function entryLabel(entry: LeaderboardEntry) {
  const era = ERA_LABELS[entry.currentEra] ?? entry.currentEra;
  const profile = PROFILE_LABELS[entry.planetProfile] ?? entry.planetProfile;
  return `${era} · ${profile} · 痕迹 ${entry.unlockedNodes} · 物种 ${entry.speciesCount}`;
}

function iconForRank(rank: number) {
  if (rank === 1) return uiAssets.emblems.reward;
  if (rank === 2) return uiAssets.resources.biomass;
  return uiAssets.resources.mutation;
}
