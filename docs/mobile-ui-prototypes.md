# 《生态纪元》移动端 UI 原型参考

本文档记录当前认可的移动端视觉方向。后续前端改版应优先参考这些原型，而不是继续沿用控制面板式布局。

## 原型清单

| 编号 | 页面 / 状态 | 图片 | 用途 |
| --- | --- | --- | --- |
| 00 | 视觉风格方向 | [00-style-direction.png](./references/mobile-ui-prototypes/00-style-direction.png) | 确认整体气质：手机竖屏、游戏化、生态湿润感、少面板。 |
| 01 | 创建生态 | [01-create-ecology.png](./references/mobile-ui-prototypes/01-create-ecology.png) | 开局输入生态名称，并从 3 个源质印记中选择 1 个。 |
| 02 | 潮池主界面 | [02-tide-pool-home.png](./references/mobile-ui-prototypes/02-tide-pool-home.png) | 第一核心屏：一个主场景、一个当前目标、一个主要操作。 |
| 03 | 环境选择 | [03-environment-choice.png](./references/mobile-ui-prototypes/03-environment-choice.png) | 策略操作以选择卡出现，强调取舍，而不是参数按钮堆叠。 |
| 04 | 物种发现 | [04-species-discovery.png](./references/mobile-ui-prototypes/04-species-discovery.png) | 新物种出现时用奖励式弹层承接，并引导图鉴解锁。 |
| 05 | 演化路径 | [05-evolution-path.png](./references/mobile-ui-prototypes/05-evolution-path.png) | 演化页面使用节点路径和进度环，避免完整科技树一次铺满。 |
| 06 | 图鉴列表 | [06-codex-list.png](./references/mobile-ui-prototypes/06-codex-list.png) | 图鉴使用可收藏、可浏览的生物卡片列表。 |
| 07 | 物种详情 | [07-species-detail.png](./references/mobile-ui-prototypes/07-species-detail.png) | 物种详情突出形态图、生态标签、能力影响和谱系关系。 |
| 08 | 源质印记觉醒 | [08-talent-awakening.png](./references/mobile-ui-prototypes/08-talent-awakening.png) | 大节点升级后的永久天赋三选一。 |
| 09 | 化石遗产 | [09-fossil-legacy.png](./references/mobile-ui-prototypes/09-fossil-legacy.png) | 灭绝与历史沉淀用遗产卡表现，让失败变成长期构筑。 |
| 10 | 离线收益 | [10-offline-return.png](./references/mobile-ui-prototypes/10-offline-return.png) | 回归奖励用收取弹层表现，强化“生态仍在演化”。 |
| 11 | 连接异常 | [11-connection-error.png](./references/mobile-ui-prototypes/11-connection-error.png) | API、存档或网络异常时的游戏化兜底状态。 |
| 12 | 设置与存档 | [12-settings-save.png](./references/mobile-ui-prototypes/12-settings-save.png) | 查看当前生态、游客印记、同步状态和本地重置入口。 |
| 13 | 系统解锁 | [13-system-unlock.png](./references/mobile-ui-prototypes/13-system-unlock.png) | 演化、图鉴、遗产等新入口出现时的奖励反馈。 |
| 14 | 生态事件 | [14-ecology-event.png](./references/mobile-ui-prototypes/14-ecology-event.png) | 潮汐、温度、矿物暴露等临时事件的短选择。 |
| 15 | 策略操作 | [15-strategy-actions.png](./references/mobile-ui-prototypes/15-strategy-actions.png) | 日常生态干预以少量选择卡呈现，而不是参数面板。 |
| 16 | 空状态 | [16-empty-state.png](./references/mobile-ui-prototypes/16-empty-state.png) | 图鉴、遗产、日志为空时仍保持世界观和游玩引导。 |
| 17 | 首次引导 | [17-first-guide.png](./references/mobile-ui-prototypes/17-first-guide.png) | 首次进入新系统时使用半屏短提示，避免长教程。 |

## 视觉落地原则

- 首屏必须像游戏主界面：中心是活着的潮池场景，而不是数据面板。
- 主操作使用大图标 + 小字说明，按钮文案保持 2 到 4 个字。
- 资源只显示当前目标需要理解的少量关键值，复杂数值放到二级页面或详情里。
- 新系统通过事件、奖励、发现、节点点亮逐步出现，禁止开局全量铺开。
- 页面切换以底部图标入口承载，入口数量随游戏进度渐进解锁。
- 卡片用于选择、发现、奖励和图鉴条目，不用于把整个首页拆成管理后台。
- 每个关键页面都要有明确的“下一步”：催化、点亮、收录、铭刻、收取。
- 异常、空状态和设置页也要保持游戏世界感，不能退回浏览器报错页或后台管理风格。

## 第一版前端改版优先级

1. 重做创建生态流程：生态名称 + 源质印记三选一。
2. 重做潮池首页：大场景、大主操作、当前目标、短反馈。
3. 重做渐进导航：只在条件满足后出现演化、图鉴、遗产、日志。
4. 重做演化页：节点路径替代表格式节点列表。
5. 重做奖励弹层：物种发现、源质印记觉醒、离线收益。
6. 重做图鉴和物种详情：把物种作为收集内容，而不是日志数据。
7. 补齐体验闭环：连接异常、系统解锁、生态事件、空状态、设置与本地存档管理。

## 文案与图像说明

这些图片是 UI 原型，不要求前端逐像素还原；需要继承的是信息层级、操作节奏和游戏感。图片中的中文文案如果不够准确，以 `docs/mobile-gameplay-ux.md` 和后续实际设计文案为准。
