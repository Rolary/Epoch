# 《生态纪元》技术方案

## 1. 技术结论

第一阶段「生命诞生篇」已经完成基础闭环。当前技术路线继续服务于可持续开发的网页端放置演化游戏，第二章「生态爆发篇」在现有 React + Phaser + Fastify + PostgreSQL 架构上推进。

| 模块 | 当前选择 | 当前说明 |
| --- | --- | --- |
| 前端 | React 19 + Phaser + TypeScript + Vite | React 负责 HUD、页面、弹层；Phaser 负责潮池场景。 |
| 后端 | Node 24 + Fastify + TypeScript | 提供游客身份、权威存档、tick 和操作校验。 |
| 存档 | PostgreSQL | 已作为稳定存档方案，面向 App Platform 部署，避免容器更新丢失本地文件。 |
| 数据库 API | `pg` | 使用轻量连接池，不引入 Prisma。 |
| 状态管理 | Zustand | 桥接 React HUD 与 Phaser 场景。 |
| 核心规则 | `packages/game-core` | 纯函数，前后端共用。 |
| 内容生成 | 本地生成器 | 真实 AI 后续替换，不控制核心数值。 |
| 验证 | TypeScript + Vite build + Vitest | 当前以类型检查、构建、关键测试和手测为主。 |

Prisma 不属于当前第二章。后续需要复杂关系查询、正式账号、多设备同步、分享或统计后台时再评估 ORM。

## 2. 系统边界

前端负责：

- 潮池首页、任务展示、底部导航和二级页面。
- Phaser 潮池场景、发光养料、入场出场动效和生态反馈。
- 生命史、图鉴、遗产、生态档案等玩家侧展示。
- 本地 UI 状态和轻量预测显示。

后端负责：

- 游客身份。
- 存档创建、读取、更新。
- 进入存档时的权威 tick 结算。
- 环境操作、演化解锁、源质印记选择校验。
- 返回可被前端直接展示的权威 `GameState`。

`game-core` 负责：

- 资源增长、环境操作、演化节点、物种生成、遗产和日志写入。
- 这些函数不依赖数据库、HTTP 或 React。

## 3. PostgreSQL 存档设计

数据库连接通过环境变量提供：

```text
DATABASE_URL=postgres://...
```

本地开发未设置 `DATABASE_URL` 时默认连接 `postgres://admin:123456@localhost:5432/epoch`。生产环境必须显式提供 `DATABASE_URL`，不使用开发默认值。

生产环境默认启用 PostgreSQL SSL。若提供 `DATABASE_CA_CERT`，服务端会严格校验证书；未提供时允许 DigitalOcean 托管数据库的自签证书链，避免部署启动失败。

数据库初始化命令：

```bash
corepack pnpm run db:init
```

表结构保持轻量：

```text
saves
- id TEXT PRIMARY KEY
- state_json JSONB NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

guest_saves
- guest_key TEXT NOT NULL
- save_id TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- PRIMARY KEY (guest_key, save_id)
```

设计原则：

- 完整 `GameState` 继续保存为 JSON 快照，第二章仍避免过早拆表。
- 游客与存档关联独立成表，便于后续接入正式账号或多设备同步。
- repository 对 API 暴露 `listSaves / getSave / putSave`，API 层不感知底层存储。
- 服务端首次访问存档接口时自动确保表结构存在。
- 当前没有正式用户，不支持旧 JSON 或 SQLite 存档迁移。

## 4. API

```text
POST /auth/guest

GET  /saves
POST /saves
GET  /saves/:saveId
POST /saves/:saveId/tick

POST /saves/:saveId/actions/environment
POST /saves/:saveId/evolution/unlock
POST /saves/:saveId/talents/select
POST /saves/:saveId/tidal-echo

GET  /saves/:saveId/species
GET  /saves/:saveId/logs
```

说明：

- `/saves/:saveId` 和 `/tick` 都会经过 `advanceState(normalizeGameState(save))`。
- 环境操作与演化解锁由后端校验，前端只提交玩家意图。
- `/logs` 保留 API 名称，前端玩家侧展示为 `生命史 / 潮池记忆`。
- `/tidal-echo` 为后续潮汐回响预留：服务端负责校验解锁条件、资源成本、保底计数、奖池结果和存档写入；前端只提交单次或十连意图。

## 5. 前端路线

当前体验以移动端为先：

- 首页核心目标是“养出第一只生命”。
- 主操作是把潮池周围的发光养料拖入水中。
- 主线任务框每次浏览器打开或刷新后首次进入潮池时自动展示一会儿，再收起到状态栏；同一页面会话内切回潮池不反复自动展开。
- 演化页的节点状态分为已解锁、可解锁、未解锁；可解锁节点和底部入口需要明显提醒。
- `日志` 不再作为玩家侧命名，统一为 `生命史`，页面标题为 `潮池记忆`。
- `设置` 不再作为玩家侧主表达，统一为 `生态档案`，重置存档放入危险操作区。

## 6. 第一阶段验收基线

第一阶段已完成基础闭环，以下内容作为回归基线保留：

- 玩家可创建并恢复后端存档。
- 刷新页面不丢进度。
- App Platform 更新部署不丢存档。
- 玩家能通过拖拽发光养料推进第一阶段；拖拽会积累生命材料，并给低稳定潮池提供可感知的回稳来源。
- 玩家能解锁演化节点，并看到可解锁提醒。
- 玩家能发现至少一种生命并写入图鉴。
- 生命史不显示大量重复技术日志，而是合并为自然记忆。
- 生态档案能展示身份、成长记录、状态和存档信息。

验证命令：

```bash
corepack pnpm run typecheck
corepack pnpm run build
```

## 7. 文档同步要求

涉及以下改动时，必须同步更新决策文档：

- 存储、API、核心数据结构。
- 主线目标、阶段范围、解锁条件。
- 玩家可见页面名、入口名、按钮文案。
- 首页主交互、任务展示、演化页状态表现。
- 第一章基线、第二章范围和后续阶段的边界。

文档要区分三类信息：

- `当前实现`：代码已经按此运行。
- `第一章基线`：已经完成，后续改动不能破坏。
- `第二章当前目标`：当前开发要实现的内容。
- `后续方向`：长期设想，不能误写成当前目标。

## 8. 后续技术方向：潮汐回响

潮汐回响详见 `docs/tidal-echo-gacha.md`。第一版技术落点建议：

- `GameState` 增加回响统计字段，例如 `echoPity`, `echoRarePity`, `echoTrace`, `totalEchoes`。
- `game-core` 新增纯函数负责校验解锁、扣除多资源成本、生成普通资源或源质印记结果、更新保底和写入日志。
- API 使用 `POST /saves/:saveId/tidal-echo`，服务端负责所有概率、保底和存档结算，前端只提交单次或十连意图。
- 前端新增潮汐回响入口、资源不足提示、单次/十连选择和结果揭示弹层；源质印记结果应复用现有印记选择/持有逻辑。
