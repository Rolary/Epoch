# 《生态纪元》第一版技术方案

## 1. 目标

第一版目标是做出可持续开发的网页端放置演化游戏，而不是一次性的静态演示。

核心要求：

- 首屏直接进入游戏体验。
- 支持后端权威存档。
- 保留连续生命史，不做轮回重置。
- AI 只负责图鉴、日志、命名、描述等内容生成，不控制核心数值平衡。
- 前端可以流畅展示资源增长，后端负责最终结算、存档和反作弊基础校验。

## 2. 技术选型

| 模块 | 选型 | 说明 |
| --- | --- | --- |
| 游戏引擎 | Phaser (3/4) + React 19 + TypeScript + Vite | Phaser 负责潮池生态场景（生物、粒子、水波动画），React 负责 HUD 悬浮层和弹窗。 |
| 后端 | Node.js + Fastify + TypeScript | 轻量、性能好、适合游戏 API 和 AI 网关。 |
| 数据库 | PostgreSQL | 适合结构化存档、图鉴、日志和后续分享功能。 |
| ORM | Prisma | 迁移、类型生成和 CRUD 开发效率高。 |
| 状态管理 | Zustand | 桥接 React HUD ↔ Phaser Scene，管理资源、UI 状态和服务器同步。 |
| 存档格式 | PostgreSQL 表 + JSONB 快照 | 关键实体拆表，复杂游戏状态放 JSONB，兼顾扩展和开发速度。 |
| AI 接入 | 后端接口预留，第一版可先用本地生成器 | 以后替换真实模型 API 时不影响前端。 |
| 测试 | Vitest + Playwright | 核心数值用单测，关键页面和存档流程用端到端测试。 |
| 部署 | 前端 Vercel/Cloudflare Pages，后端 Render/Fly.io/Railway，数据库 Supabase/Neon | 第一版优先低运维成本。 |

## 3. 推荐仓库结构

```text
apps/
  web/
    src/
      app/
      components/
      features/
        resources/
        environment/
        evolution-tree/
        codex/
        fossils/
        logs/
      stores/
      api/
      styles/
  api/
    src/
      modules/
        auth/
        saves/
        tick/
        species/
        logs/
        ai/
      plugins/
      routes/
      server.ts
    prisma/
      schema.prisma
packages/
  game-core/
    src/
      resources/
      eras/
      events/
      evolution/
      species/
      tick/
      balance/
  shared/
    src/
      types/
      schemas/
docs/
  project-plan.md
  technical-plan.md
```

目录原则：

- `apps/web` 只负责展示、交互、客户端预测 tick 和调用 API。
- `apps/api` 负责权威结算、保存、读取、AI 网关和数据校验。
- `packages/game-core` 放游戏规则，尽量写成纯函数，方便测试和前后端复用。
- `packages/shared` 放 DTO、枚举、Zod schema 和通用类型。

## 4. 第一版系统边界

### 前端负责

- 游戏主界面。
- 资源数字的平滑增长展示。
- 环境调控操作入口。
- 演化树节点展示和解锁请求。
- AI 图鉴、化石遗产、演化日志展示。
- 本地 UI 状态，例如当前选中的面板、弹窗、排序筛选。

### 后端负责

- 用户或游客身份。
- 存档创建、读取、保存。
- 根据服务器时间计算离线收益。
- 校验资源消耗、节点解锁和环境操作。
- 触发事件、生成物种、写入图鉴和日志。
- AI 文本或本地模拟生成器的统一出口。

### AI 不负责

- 资源产出公式。
- 升级价格。
- 事件概率。
- 惩罚强度。
- 主线纪元解锁条件。

## 5. 数据模型

第一版建议把“游戏快照”和“长期内容资产”分开。

### users

```text
id
guest_key
created_at
updated_at
```

第一版可以先只做游客账号。`guest_key` 保存在浏览器中，用于恢复存档。

### save_slots

```text
id
user_id
name
current_era
last_calculated_at
state_json
created_at
updated_at
```

`state_json` 保存当前资源、环境参数、已解锁节点、进度条、遗产加成等快照。

### species

```text
id
save_slot_id
parent_species_id
name
era
niche
status
traits_json
numeric_effects_json
ai_text_json
created_at
updated_at
```

