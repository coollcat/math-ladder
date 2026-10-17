# PROJECT_DOCS · 文档中心

根目录文档曾散成一片：`AGENTS.md` 53K、`VISION.md` 25K、`ROADMAP.md` 24K、`REGISTRATION.md` 25K、`UNIT_GUIDES/` 17 份实现细节，入口不清、重复、数字互相打架。这一轮把它们重写成**单一入口 + 分层文档**：入口是 [README](../README.md)，硬规则在 [AGENTS.md](../AGENTS.md)，这里放**七份分领域总览**。

原则：**每份只写现在还成立的事实，细节全部外链**。

## 七份文档

| 文档 | 写什么 | 读者 | 什么时候必须改 |
| --- | --- | --- | --- |
| [01-architecture.md](./01-architecture.md) | 站点、内容流水线、客户端交互系统、可选云同步、部署形态；ASCII 架构图；9 条关键不变量；依赖与体积 | 第一次接手仓库的人；要动目录结构的人 | 新增生成物、新增子系统、改数据流方向、换构建管线 |
| [02-content-system.md](./02-content-system.md) | 七卷 79 章、编号规则、front matter 字段表、九段式、四种围栏、三道闸门、**门数口径**、参考资料流程、生产流水线与并发规程 | 写课 / 审课的人 | 编号规则变、闸门增减、口径定义变、新增围栏语言 |
| [03-interaction-system.md](./03-interaction-system.md) | 分派总表、viz/lab 两套可视化、浮窗控制台、判题、测验、笔记本/仓库/公式/补全、数据面板、看见函数；改完的手测清单 | 改 `src/pyrunner/` 与 `src/components/` 的人 | 新增交互围栏、新增面板、切换渲染器归属 |
| [04-design-system.md](./04-design-system.md) | 演算纸×朱砂、样式文件分工、颜色/圆角/动效 token、字体、断点与移动端策略、类名前缀表、z-index 分层、新增 UI 的七条规矩 | 改 CSS / 页面布局的人 | 新增 token、新增断点、新增全局作用域、调 z-index |
| [05-data-and-accounts.md](./05-data-and-accounts.md) | 六个存储 key、存储层 API 与五个常见坑、两种账号形态、云同步 API 与合并规则、三条降级纪律、数据面板、论文归档链路 | 碰数据、账号、同步的人 | 改 key 名、改合并规则、改登录链路、改备份格式 |
| [06-build-and-deploy.md](./06-build-and-deploy.md) | 构建五步、命令与产物对照、出包参数全表、三道出包自检、两种部署形态、最小验收、故障表 | 出包、上线、排障的人 | 改 `package.json` 脚本、改打包参数、改部署步骤 |
| [07-maintenance.md](./07-maintenance.md) | P0/P1/P2 分级、五条文档纪律、文档优先级仲裁顺序、收尾检查清单、已知过时点表、留给未来的四个问题 | 维护者 / 收尾的人 | 每次收尾都可以补一条检查项 |

## 根目录文档怎么定位

| 文件 | 定位 | 不要做什么 |
| --- | --- | --- |
| [README.md](../README.md) | 一页看懂：是什么、三步跑起来、目录与命令、常见问题、文档地图 | 不要往里堆实现细节 |
| [AGENTS.md](../AGENTS.md) | AI 与协作者的**硬规则与踩坑手册**（10 条红线 + 3 个「动手前必读」+ 已知坑 + 工作流） | 不要往里写长表格实现细节——下沉到 `UNIT_GUIDES/` |
| [VISION.md](../VISION.md) | 长期路线：十一层主轴、八条支线、七卷编号总表、能力出口 | 不要改路线内容；进度不写这里 |
| [ROADMAP.md](../ROADMAP.md) | 进度台账：逐章门数、checkbox、剩余缺口 | 门数以命令输出为准，不写死 |
| [LESSON_TEMPLATE.md](../LESSON_TEMPLATE.md) | 写课模板（**单一事实来源**）：九段式、围栏语法、术语表 | 不要在这里记进度 |
| [REGISTRATION.md](../REGISTRATION.md) | 账号、进度命名空间、云同步合并规则、安全边界、防枚举加固 | 不要在这里写部署命令（指向 deploy/） |
| [CONTENT_AUDIT.md](../CONTENT_AUDIT.md) | 发布自检纪律与现行内容口径 | 只留活口，过程报告不入库 |
| [BACKFILL_LOG.md](../BACKFILL_LOG.md) | 未完成缺口台账 + 回填铁律 | 同上 |
| [UNIT_GUIDES/](../UNIT_GUIDES/) | 45 份单章施工手册 + 各子系统实现细节与踩坑档案 | 状态行是写作当时快照，**不作进度依据** |
| [deploy/README-部署.md](../deploy/README-部署.md) | Linux 部署手册：解压→建号→systemd→nginx→验收→备份→排障 | 不要把长期口径抄进来（指向 REGISTRATION） |
| [server/README.md](../server/README.md) | 同步服务自身的启动参数、建号命令、接口、数据文件、老账号平移 | 不要把部署步骤抄进来 |

