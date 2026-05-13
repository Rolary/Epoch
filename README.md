# 生态纪元

网页端放置演化游戏。主概念是：

> 从潮池到群星，见证一颗星球自己的生命史。

项目计划覆盖从生命起源到最终文明与星际生态的演化过程。第一版聚焦“生命诞生篇”，目标是让玩家亲手见证第一批生命如何从始源潮池中出现，并验证完整闭环：

```text
后端存档 -> 资源增长 -> 环境调控 -> 演化节点 -> 随机事件 -> 物种图鉴 -> 化石遗产
```

## 开发

```bash
corepack pnpm install
corepack pnpm run dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:8787

当前第一版后端存档使用服务端 `data/saves.json`，API 形态按后续 PostgreSQL/Prisma 版本设计。

## 设计文档

- `docs/game-design-bible.md`：游戏设计总纲，定义不可违背的产品规则。
- `docs/main-progression.md`：第一版“生命诞生篇”的线性主线推进。
- `docs/first-session-flow.md`：首次游玩 10 到 20 分钟的体验节奏。
- `docs/project-plan.md`：完整产品方案和长期方向。
- `docs/mobile-gameplay-ux.md`：移动端操作、引导和 UI 约束。