物种单独成表，方便图鉴、谱系树、状态筛选和后续分享。

### evolution_logs

```text
id
save_slot_id
type
era
payload_json
created_at
```

日志单独成表，方便生命史年表、事件回放和导出。

### fossils

第一版可以先放在 `state_json` 中。等遗产变复杂后再拆表：

```text
id
save_slot_id
source_species_id
name
effect_json
created_at
```

## 6. API 设计

```text
POST /auth/guest

GET  /saves
POST /saves
GET  /saves/:saveId
POST /saves/:saveId/tick

POST /saves/:saveId/actions/environment
POST /saves/:saveId/evolution/unlock

GET  /saves/:saveId/species
GET  /saves/:saveId/species/:speciesId

GET  /saves/:saveId/logs

POST /saves/:saveId/ai/species-draft
```

关键接口说明：

- `POST /saves/:saveId/tick` 是权威结算接口，根据服务器时间和 `last_calculated_at` 计算收益、事件进度和离线收益。
- `POST /saves/:saveId/actions/environment` 用于环境调控，例如增强光照、矿物沉积、潮汐扰动。
- `POST /saves/:saveId/evolution/unlock` 用于演化树节点解锁，后端校验资源和前置节点。
- `POST /saves/:saveId/ai/species-draft` 第一版可以走本地词库生成，后续替换真实 AI。

## 7. Tick 与存档策略

前端可以每秒做预测显示，但权威状态来自后端。

推荐流程：

```text
玩家进入游戏
-> GET /saves/:saveId 获取存档
-> 前端开始本地预测 tick
-> 每 10 到 30 秒 POST /tick 同步一次
-> 玩家执行关键操作时立即请求后端
-> 后端返回权威状态
-> 前端用权威状态校准本地显示
```

离线收益流程：

```text
读取 last_calculated_at
-> 使用服务器当前时间计算离线秒数
-> 限制最大离线收益窗口
-> 按当前资源、节点、物种、遗产计算收益
-> 触发必要事件
-> 更新 state_json 和 last_calculated_at
```

第一版建议最大离线收益窗口为 8 到 12 小时，避免数值失控。

## 8. 游戏核心模块

`packages/game-core` 应优先实现这些纯函数：

```text
calculateResourceDelta(state, elapsedSeconds)
applyEnvironmentAction(state, action)
calculatePlanetProfile(state)
canUnlockEvolutionNode(state, nodeId)
unlockEvolutionNode(state, nodeId)
rollEvent(state, randomSeed)
generateSpeciesTemplate(state, event)
applySpeciesEffects(state, species)
applyExtinctionOrFossilization(state, event)
```

这些函数不依赖数据库、不依赖 HTTP、不依赖 React。这样后端可以权威调用，前端也可以用同一套规则做预测展示。

核心模型应包含：

- 玩家决策张力：稳定性、突变率、生物量、多样性、生态压力。
- 物种生态功能：生态角色、生态位、生态影响、脆弱点、谱系关系。
- 遗产类型：化石遗产、祖先遗产、生态空位、警示遗产、博物档案。
- 纪元推进条件：资源、节点、物种、事件、生态状态的组合判断。
- 星球性格：根据玩家长期选择和事件历史计算倾向，用于影响事件和生成内容。

## 9. AI 生成策略

第一版保留本地生成器，但接口形态按真实 AI 设计。

系统先生成结构化物种数据：

```text
era
lifeType
niche
traits
rarity
numericTemplate
ancestorId
eventContext
planetProfile
```

生成器输出：

```text
name
shortDescription
visualPrompt
habitTags
ecologicalRole
lineageSummary
evolutionLogText
legacyHint
```

替换真实 AI 时，只需要改后端 `ai` 模块，不改前端和游戏核心。

## 10. 第一版开发里程碑

### Milestone 1：项目骨架

- 建 monorepo。
- 初始化 `apps/web`、`apps/api`、`packages/game-core`、`packages/shared`。
- 配置 TypeScript、ESLint、Prettier、Vitest。
- 配置 Prisma 和 PostgreSQL。

### Milestone 2：基础存档

- 游客登录。
- 创建存档。
- 读取存档。
- 后端 tick 结算。
- 前端资源面板和同步校准。

### Milestone 3：核心玩法

