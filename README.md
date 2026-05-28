# 生态纪元

网页端放置演化游戏。第一阶段「生命诞生篇」已经完成基础闭环：玩家可以从一池还没有生命的水开始，亲手养出第一只生命，并把这段生命史记录下来。当前开发重心转入第二章「生态爆发篇」：让第一种生命在潮池里分化、互相影响，并形成可以延续的小生态。

## 当前路线

- 前端：React 19 + Phaser + Vite，React 负责 HUD、页面、弹层和引导，Phaser 负责潮池场景。
- 后端：Fastify + TypeScript，负责游客身份、权威存档、tick 结算、环境操作和演化解锁校验。
- 核心规则：`packages/game-core`，前后端共用纯函数。
- 存档：使用 PostgreSQL，通过 `DATABASE_URL` 连接托管数据库。
- 内容生成：当前使用本地生成器，真实 AI 接入属于后续扩展。

## 当前开发目标：第二章

第一章已经作为稳定基线保留。第二章玩家侧目标是：

```text
这片潮池已经有了第一种生命。现在让它们分化、互相影响，并形成可以延续的生态循环。
```

第二章核心链路：

```text
追逐光照
-> 分化生产者、分解者、滤食者等早期生态角色
-> 角色组合产生生态反馈
-> 面对生态平衡事件
-> 生命史归纳潮池生态性格
-> 形成第一个小生态循环
```

首页仍不做控制面板。第二章新增内容必须承接第一章生命史，不得把首页改成资源仪表盘。

## 已实现重点

- 第一阶段「生命诞生篇」闭环：从潮池养出第一只生命，并写入图鉴与生命史。
- 创建生态：生态名称 + 源质印记三选一。
- 始源潮池首页：拖拽发光养料进入水中触发催化，积累生命材料，并让低稳定的潮池逐步回稳。
- 主线任务：围绕「养出第一只生命」包装，支持轻量收起。
- 演化页：节点区分已解锁、可解锁、未解锁，可解锁状态有高亮提醒。
- 图鉴：记录发现的物种，物种会影响后续生态。
- 生命史：入口名为 `生命史`，页面名为 `潮池记忆`，合并重复事件为自然记忆。
- 生态档案：替代传统设置页，展示潮池身份、成长记录、当前状态和存档信息。
- 服务端存档：PostgreSQL 数据库，保存游客与 `GameState` 快照。

## 暂不属于当前第二章

- Prisma。
- 正式账号、多设备同步和多人分享。
- 真实 AI 文本或图片生成服务。
- 多地图大世界。
- 正式文明系统、星际生态和复杂谱系报告。

这些能力可以在后续线上化或内容扩展阶段加入，但不能反向挤压第一章清晰开局体验，也不能抢走第二章“形成小生态循环”的主线。

## 开发命令

```bash
corepack pnpm install
corepack pnpm run dev
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run preview:web:host
```

本地地址：

```text
Web: http://127.0.0.1:5173
API: http://127.0.0.1:8787
```

## 存档说明

存档写入 PostgreSQL。开发和部署环境都需要配置：

```text
DATABASE_URL=postgres://...
```

本地开发未设置 `DATABASE_URL` 时会默认连接：

```text
postgres://admin:123456@localhost:5432/epoch
```

生产环境必须从环境变量读取 `DATABASE_URL`。初始化或更新表结构可运行：

```bash
corepack pnpm run db:init
```

DigitalOcean Managed PostgreSQL 使用 SSL。如果生产连接遇到自签证书链，服务端会默认允许该连接；如果要严格校验证书，可额外配置 `DATABASE_CA_CERT` 为数据库 CA 证书内容。

PostgreSQL 中保留轻量结构：

- `guest_saves`：游客与存档的关联。
- `saves`：完整 `GameState` JSON 快照和更新时间。

服务端启动后首次访问存档接口时会自动确保表结构存在。当前没有正式用户，不保留旧 JSON 或 SQLite 存档迁移逻辑。

## 文档同步规则

代码改动触及以下内容时，必须同步检查相关决策文档：

- 存储、API、核心数据结构。
- 主线目标、阶段范围、解锁条件。
- 玩家可见文案、页面命名、底部入口。
- 首页核心交互、演化页状态表现、弹层反馈。
- 第一章基线、第二章范围与后续长期路线。

当前文档索引：

- `docs/game-design-bible.md`：最高设计约束。
- `docs/main-progression.md`：第一阶段主线推进，作为已完成基线保留。
- `docs/second-chapter-progression.md`：第二章「生态爆发篇」开发主线。
- `docs/first-session-flow.md`：首次游玩节奏。
- `docs/mobile-gameplay-ux.md`：移动端操作与 UI 约束。
- `docs/mobile-ui-prototypes.md`：移动端视觉参考说明。
- `docs/technical-plan.md`：技术路线、存档和 API。
- `docs/project-plan.md`：产品路线、当前阶段和收口记录。

## 工程结构

```text
apps/
  api/       Fastify API 与 PostgreSQL repository
  web/       React + Phaser 前端
packages/
  game-core/ 核心规则纯函数
  shared/    共享类型
docs/        产品、技术、玩法和移动端决策文档
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
