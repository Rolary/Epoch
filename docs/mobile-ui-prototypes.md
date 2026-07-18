# 《生态纪元》移动端视觉参考说明

本文档记录当前认可的移动端视觉方向。参考图用于继承信息层级、操作节奏和游戏感，不要求逐像素还原。

## 1. 参考图索引

| 编号 | 页面 | 文件 | 当前命名 |
| --- | --- | --- | --- |
| 00 | 视觉风格方向 | `docs/references/mobile-ui-prototypes/00-style-direction.png` | 深色潮池、微光、生物感 |
| 01 | 创建生态 | `docs/references/mobile-ui-prototypes/01-create-ecology.png` | 命名生态、源质印记 |
| 02 | 潮池首页 | `docs/references/mobile-ui-prototypes/02-tide-pool-home.png` | 主线、潮池、拖拽养料 |
| 03 | 环境选择 | `docs/references/mobile-ui-prototypes/03-environment-choice.png` | 底部半屏选择 |
| 04 | 物种发现 | `docs/references/mobile-ui-prototypes/04-species-discovery.png` | 第一种生命出现 |
| 05 | 演化路径 | `docs/references/mobile-ui-prototypes/05-evolution-path.png` | 节点路径与可解锁提醒 |
| 06 | 图鉴列表 | `docs/references/mobile-ui-prototypes/06-codex-list.png` | 物种记录 |
| 07 | 物种详情 | `docs/references/mobile-ui-prototypes/07-species-detail.png` | 生态位、影响、谱系 |
| 08 | 源质印记觉醒 | `docs/references/mobile-ui-prototypes/08-talent-awakening.png` | 三选一长期倾向 |
| 09 | 化石遗产 | `docs/references/mobile-ui-prototypes/09-fossil-legacy.png` | 历史沉淀 |
| 10 | 离线收益 | `docs/references/mobile-ui-prototypes/10-offline-return.png` | 回归反馈 |
| 11 | 连接异常 | `docs/references/mobile-ui-prototypes/11-connection-error.png` | 游戏化错误兜底 |
| 12 | 生态档案 | `docs/references/mobile-ui-prototypes/12-settings-save.png` | 身份、成长、状态、存档 |
| 13 | 入口解锁 | `docs/references/mobile-ui-prototypes/13-system-unlock.png` | 新入口奖励反馈 |
| 14 | 生态事件 | `docs/references/mobile-ui-prototypes/14-ecology-event.png` | 事件与选择 |
| 15 | 策略操作 | `docs/references/mobile-ui-prototypes/15-strategy-actions.png` | 操作卡片 |
| 16 | 空状态 | `docs/references/mobile-ui-prototypes/16-empty-state.png` | 世界观空状态 |
| 17 | 首次引导 | `docs/references/mobile-ui-prototypes/17-first-guide.png` | 短提示，不讲长教程 |

## 2. 当前视觉方向

- 深色海底 / 潮池背景，配合蓝、绿、金、紫色微光。
- 主画面要让潮池先被看见，UI 只做覆盖和引导。
- 卡片与弹层保持轻量，不做后台管理风。
- 入口、按钮和节点优先使用图标加短文案。
- 可解锁状态必须比未解锁状态更醒目。

## 3. 当前实现需要遵守

- 首页任务卡每次浏览器打开或刷新后首次进入潮池时自动展示，随后收起到状态栏；同一页面会话内切回潮池时保持收起。
- 顶部资源采用单条潮池状态栏：默认只显示图标与数值，点击单项才展开资源名称；限时水势使用图标叠加动态增益/减益箭头，点击后展开详情。
- 主操作是拖拽发光养料，不是传统点击按钮。
- `日志` 的视觉原型现在解释为 `生命史 / 潮池记忆`。
- `设置与存档` 的视觉原型现在解释为 `生态档案`。
- 空状态必须给下一步引导，不能写 `暂无数据`。
- 专业说明只能作为自然补充，不用设计者前缀。

## 4. 第一章基线与第二章前端优先级

第一章基线继续要求：

1. 保证首页目标清楚：养出第一只生命。
2. 保证拖拽养料顺滑，有入场和出场动效。
3. 保证任务卡收起后不遮挡潮池。
4. 保证演化页已解锁、可解锁、未解锁三态清晰。
5. 保证物种发现弹层有仪式感。
6. 保证生命史和生态档案不像 Web 后台。

第二章新增优先级：

1. 图鉴和物种详情要能看出生态角色与作用。
2. 生态组合反馈要短、明确、世界内。
3. 生态平衡事件仍使用移动端友好的半屏或弹层选择，不做复杂表格。
4. 首页新增生态信息必须轻量，不遮挡潮池主场景。

## 5. 第三章视觉验证方向

第三章暂不生成新视觉资产，先验证现有潮池视觉能否承载“水线扩展”的变化。视觉目标是同一场景中的空间渐变，而不是切换到地图页：

- 浅水继续保持第二章的生态循环中心。
- 潮间湿岩以湿润边缘、附着点和周期性回潮表达，不做独立面板。
- 湿润岸缘以更稀疏的水痕、矿物结面和短暂晒痕表达，必须仍然属于潮池构图。
- 退潮、盐晶和骤雨反馈直接落在水线附近，成为章节事件的可见证据。
- 章节完成时用一次跨水线的往返动效收束，再回到安静的潮池主场景。
- 章节三的关键视觉不是新卡片，而是同一场景里的水线进退、湿岩显隐、岸痕残留和跨栖位回流。
- 新谱系发现优先使用“场景先出现、弹层后记录”的顺序；物种图卡不能遮掉第一次看见它贴岸或回潮的瞬间。
- 岸线事件原型应包含选择前的轻量状态预示和选择后的水线变化，避免把取舍做成静态文字卡。
- 潮池记忆可以用三到四个低饱和场景片段组成短记忆带，表达水线从露出到恢复材料往返的变化，不做完整时间轴面板。

第三章的 UI 仍沿用当前深色潮池、微光、轻量弹层和图标加短文案的方向。正式制作湿岩、岸缘或事件插画前，先确认构图、尺寸和状态用途，再按项目资产流程生成或绘制。