- 环境调控。
- 演化树节点解锁。
- 随机事件。
- 物种生成。
- 物种生态角色、生态位、生态影响。
- 稳定性、突变率、多样性、生态压力等决策张力。
- 图鉴写入。
- 演化日志写入。

### Milestone 4：成长资产

- 化石遗产。
- 祖先遗产、生态空位、警示遗产等遗产类型。
- 物种状态转移。
- 图鉴详情弹窗。
- 离线收益结算。
- 基础反作弊校验。
- 多条件纪元推进。

### Milestone 5：体验打磨

- 始源潮池视觉增强。
- 资源增长动画。
- 事件反馈。
- 星球性格展示或半公开提示。
- 存档加载和错误状态。
- Playwright 验证关键流程。

## 11. 开发注意事项

- 不要加入轮回重置。
- 不要让灾变清空玩家成果。
- 不要让 AI 决定核心数值。
- 不要把图鉴做成纯展示，图鉴和遗产都要参与成长。
- 每个新纪元只增加少量新资源，避免系统一次性膨胀。
- 固定主线和随机分支并存，主线保证节奏，随机分支保证差异。
- 存档结构要能承载“这颗星球自己的生命史”。
- 玩家操作要有短期收益和长期代价。
- 纪元推进不要只用单一资源门槛。
- AI 输出必须基于结构化生态事实生成。

## 12. 第一版验收标准

- 玩家可以创建并恢复后端存档。
- 离线一段时间后，重新进入能获得服务器计算的收益。
- 玩家能通过环境操作影响资源和演化方向。
- 至少有一个完整链路：资源增长 -> 解锁节点 -> 触发事件 -> 生成物种 -> 写入图鉴 -> 写入日志。
- 至少有一个灭绝或化石化事件能形成长期遗产。
- 至少有 3 种玩家决策张力会影响玩法，例如稳定性、突变率、多样性、生态压力。
- 生成物种必须包含生态角色、生态位、生态影响和脆弱点。
- 纪元推进至少包含资源、演化节点、物种或事件经历中的 3 类条件。
- 刷新页面不会丢失进度。
- AI 生成模块可以从本地生成器平滑替换为真实模型 API。

## 13. 当前第一版实现记录

本轮已完成一个可运行的第一版骨架。

已实现：

- Monorepo 基础结构：`apps/web`、`apps/api`、`packages/game-core`、`packages/shared`。
- React + Vite 前端主界面。
- Fastify 后端 API。
- 服务端存档，当前使用 `data/saves.json`。
- 游客身份创建。
- 存档创建、读取和 tick 结算。
- 环境调控：增强光照、矿物沉积、潮汐扰动、提高温度。
- 演化树节点解锁。
- 本地物种生成器，包含生态角色、生态位、特性、脆弱点和图鉴描述。
- 化石遗产基础模型。
- 演化日志。
- 星球性格计算。
- 移动端优先 UI：当前目标、始源潮池主视窗、主操作按钮、资源摘要、渐进式底部导航。
- 渐进式 UI 解锁：演化、图鉴、遗产、日志不在开局全量铺开，而是随玩家进度出现。
- 手游操作与引导规范已沉淀到 `docs/mobile-gameplay-ux.md`，后续前端改动应优先遵守该文档。
- 生态创建流程：首次进入需要输入生态名称，并从 3 个随机源质印记中选择 1 个作为开局永久天赋。
- 源质印记系统：已实现 I 阶印记目录、永久产出加成、创建时选择、大节点跃迁后待选择。

当前为了便于快速预览，后端存档先采用 JSON 文件。后续接 PostgreSQL/Prisma 时，应保持 API 和 `game-core` 不变，只替换存储层。

启动方式：

```text
corepack pnpm install
corepack pnpm run dev
```

本地地址：

```text
Web: http://127.0.0.1:5173
API: http://127.0.0.1:8787
```

## 14. 移动端 MVP UI 重构记录

2026-05-09 已按 `docs/mobile-ui-prototypes.md` 的原型方向重做前端第一版体验闭环。

本轮实现重点：