## 读者路线

```text
第一次来          README → 01-architecture → 想跑起来看 06
要写一门课        02-content-system → LESSON_TEMPLATE → 同章相邻课
要改交互          03-interaction-system → AGENTS「改浮窗」→ UNIT_GUIDES/console-notebook
要改样式          04-design-system → AGENTS「改 UI」→ 对应 .css 头注释
要碰数据/账号     05-data-and-accounts → REGISTRATION
要出包上线        06-build-and-deploy → deploy/README-部署
收尾 / 交接       07-maintenance → ROADMAP → BACKFILL_LOG
```

## 这套文档的分层约定

```text
README.md            一页看懂（≤150 行）
AGENTS.md            硬规则 + 踩坑（300–450 行，动手前通读）
PROJECT_DOCS/*.md    分领域总览（每份 80–200 行，结论 + 指针）
UNIT_GUIDES/*.md     单模块实现细节与坑档案（按需查阅）
代码头注释            为什么这么写（改前必读，最贴近真相）
```

冲突时的取值顺序：**AGENTS.md → VISION.md → ROADMAP.md → LESSON_TEMPLATE.md → PROJECT_DOCS/* → UNIT_GUIDES/***。卷六 / 卷七施工手册声明「与本文件冲突以本文件为准」，但它们不能推翻 AGENTS 的红线。

## 维护这份目录的三条规矩

1. **一份文档只写一层事实**。上层写「是什么、去哪看」，下层写「怎么做、坑在哪」。同一件事只在一个地方定义，别处用链接。
2. **不写死会变的数字**。课数、章数、文件大小一律写「以 `node scripts/validate.mjs` / `node scripts/check-chapter-sync.mjs` / `node scripts/gen-graph.mjs` 最近一次输出为准」；确实需要一个当前值时，同时注明取数命令。
3. **新增文档先登记**。任何新文档都要在上表出现，写清读者与维护触发条件；没有触发条件的文档不该存在，也不会有人更新它。

## 文档之间的依赖关系

写文档时最容易犯的错是「在 A 里重复了 B 的结论，然后只改了一边」。下面这张表说明每份文档**从哪取事实**：

```text
README.md ──────────── 只取「当前规模」与「入口」        ← 数字来自 validate / check:sync
   │
   ├─ PROJECT_DOCS/01  结构事实（有哪些子系统、谁生成什么）   ← 代码目录 + gen-*.mjs
   ├─ PROJECT_DOCS/02  内容事实（口径、字段、闸门）           ← validate / gen-graph / 各章 index
   ├─ PROJECT_DOCS/03  交互事实（分派、契约、坑）             ← src/pyrunner/ 代码与头注释
   ├─ PROJECT_DOCS/04  视觉事实（token、断点、前缀）           ← src/css/ 的 :root 与作用域
   ├─ PROJECT_DOCS/05  数据事实（key、接口、合并规则）         ← progress/auth/sync 与 sync-server
   ├─ PROJECT_DOCS/06  构建事实（管线、参数、部署）            ← package.json / 出包脚本 / deploy/
   └─ PROJECT_DOCS/07  流程事实（分级、纪律、清单）            ← AGENTS.md 的合同与审查条文
```

**判定一条信息该写在哪**：问「它会不会因为一次内容生产就变？」——会，就是进度/数字，只写进 ROADMAP 或命令输出；不会，才是架构事实，才进 PROJECT_DOCS。

## 这一轮改了什么（2026-10 文档重整）

| 动作 | 对象 | 说明 |
| --- | --- | --- |
| 重写 | `README.md` | 3.4K → 9.3K，但**行数从散乱的 54 行变成 125 行**：加了规模表（带现算命令）、站点入口表、常见问题表、完整文档地图 |
| 瘦身 | `AGENTS.md` | 53K / 553 行 → 31K / 328 行。把实现细节整段搬进 `UNIT_GUIDES/`，只留 10 条红线、3 个「动手前必读」、已知坑表、七卷速查、影响面速查、工作流 |
| 新建 | `PROJECT_DOCS/`（8 份） | 架构 / 内容 / 交互 / 设计 / 数据 / 构建 / 维护 + 本文档地图 |
| 保留 | `VISION.md` · `ROADMAP.md` · `LESSON_TEMPLATE.md` · `REGISTRATION.md` · `CONTENT_AUDIT.md` · `BACKFILL_LOG.md` · `UNIT_GUIDES/` | **原文件一字未动**，只在本文档与 README 里给出正确定位与读者对象 |
| 澄清 | 门数口径 | `validate` 的 1191（全量 md 文件）与 `check:sync` 的 1029（正式课）差在哪，写进 [02-content-system.md](./02-content-system.md) 并给出完整推导 |
