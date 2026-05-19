# 《生态纪元》第一阶段技术方案

## 1. 技术结论

第一阶段目标是做出可持续开发的网页端放置演化游戏，而不是一次性静态原型。当前技术路线以本地开发和清晰闭环为优先。

| 模块 | 当前选择 | 一阶段说明 |
| --- | --- | --- |
| 前端 | React 19 + Phaser + TypeScript + Vite | React 负责 HUD、页面、弹层；Phaser 负责潮池场景。 |
| 后端 | Node 24 + Fastify + TypeScript | 提供游客身份、权威存档、tick 和操作校验。 |
| 存档 | SQLite (`data/saves.sqlite`) | 一阶段本地数据库，轻量可靠。 |
| SQLite API | Node 内置 `node:sqlite` | 不引入 Prisma 或第三方 SQLite 包。 |
| 状态管理 | Zustand | 桥接 React HUD 与 Phaser 场景。 |
| 核心规则 | `packages/game-core` | 纯函数，前后端共用。 |
| 内容生成 | 本地生成器 | 真实 AI 后续替换，不控制核心数值。 |
| 验证 | TypeScript + Vite build | 一阶段以类型检查、构建和关键手测为主。 |

PostgreSQL / Prisma 不属于一阶段。它们只在后续需要正式账号、多设备同步、分享、统计后台或线上运维时再评估。

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

## 3. SQLite 存档设计

数据库文件：

```text
data/saves.sqlite
```

测试或临时环境可以通过 `ECO_ERA_DATA_DIR` 改写数据目录；未设置时默认写入项目根目录下的 `data/`。

表结构保持轻量：

```text
saves
- id TEXT PRIMARY KEY
- state_json TEXT NOT NULL
- updated_at TEXT NOT NULL

guest_saves
- guest_key TEXT NOT NULL
- save_id TEXT NOT NULL
- created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- PRIMARY KEY (guest_key, save_id)
```

设计原则：

- 完整 `GameState` 继续保存为 JSON 快照，避免一阶段过早拆表。
- 游客与存档关联独立成表，避免继续使用 JSON 文件里的嵌套索引。
- repository 对 API 暴露 `listSaves / getSave / putSave`，API 层不感知底层存储。
- 如果旧 `data/saves.json` 存在且 SQLite 为空，启动时做一次非破坏迁移。
- 迁移后不双写 JSON，旧文件只保留为备份。

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

GET  /saves/:saveId/species
GET  /saves/:saveId/logs
```

说明：

- `/saves/:saveId` 和 `/tick` 都会经过 `advanceState(normalizeGameState(save))`。
- 环境操作与演化解锁由后端校验，前端只提交玩家意图。
- `/logs` 保留 API 名称，前端玩家侧展示为 `生命史 / 潮池记忆`。

## 5. 前端路线

当前体验以移动端为先：

- 首页核心目标是“养出第一只生命”。
- 主操作是把潮池周围的发光养料拖入水中。
- 主线任务框首次展示后自动收起到状态栏并记住收起状态，只保留关键信息；点击可展开查看，也可手动收起。
- 演化页的节点状态分为已解锁、可解锁、未解锁；可解锁节点和底部入口需要明显提醒。
- `日志` 不再作为玩家侧命名，统一为 `生命史`，页面标题为 `潮池记忆`。
- `设置` 不再作为玩家侧主表达，统一为 `生态档案`，重置存档放入危险操作区。

## 6. 第一阶段验收

必须完成：

- 玩家可创建并恢复后端存档。
- 刷新页面不丢进度。
- 旧 JSON 存档可迁移到 SQLite。
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
- 第一阶段和后续阶段的边界。

文档要区分三类信息：

- `当前实现`：代码已经按此运行。
- `一阶段待收口`：近期必须补齐。
- `后续方向`：长期设想，不能误写成当前目标。