- 创建生态页改为竖屏游戏开局：生态名称 + 3 个源质印记三选一 + 固定底部主操作。
- 潮池首页改为“当前目标 + 大潮池场景 + 主操作 + 少量资源 + 短反馈”，不再按控制面板铺满功能。
- 主操作保持开局可用，点击潮池或“催化”都能推动资源和目标进度。
- 底部导航继续渐进解锁，设置入口常驻，演化、图鉴、遗产、日志随进度出现。
- 演化页改为纵向节点路径，节点有“未满足 / 可点亮 / 已点亮”状态。
- 图鉴、遗产增加游戏化空状态，避免空列表或后台式“暂无数据”。
- 增加连接异常页，用于 API、存档或服务不可达时的兜底反馈。
- 增加设置与本地存档页，可查看当前生态、游客印记、同步状态，并重置本地存档用于测试开局流程。
- 增加新入口解锁弹层、首次引导弹层、生态事件弹层。
- 策略操作改为底部半屏选择，不在首页长期堆叠所有操作按钮。
- `fetchJson` 已调整为只有存在 body 时才设置 `content-type: application/json`，避免空请求体触发 JSON content-type 错误。

本轮验证：

```text
corepack pnpm run typecheck
corepack pnpm run build
```

验证结果：

- TypeScript 检查通过。
- Vite 生产构建通过。
- 所有新增功能均已实现。

---

## 17. 前端技术选型终局：Phaser + React

### 17.1 选型结论

经过 Phaser 与 PixiJS 两个版本的实际原型对比，结合 `docs/references/mobile-ui-prototypes/` 中 18 张 UI 原型图的视觉要求，**最终选择 Phaser + React**。

### 17.2 选型依据

| 维度 | 原型图要求的特征 | Phaser 优势 |
|------|-----------------|------------|
| 中心场景 | 02-潮池首页：活着的生态系统，多只生物游动、水纹波动 | 内置 `ParticleEmitter`、Tween、时间线、混合模式 |
| 粒子光效 | 全场景遍布：飘浮孢粒、光晕脉冲、爆发特效 | `ParticleEmitter` 开箱即用，PixiJS 需手动实现 |
| 场景切换 | 01→02→04→05→09：明确的状态流转 | Scene 系统天然支持场景堆栈和过渡 |
| 核心玩法 | 放置+演化+事件触发，需 tick 循环驱动场景 | 游戏引擎设计范式，Scene.update 天然适合 |
| 视觉分层 | 深色背景 + 网格线 + 水波 + 生物 + 光晕 + 悬浮粒子 | Phaser 的深度/图层管理更匹配 |

**React 的职责边界不变：** React 只负责 HUD（顶部资源栏、底部导航、侧边按钮、弹窗、引导层），不参与 Phaser Canvas 内的任何渲染。

### 17.3 技术栈

| 模块 | 选型 | 说明 |
|------|------|------|
| 游戏引擎 | Phaser 3（若不可用则 4） | 负责中心潮池场景、生物、粒子、动画 |
| UI 框架 | React 19 + TypeScript | 负责 HUD 悬浮层和弹窗 |
| 状态管理 | Zustand | 桥接 React HUD ↔ Phaser Scene |
| 构建 | Vite | 项目打包 |

### 17.4 架构示意

```
┌─────────────────────────────────────────┐
│  React HUD 层 (position:fixed, z-100+)  │
│  ┌─────────────────────────────────┐    │
│  │    顶部资源栏 (TopBar)           │    │
│  ├─────────────────────────────────┤    │
│  │ [侧边按钮]   Phaser Canvas    [侧边按钮] │
│  │             (z-0)              │    │
│  │    ┌───────────────────┐       │    │
│  │    │   潮池生态场景      │       │    │
│  │    │   生物·粒子·水波    │       │    │
│  │    └───────────────────┘       │    │
│  ├─────────────────────────────────┤    │
│  │    底部技能栏 (BottomBar)        │    │
│  └─────────────────────────────────┘    │
│  React Modal / Toast / Guide 层 (z-200+)│
└─────────────────────────────────────────┘
```

---

## 18. 原型图详解与前端还原指引

基于 `docs/references/mobile-ui-prototypes/` 中 18 张原型图，逐页描述视觉特征和实现分工。

> 用 `(P)` 标记 Phaser 负责，`(R)` 标记 React 负责。

### 00 - 视觉风格方向

