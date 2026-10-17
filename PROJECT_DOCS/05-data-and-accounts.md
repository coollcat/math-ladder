# 05 · 数据与账号

## 一句话

学习数据全部先落浏览器 localStorage，**按命名空间分空间**（未登录 `:guest`，登录后 `:<用户名>`）；云同步是**可选增强**，只有「部署了 `server/` + 已登录」才生效，其余情况一切照常在本地工作。

## 存储层：六个 key

`src/learning/progress.js` 是进度类数据的**单一事实来源**，其他模块不许再写一份 localStorage 读写。

| key | 写入方 | 内容 |
| --- | --- | --- |
| `ml-progress:<ns>` | `progress.js` ← `enhancer.enhanceProgress()` | 已学完标记（按课路径） |
| `ml-exercises:<ns>` | `progress.js` ← 判题通过 | 练习通过记录 |
| `ml-last:<ns>` | `progress.js` ← `recordVisit()` | 续学位置 |
| `ml-notebook:<ns>` | `notebook.js` | 数学笔记本（多本，每本多单元） |
| `ml-repo:<ns>` | `repo.js` | 代码仓库条目 |
| `ml-snapshot:<ns>` | `backup.js` | 一空间一份快照（误删兜底） |

另外这些不是「学习数据」但同样在 localStorage：`ml-auth`（登录态 `{u,name,token,at}`）、`ml-console`（浮窗多槽位草稿 + 面板位置）、`ml-console-mode`（浮窗/整页偏好）、`ml-auth-fail`（本地失败冷却）、`ml-sync-state`（同步状态缓存）。

**常见坑**：

- `ml-exercise-drafts` 是旧版遗留，**只读兼容**，不要往新代码里写。
- `listSpaces()` 的正则要排除 `ml-snapshot:<ns>`，否则快照键会冒充一个空间。
- 导出备份时用 `peekNotebook` 而不是 `load()`——`load()` 没数据时会自动造一本《我的笔记本》，备份里就永远多一本用户没写过的。
- 跨空间读写 API（`listSpaces / readSpace / writeSpace / clearSpaceNS`、`peekNotebook / writeNotebook`、`peekRepo / writeRepo`）**都要显式传 ns**，避免误读当前空间。
- 写的是「当前打开的空间」时，必须把内存里那份 `data` 置空并重渲染，否则面板还显示旧内容。
- `progress.js` **刻意不 import `full-graph-data.js`**（约 290 KB）：enhancer 每页都跑，引了就打进主包。

## 账号体系

| 形态 | 账号库在哪 | 登录怎么校验 | 账号管理命令 |
| --- | --- | --- | --- |
| **有后端（默认，云同步可用）** | `server/data/accounts.json`（不入库、不进 bundle） | `POST /api/login` | `node server/sync-server.mjs --add-user / --list-users / --remove-user` |
| **纯静态托管** | `src/data/accounts.json`（仍在仓库里，但**前端已不再 import**） | 已不可用；登录页只提示「连不上服务器，已切换到本地模式」 | `node scripts/add-user.mjs`（只为兼容旧部署保留） |

三条安全口径（别改）：

1. **登录失败只有一句**「用户名或密码不对」——绝不区分「没这个账号」与「密码错」，分两句等于把账号名单摆出来让人试。
2. 服务端对「账号不存在」也跑一次诱饵 salt 的等价哈希，两条路径等耗。
3. 限流按 IP 记在服务端内存：第 1–5 次失败都回 401，第 5 次之后进入 30 秒冷却（每轮翻倍、封顶 15 分钟），冷却期间的**第 6 次**才回 `429 too-many`。重启服务清空冷却。

`check-build-auth.mjs` 在出包时按部署形态反向检查：纯静态 → 账号指纹必须进包；云同步 → 产物里搜到账号 salt/hash 就是硬错误。两种形态都查「产物里能不能搜到明文用户名」与「数据面板 chunk 有没有分出来」。

完整口径（能力矩阵、防枚举加固、哈希口径变化要同步改哪两处）见 [REGISTRATION.md](../REGISTRATION.md)。

