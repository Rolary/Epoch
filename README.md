# 生态纪元

网页端放置演化游戏。玩家从一处始源潮池开始，通过催化资源、调控环境、点亮演化节点、发现物种与沉淀化石遗产，见证一颗星球自己的生命史。

> 从潮池到群星，见证一颗星球自己的生命史。

当前版本聚焦第一阶段「生命诞生篇」：完成从资源增长到演化节点、物种发现、图鉴记录、演化日志和长期遗产的基础闭环。

```text
后端存档 -> 资源增长 -> 环境调控 -> 演化节点
        -> 随机生命事件 -> 物种图鉴 -> 化石遗产
```

## 当前状态

已实现：

- pnpm monorepo 工程结构。
- React 19 + Vite 前端。
- Phaser 潮池场景渲染。
- Fastify 后端 API。
- 服务端存档，当前写入 `data/saves.json`。
- 游客身份、本地恢复存档和后端 tick 结算。
- 生态创建流程：命名生态，并从 3 个源质印记中选择开局天赋。
- 资源系统：有机质、能量、矿物质、稳定性、突变、生物量。
- 环境操作：催化、增强光照、矿物沉积、潮汐扰动、提高温度。
- 演化节点解锁、纪元推进和源质印记觉醒。
- 本地物种生成器、图鉴、化石遗产、演化日志和星球性格计算。
- 移动端优先 UI：当前目标、潮池主视窗、底部导航、策略底部面板、弹窗和引导层。

后续计划：

- 将 JSON 文件存档替换为 PostgreSQL + Prisma。
- 扩展物种谱系、生态事件和长期遗产类型。
- 增加关键玩法单测和端到端测试。
- 将本地文本生成器替换为可插拔的 AI 生成服务。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、Zustand |
| 游戏场景 | Phaser |
| 后端 | Node.js、Fastify、TypeScript |
| 包管理 | pnpm workspace |
| 核心规则 | `packages/game-core` 纯函数 |
| 共享类型 | `packages/shared` |
| 当前存储 | `data/saves.json` |

## 快速开始

### 环境要求

- Node.js 20+
- Corepack
- pnpm 10.x

### 安装依赖

```bash
corepack pnpm install
```

### 启动开发环境

```bash
corepack pnpm run dev
```

默认地址：

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:8787

也可以分别启动：

```bash
corepack pnpm run dev:web
corepack pnpm run dev:api
```

## 常用命令

```bash
# 类型检查
corepack pnpm run typecheck

# 生产构建
corepack pnpm run build

# 运行测试
corepack pnpm run test

# 预览 Web 构建
corepack pnpm run preview:web
```

## 项目结构

```text
apps/
  web/              # React + Phaser 前端
  api/              # Fastify API 服务
packages/
  game-core/        # 游戏规则、资源结算、演化、物种与遗产逻辑
  shared/           # 前后端共享类型
docs/               # 产品、技术、玩法和移动端 UI 文档
data/
  saves.json        # 当前开发期服务端存档文件
```

核心职责：

- `apps/web` 负责游戏界面、HUD、页面、弹窗、Phaser 场景和客户端预测显示。
- `apps/api` 负责游客身份、存档读写、权威 tick 结算、环境操作和演化解锁校验。
- `packages/game-core` 放可复用的纯规则函数，供前端预测和后端权威计算共用。
- `packages/shared` 放 DTO、枚举、接口和共享类型。

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `POST` | `/auth/guest` | 创建游客身份 |
| `GET` | `/meta/evolution-nodes` | 获取演化节点配置 |
| `GET` | `/meta/talents` | 获取源质印记目录 |
| `GET` | `/meta/talent-choices` | 获取开局源质印记候选 |
| `GET` | `/saves` | 获取当前游客的存档列表 |
| `POST` | `/saves` | 创建存档 |
| `GET` | `/saves/:saveId` | 读取并结算存档 |
| `POST` | `/saves/:saveId/tick` | 执行权威 tick 结算 |
| `POST` | `/saves/:saveId/actions/environment` | 执行环境操作 |
| `POST` | `/saves/:saveId/evolution/unlock` | 解锁演化节点 |
| `POST` | `/saves/:saveId/talents/select` | 选择源质印记 |
| `GET` | `/saves/:saveId/species` | 获取物种图鉴 |
| `GET` | `/saves/:saveId/logs` | 获取演化日志 |

除 `/health` 和 `/auth/guest` 外，存档相关接口需要请求头：

```text
x-guest-key: <guest key>
```

## 玩法循环

1. 创建生态并选择源质印记。
2. 在潮池中催化资源，推动当前目标。
3. 使用环境操作改变资源产出和生态压力。
4. 消耗资源点亮演化节点，推进生命结构。
5. 触发物种发现，写入图鉴和演化日志。
6. 物种可能形成化石遗产，带来长期加成。
7. 随着关键节点解锁，获得新的源质印记选择。

## 设计文档

- `docs/game-design-bible.md`：游戏设计总纲和不可违背的产品规则。
- `docs/project-plan.md`：完整产品方案和长期方向。
- `docs/technical-plan.md`：技术方案、系统边界、数据模型和 API 设计。
- `docs/main-progression.md`：第一版「生命诞生篇」的主线推进。
- `docs/first-session-flow.md`：首次游玩 10 到 20 分钟体验节奏。
- `docs/mobile-gameplay-ux.md`：移动端操作、引导和 UI 约束。
- `docs/mobile-ui-prototypes.md`：移动端界面原型说明。
- `docs/references/mobile-ui-prototypes/`：移动端 UI 原型参考图。

## 开发约定

- 不做轮回重置；玩家的星球生命史应持续积累。
- 灾变和灭绝不清空成果，应转化为遗产、空位或长期记忆。
- AI 或本地生成器只负责图鉴、日志、命名、描述等内容生成，不决定核心数值平衡。
- 新纪元只增加少量新资源和机制，避免系统一次性膨胀。
- 关键数值规则优先放在 `packages/game-core`，保持前后端共用。
- 前端 Phaser 负责潮池场景，React 负责 HUD、页面、弹窗和引导，不混用职责。

## 数据说明

当前为了快速开发，后端存档使用本地 JSON 文件：

```text
data/saves.json
```

这个文件属于开发期存储方案。未来接入 PostgreSQL/Prisma 时，应尽量保持现有 API 和 `game-core` 规则函数不变，只替换 `apps/api` 的 repository 层。
