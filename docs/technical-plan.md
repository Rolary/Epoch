# 《生态纪元》技术方案

## 1. 技术结论

第一阶段「生命诞生篇」与第二章「生态爆发篇」已经完成基础闭环，第三章「海陆分化篇」进入开发启动阶段。当前技术路线将前两章作为稳定回归基线，继续使用 React + Phaser + Fastify + PostgreSQL 架构。

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
- 未收取养分最多积累 5 小时；达到容量后服务端与前端预测都停止增加，回归弹层和首页收集入口显示“潮池已满”。
- 离线超过 10 分钟且潮池已有演化痕迹时，服务端会生成一段限时“离线水势”；其资源倍率、开始与结束时间写入存档，前端回归弹层说明完整现象与影响，首页以紧凑状态签显示效果和剩余时间。
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

## 9. 第二章完成基线

- UI 状态包含统一叙事队列，按优先级串行展示生态事件、物种发现、章节见证、入口解锁与章节完成；已读状态在弹层完成关闭后写入。
- 待选择的源质印记属于必须完成的叙事节点，不能通过遮罩或关闭按钮跳过；演化解锁产生的物种发现和印记选择统一进入叙事队列。
- 第二章调试存档提供七个阶段切片，`smoke:chapter2` 默认逐一校验，不改变正式存档结构或生产 API。
- Phaser 首页依据真实角色和章节见证绘制受光浅层、池底分解、滤食水纹、失衡浑浊与循环环，不新增常驻生态面板。
- 移动端交付图保留 PNG 路径兼容，角色图长边 512、事件图长边 600、背景长边 960；高分辨率原图继续保存在 `original-ui`。
- Phaser/WebGL 场景纹理固定使用 Vite 打包的同源资源，避免数据库远程图片缺少 CORS 响应头时出现绿色缺失纹理；React 图片仍保留数据库与远程映射能力。

## 10. 第三章开发启动技术约束

第三章的设计基线见 `docs/third-chapter-progression.md`，阶段执行顺序见 `docs/third-chapter-build-plan.md`。当前已实现共享章节/栖位类型、第三章见证与派生进度、首批节点和事件，并提供非生产环境 `POST /debug/third-chapter-save` 的 `exposed / shore / event / exchange` 切片；开发模式可用 `?debugChapter3=event` 等查询参数进行非持久化视觉验收。其余技术边界保持如下：

- 继续使用单一 `GameState` JSON 快照，不为浅水、潮间湿岩和湿润岸缘创建独立存储表或独立存档。
- 在 `packages/shared` 增加第三章章节标识、阶段和见证结构；`normalizeGameState` 为旧第一章、第二章存档补齐缺失字段，不自动生成岸线物种或岸线历史。
- 物种继续同时表达生态角色和栖位。栖位应使用受约束的结构化标识或等价标签，玩家侧的 `niche` 文本仍由已确定的生态事实生成。
- 不新增资源类型。岸线压力优先由现有潮汐、温度、稳定性、波动、历史标签、物种状态和遗产效果推导。
- 节点、岸线事件和岸线回响优先复用现有演化解锁、生态事件和回响 API；只有无法表达玩家选择时才新增最小接口。
- 所有概率、成本、惩罚、解锁条件和谱系生成都由 `packages/game-core` 的纯函数决定。AI 或本地生成器只能包装已经确定的物种和生命史事实。
- 第三章必须有独立的 `smoke:chapter3` 调试切片，且 `smoke:chapter2` 不依赖第三章字段或阶段。

第三章继续按“共享类型和归一化 -> 核心规则和测试 -> Phaser 水线反馈 -> React 主线与生命史 -> 浏览器和移动端验收”的顺序推进。当前只完成第一步和首个调试切片，不把尚未实现的场景、事件或完整章节标记为完成。

## 11. 已接入技术方向：隐秘潮痕

隐秘潮痕的玩家和设计规则见 docs/hidden-achievements-and-easter-eggs.md。首发共享状态、服务端判定、评分、发现反馈和潮池记忆展示已经接入。

- 继续使用单一 GameState JSON 快照；旧存档通过 normalizeGameState 补齐空的隐藏记录。
- 共享状态建议增加可选的 hiddenTraces：已解锁 ID、内部进度和已经结算的隐藏分数。
- packages/game-core 负责根据环境操作、tick、演化、生态事件和输入交互评估条件；客户端不能直接提交解锁事实。
- 服务端只返回已解锁记录和当前发现反馈，不返回未解锁候选列表。
- 评分由现有生态评分函数统一汇总，隐藏加分设置固定值和总上限，不能压过纪元、演化、物种、遗产和印记评分。
- 前端复用现有 Phaser 反馈、React 叙事队列和潮池记忆入口；首次解锁前不增加常驻入口或占位 UI。
- 输入型彩蛋必须提供移动端等价手势，不得让移动玩家无法完成首批内容。
- 测试必须覆盖准确触发、防误触发、重复不重复计分、旧存档归一化、评分上限和未解锁信息不泄露。