**视觉特征：** 深色海底调性（墨蓝→黑渐变），生物发光蓝/绿/金色点缀，湿润有机质感。布局为竖屏手机比例，所有 UI 元素悬浮于场景之上，无边框面板（圆角半透明毛玻璃取代表格/方框），按钮为大图标+短文案。

**实现指引：**
- `(R)` 全局 CSS 变量：`--bg-dark: #0D0D1A`，`--accent-blue: #4FC3F7`，`--accent-gold: #FFD54F`，`--accent-green: #66BB6A`
- `(R)` 所有 HUD 面板使用 `backdrop-filter: blur(10px)` + `background: rgba(13,13,26,0.85)` + `border: 1px solid rgba(255,255,255,0.1)`
- `(P)` 场景底色为深渐变，叠加网格线和飘浮微粒营造空间感
- `(P)` 发光效果使用 `BlendModes.ADD`

### 01 - 创建生态

**视觉特征：** 竖屏布局。顶部标题"命名你的生态"，下方为输入框（生态名称）。中部展示 3 张"源质印记"选择卡，每张卡有图标、名称、简短描述。卡片有选中态的发光边框。底部固定"进入潮池"主按钮。

**实现指引：**
- `(R)` 全 React 页面（此时 Phaser 尚未初始化或隐藏）
- `(R)` 3 张印记卡使用圆角卡片 + 发光选中边框 + 选中缩放动画
- `(R)` 底部按钮固定，使用金色渐变发光样式
- `(R)` 选择后按钮文案变化：如"携带「深源印记」进入潮池"

### 02 - 潮池主界面（核心游戏屏）

**视觉特征：** 中心为一个大面积潮池生态场景——可见水纹波动、微小生物游动、光柱从上方射入水中、底部有沉积物纹理。场景上方覆盖当前目标（如"让能量达到 200"）、少量关键资源数值。底部中央一个大的"催化"主操作按钮。

**实现指引：**
- `(P)` **整个中心区域由 Phaser 渲染**，包括：
  - 水纹波动（正弦波叠加，`Graphics.fillPath`）
  - 生物实体（`Container` + 子 `Graphics` 组合：身体+头部+眼睛+附肢）
  - 光柱（半透明梯形 + 粒子飘浮）
  - 底部沉积物（不规则多边形填充）
  - 漂浮资源球（绕中心旋转的小圆形，颜色区分资源类型）
  - 粒子系统：环境浮尘、光晕脉冲
- `(R)` **顶部资源栏**：4 项资源（⚡能量 🌿生物量 🎨多样性 🛡️稳定性），每项 = 图标 + 数值 + 小标签
- `(R)` **当前目标**：位于资源栏下方，半透明胶囊条，显示当前阶段目标+进度
- `(R)` **底部技能栏**：催化按钮居中且最大（金色发光），演化/图鉴/遗产/设置按钮等距环绕
- `(R)` 渐进解锁的底部图标入口（演化→图鉴→遗产→日志）

### 03 - 环境选择

**视觉特征：** 从底部滑出的半屏选择面板。2-3 个策略选项以卡片形式展示，每张包含图标、名称、效果预览（分"短期收益"和"长期代价"两行）。选中后卡片发光，确认按钮在面板底部。

**实现指引：**
- `(R)` 底部半屏 Sheet（`transform: translateY` 动画滑入）
- `(R)` 每张策略卡：左侧图标、中间标题+收益/代价描述、选中态右边框发光
- `(P)` 选中环境操作后，场景播放对应视觉反馈（如选择"增强光照"→场景亮度短暂提升+光柱增多）

### 04 - 物种发现

**视觉特征：** 全屏弹层，深色半透明遮罩。中央展示新发现的物种形态图（大图）。物种名称大字体居中，下方生态标签（如"浅海·滤食者"）。底部"收录图鉴"按钮引导下一步。

**实现指引：**
- `(R)` 全屏 Modal：半透明深色遮罩 + 中央内容卡片
- `(P)` 弹层弹出时，Phaser 场景可播放发现粒子爆发特效作为背景
- `(R)` Modal 内容包含物种图标占位、名称、生态标签、稀有度标识

### 05 - 演化路径

**视觉特征：** 纵向节点路径。每个节点为圆形 + 连线，节点状态用颜色区分：灰色（未满足）、半亮（可点亮）、亮色（已点亮）。节点旁有简短名称。底部显示点亮条件和消耗。