## 云同步 API 契约

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/login` | `{user, pass}` → `200 {ok, token, user, name}`；失败一律 `401 bad-credentials`；冷却中 `429 too-many` + `retryAfter` |
| POST | `/api/logout` | 吊销当前令牌 |
| GET | `/api/sync` | 拉取当前账号的权威数据 |
| PUT | `/api/sync` | 上传并**服务端合并**，返回合并后的权威版本 |

前端基址由 `src/auth/index.js` 的 `syncApiBase()` 从 `docusaurus.config.js` 的 `customFields.syncApi` 取（默认同源 `/api`，构建时用 `ML_SYNC_API` 覆盖）。同步时机：本地一有改动**防抖 2 秒**后推一次；登录后立即拉一次；失败后至少隔 30 秒再试。单账号数据上限 4 MB（超出回 `413 too-large`）。

### 合并规则（服务端权威，前端本地也实现一份，两边口径必须一致）

1. 进度 / 练习：按键取并集；同一键 true 与 false 冲突时 **true 赢**。
2. 续学位置：`at` 大的赢，一边为空用另一边。
3. 笔记本：以**本子**为粒度，按 `id` 匹配（`id` 不同但 `title` 相同视为同一本），同一本取 `at` 较新的整个覆盖；两边独有的本子都保留；上限 20 本。
4. 代码仓库：按内容去重，同内容留 `at` 新的；上限 200 条。
5. 字段结构不对（不是对象/数组）时丢弃该字段、保留另一边，不整包报错。

### 三条降级纪律（改这块代码时别破坏）

1. 没部署后端 / 后端挂了 / 断网 / 本地 `npm start`，**站点照常能学**——同步模块只是 `syncStatus().state === 'nobackend'`，不报错、不弹异常、不阻断任何操作。
2. 同步失败只标记「有改动没同步」，数据留本地，下次变更或下次登录重试，失败后至少隔 30 秒（不做重试风暴）。
3. 唯一例外是**登录**：账号校验只在服务端，所以没有后端就没有登录。课程、浮窗、判题、进度记录不受影响。

## 数据面板（备份 / 还原 / 搬家 / 快照）

`src/pyrunner/backup.js`，按需动态 import。入口是顶栏右上角「数据」钮（`src/theme/Navbar/DataMenu.js`），快捷键 `Alt+D` / `Alt+Shift+D`（前者常被浏览器吃掉）。早先是右下角第三颗圆钮 `ml-bk-fab`，2026-09-29 搬走。

| 能力 | 说明 |
| --- | --- |
| 导出 | 全部空间 / 单个空间 → `math-ladder-<空间>-<时间戳>.json` |
| 导入 | 默认**合并**（进度取并集、笔记本按本子合并单元、代码按内容去重）；覆盖需二次确认 |
| 空间搬家 | 游客 → 当前账号（源空间保留） |
| 快照 | `ml-snapshot:<ns>`，一空间一份 |

备份文件格式：`{ app:'math-ladder-backup', v:1, at, spaces:{ <空间名>: {progress, exercises, last, notebook, repo} } }`，导入时按备份里记录的空间名还原。

**对用户必须说清**：没有后端替他存，换设备全靠那份 `.json`。

## 论文归档（本地下载链路）

- 流程顺序不能反：`fetch-papers.mjs`（抓进 `static/papers/`）→ `gen-references.mjs`（磁盘上真有文件才写 `@local64`）。
- `static/papers/` 不入库（体积大），`scripts/papers-local.json` 入库。新克隆没有副本时站点自然退化成「全部走原始地址」，不会死链。
- 前端门禁在 `enhancer.js` 的 `paintPdfButton()`：已登录且有归档副本 → 本站文件（`download` 属性）；否则 → 原始地址。登录态变化监听 `ml-auth-changed` 实时换脸。
- 边界：`@pdf64` / `@local64` 是**混淆不是加密**。归档副本构建后是公开静态文件，登录门禁只是产品级入口。

## 本地要测登录

```bat
:: 终端 1：起同步服务并建一个测试号
node server/sync-server.mjs --port 8787 --data ./server/data
node server/sync-server.mjs --add-user devuser 开发 devpass12345 --data ./server/data

:: 终端 2：把前端指到它（不设就走同源，dev server 没有 /api，登录会一直「连不上服务器」）
set ML_SYNC_API=http://127.0.0.1:8787/api && npm start
```

同步服务的启动参数、CORS、nginx 反代尾斜杠等运维细节见 `UNIT_GUIDES/sync-backend.md`；部署与备份见 [deploy/README-部署.md](../deploy/README-部署.md)。