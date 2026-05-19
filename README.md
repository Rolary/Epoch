# 生态纪元

网页端放置演化游戏。当前阶段聚焦第一阶段「生命诞生篇」：让玩家从一池还没有生命的水开始，亲手养出第一只生命，并把这段生命史记录下来。

## 当前路线

- 前端：React 19 + Phaser + Vite，React 负责 HUD、页面、弹层和引导，Phaser 负责潮池场景。
- 后端：Fastify + TypeScript，负责游客身份、权威存档、tick 结算、环境操作和演化解锁校验。
- 核心规则：`packages/game-core`，前后端共用纯函数。
- 存档：一阶段使用本地 SQLite 文件 `data/saves.sqlite`。
- 内容生成：一阶段使用本地生成器，真实 AI 接入属于后续扩展。

## 一阶段目标

玩家第一次进入游戏后，应在 3 秒内知道目标：

```text
我要把这片潮池养出第一只生命。
```

核心链路：

```text
拖入发光养料
-> 潮池积累生命材料
-> 发现生命痕迹
-> 解锁延续结构
-> 第一种生命出现
-> 写入图鉴与生命史
```

首页不做控制面板。主界面只保留潮池、少量关键状态、当前主线和可操作的发光养料。主线任务框首次展示后会自动收起到状态栏，并记住收起状态；玩家可再次展开查看，也可手动收起。

## 已实现重点

- 创建生态：生态名称 + 源质印记三选一。
- 始源潮池首页：拖拽发光养料进入水中触发催化，积累生命材料，并让低稳定的潮池逐步回稳。
- 主线任务：围绕「养出第一只生命」包装，支持轻量收起。
- 演化页：节点区分已解锁、可解锁、未解锁，可解锁状态有高亮提醒。
- 图鉴：记录发现的物种，物种会影响后续生态。
- 生命史：入口名为 `生命史`，页面名为 `潮池记忆`，合并重复事件为自然记忆。
- 生态档案：替代传统设置页，展示潮池身份、成长记录、当前状态和存档信息。
- 服务端存档：SQLite 本地数据库，旧 `data/saves.json` 可非破坏迁移。

## 暂不属于一阶段

- PostgreSQL / Prisma。
- 正式账号、多设备同步和多人分享。
- 真实 AI 文本或图片生成服务。
- 完整多纪元流程。
- 文明、星际生态和复杂谱系报告。

这些能力可以在后续线上化或内容扩展阶段加入，但不能反向挤压一阶段的清晰开局体验。

## 开发命令

```bash
corepack pnpm install
corepack pnpm run dev
corepack pnpm run typecheck
corepack pnpm run build
```

本地地址：

```text
Web: http://127.0.0.1:5173
API: http://127.0.0.1:8787
```

## 存档说明

一阶段存档写入：

```text
data/saves.sqlite
```

SQLite 中保留轻量结构：

- `guest_saves`：游客与存档的关联。
- `saves`：完整 `GameState` JSON 快照和更新时间。

如果开发环境里存在旧的 `data/saves.json`，服务端第一次打开 SQLite 且库为空时会迁移旧数据。旧 JSON 文件会保留为备份，迁移后不再双写。

## 文档同步规则

代码改动触及以下内容时，必须同步检查相关决策文档：

- 存储、API、核心数据结构。
- 主线目标、阶段范围、解锁条件。
- 玩家可见文案、页面命名、底部入口。
- 首页核心交互、演化页状态表现、弹层反馈。
- 第一阶段范围与后续长期路线。

当前文档索引：

- `docs/game-design-bible.md`：最高设计约束。
- `docs/main-progression.md`：第一阶段主线推进。
- `docs/first-session-flow.md`：首次游玩节奏。
- `docs/mobile-gameplay-ux.md`：移动端操作与 UI 约束。
- `docs/mobile-ui-prototypes.md`：移动端视觉参考说明。
- `docs/technical-plan.md`：技术路线、存档和 API。
- `docs/project-plan.md`：产品路线和一阶段收口清单。

## 工程结构

```text
apps/
  api/       Fastify API 与 SQLite repository
  web/       React + Phaser 前端
packages/
  game-core/ 核心规则纯函数
  shared/    共享类型
docs/        产品、技术、玩法和移动端决策文档
data/        本地开发存档
```

## API 概览

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

除 `/health` 和 `/auth/guest` 外，存档相关接口需要请求头：

```text
x-guest-key: <guest key>
```