**实现指引：**
- `(R)` 纵向滚动节点列表，节点用圆形 `div` + 竖线连接
- `(R)` 三态样式：未满足 `rgba(255,255,255,0.2)`，可点亮 `box-shadow: glow-blue`，已点亮 `accent-green`
- `(R)` 点击可点亮节点弹出确认弹窗，显示解锁条件和消耗

### 06 - 图鉴列表

**视觉特征：** 可滚动的生物卡片列表。每张卡片包含物种剪影/图标、名称、稀有度星标、发现时间。卡片有圆角和暗色底。空状态时显示"潮池仍在孕育生命"等世界观引导，而非"暂无数据"。

**实现指引：**
- `(R)` 全 React 二级页面，`overflow-y: auto` 滚动列表
- `(R)` 物种卡片使用 `linear-gradient` 背景 + 稀有度边框色
- `(R)` 空状态特殊处理：显示引导文案 + 返回潮池按钮

### 07 - 物种详情

**视觉特征：** 物种形态大图居中。名称+学名、生态标签行、能力影响数值（如"光合效率 +15%"）、谱系关系（祖先→当前物种的连线图）、生态角色描述文本。

**实现指引：**
- `(R)` 全 React 详情页
- `(R)` 生态标签使用彩色小徽章
- `(R)` 谱系关系用简单横向节点连线图

### 08 - 源质印记觉醒

**视觉特征：** 类似 01-创建生态的三选一布局。在演化路径大节点点亮后触发。3 个永久天赋选择，每张有图标、名称和效果描述。选中后无法撤销。

**实现指引：**
- `(R)` 全屏 Modal，三选一卡片布局
- `(R)` 选择后播放确认动画，卡片放大后消失，更新全局天赋状态

### 09 - 化石遗产

**视觉特征：** 遗产列表，每项为横向卡片：左侧化石图标、右侧遗产名称+来源物种+永久效果描述。卡片有古朴/石刻质感。空状态时引导"等待第一个物种走完生命历程"。

**实现指引：**
- `(R)` 全 React 列表页，横向卡片布局
- `(R)` 遗产卡片使用石头/化石纹理背景色 + 边框
- `(R)` 每张卡标注来源物种和加成效果

### 10 - 离线收益

**视觉特征：** 回归时弹层。顶部显示离线时长，中部列出离线期间获得的资源（能量+N、生物量+N），底部"收取"按钮。整体有"欢迎回来"的温馨语气。

**实现指引：**
- `(R)` 全屏 Modal
- `(R)` 资源列表用数字跳动动画展示增加值
- `(R)` 收取后资源数字平滑过渡到新值

### 11 - 连接异常

**视觉特征：** 全屏暗色背景，中央断裂/裂缝图标，标题"生态链接中断"，副标题引导用户检查网络或稍后再试。底部"重试"按钮。保持游戏世界感，不出现浏览器默认错误页。

**实现指引：**
- `(R)` 全 React 页面，替换整个界面
- `(R)` 使用游戏化世界观文案，避免技术错误术语
- `(R)` 重试按钮调用 API 健康检查

### 12 - 设置与存档

**视觉特征：** 当前生态名称、游客印记 ID、同步状态标签（已同步/同步中/未同步）、应用版本号。底部"重置本地存档"红色按钮。

**实现指引：**
- `(R)` 全 React 设置页
- `(R)` 同步状态使用不同颜色标识
- `(R)` 重置按钮需要二次确认弹窗

### 13 - 系统解锁

**视觉特征：** 弹出式奖励反馈。当演化/图鉴/遗产/日志等新功能解锁时，从顶部或中央弹出通知：图标+名称+"已解锁"。短暂停留后自动消失。

**实现指引：**
- `(R)` Toast/Notification 组件，从顶部滑入
- `(R)` 左侧系统图标 + 右侧"XX 已解锁"文案
- `(R)` 2-3 秒后自动滑出消失

### 14 - 生态事件

**视觉特征：** 随机事件弹层。事件名称+描述+图示。提供 2-3 个选项，每个选项标注效果（短期收益+长期代价）。有时限或一次性选择。

**实现指引：**
- `(R)` 全屏 Modal，事件标题+描述+选项按钮
- `(R)` 每个选项按钮展示效果文本
- `(P)` 选中后在场景中播放对应视觉反馈

### 15 - 策略操作

**视觉特征：** 底部半屏选择面板。2 列网格布局的操作卡片，如"增强光照"、"矿物沉积"、"潮汐扰动"、"提高温度"。每张卡有图标+名称+简要效果。点击后弹出确认。

**实现指引：**
- `(R)` 底部 Sheet，2 列网格
- `(R)` 每张操作卡显示图标+名称+效果简述
- `(R)` 点击弹出确认弹窗（展示详细收益和代价）
- `(P)` 确认后 Phaser 场景播放环境变化反馈

### 16 - 空状态

**视觉特征：** 图鉴为空时显示"潮池仍在孕育生命"；遗产为空时显示"等待第一个物种走完生命历程"；日志为空时显示"演化历史将在此记录"。每个空状态都有引导文案和返回按钮，保持游戏世界感。

**实现指引：**
- `(R)` 在每个列表页检测数据为空时，渲染特殊空状态组件
- `(R)` 空状态组件包含：世界感图标 + 引导文案 + 返回主场景按钮
- `(R)` 绝不出纯文字"暂无数据"

### 17 - 首次引导

**视觉特征：** 首次进入新功能时，半屏遮罩+短提示框。包含功能名称、一句话说明、确认按钮。不超过 3 行文字。点击确认后进入功能页面。

**实现指引：**
- `(R)` `GuideOverlay` 组件，半透明背景 + 中央白色提示卡
- `(R)` 文案控制在 2-3 句内
- `(R)` 每个功能仅在首次访问时触发一次
- `(R)` 引导状态存入 localStorage 防止重复弹出

---

## 19. 前后端分工总结

### React 负责（纯 UI，不碰 Canvas）

| 组件 | 说明 |
|------|------|
| `TopBar` | 顶部资源栏，4 项资源，半透明毛玻璃 |
| `BottomBar` | 底部技能栏，催化+演化+图鉴+遗产+设置 |
| `SideButtons` | 左右侧悬浮功能按钮 |
| `GameModal` | 通用弹窗（物种发现、离线收益、生态事件等） |
| `GuideOverlay` | 首次引导半屏提示 |
| `Toast` | 系统解锁通知 |
| `BottomSheet` | 环境选择/策略操作底部半屏面板 |
| `EvolutionPage` | 演化路径纵向节点图 |
| `CodexPage` | 图鉴列表+物种详情 |
| `FossilPage` | 化石遗产列表 |
| `SettingsPage` | 设置与存档管理 |
| `ErrorPage` | 连接异常兜底页 |

### Phaser 负责（游戏场景，不碰 DOM）

| 场景 | 内容 |
|------|------|
| `HomeScene` | 潮池生态：水波+光柱+沉积物+生物+漂浮资源球+粒子系统 |
| `(future) EventScene` | 事件触发的视觉特效场景 |
| `(future) TransitionScene` | 场景过渡动画 |

### Zustand Store 桥接

```typescript
// Phaser Scene 读取 React 状态
const { isCatalyzing, resources } = useGameStore.getState();

// React 组件触发 Phaser 行为
const catalyze = () => {
  set({ isCatalyzing: true });  // Phaser update() 检测到此状态后播放爆发粒子
  setTimeout(() => set({ isCatalyzing: false }), 500);
};
```

### 文件结构

```text
apps/web/
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # 根组件：Phaser Canvas + HUD
│   ├── phaser/
│   │   ├── config.ts              # Phaser 配置
│   │   └── scenes/
│   │       └── HomeScene.ts       # 潮池主场景
│   ├── components/
│   │   ├── hud/                   # HUD 组件
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomBar.tsx
│   │   │   └── SideButtons.tsx
│   │   ├── modals/               # 弹窗组件
│   │   │   ├── GameModal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   └── GuideOverlay.tsx
│   │   └── pages/                # 二级页面
│   │       ├── EvolutionPage.tsx
│   │       ├── CodexPage.tsx
│   │       ├── FossilPage.tsx
│   │       ├── SettingsPage.tsx
│   │       └── ErrorPage.tsx
│   ├── stores/
│   │   └── gameStore.ts           # Zustand 状态管理
│   └── styles/
│       └── hud.css                # HUD 样式（毛玻璃、发光、动画）
```
