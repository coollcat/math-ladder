# REGISTRATION.md · 账号与进度机制说明

> 本文档面向站点维护者（站内访客看不到任何账号凭据：登录页只留表单）。

## 机制一句话

**账号不搞申请流程，凭据也不在站内公示。** 站内无注册页、无申请页，登录页**不展示任何账号或密码**（账号由站方开通后私下发放）。课程内容、文献页面、浮窗运行与判题对**所有人**开放；论文 PDF 下载分两路：**未登录**点按钮去**原始出处**，**已登录**取**本站归档副本**（`static/papers/`）。进度未登录存**本地游客空间**，登录后存**账号空间**并**自动上云**（换设备跟着账号走）。

**账号库在服务端**（`server/data/accounts.json`），前端 bundle 里不再有任何账号哈希 —— 这是本次云同步改造最大的安全收益。后端是**可选的增强**：不部署它，站点照常是纯静态站，只是登录用不了、数据只存这台浏览器（§账号管理 / §云同步两节分别说清两种形态）。

## 账号管理

**账号校验只在服务端。** 有后端时账号库是服务端那份 `server/data/accounts.json`，前端 bundle 里
一份账号数据都没有。两种部署形态、两套命令，**别混着用**。

### 有后端（默认，云同步可用）

在**服务器上**改，改完立刻生效，**不用重新出包**：

| 操作 | 命令（先 `cd /var/www/math-ladder`） |
| --- | --- |
| 开通 / 重置密码 | `sudo -u www-data node server/sync-server.mjs --add-user <用户名> <显示名> <密码> --data ./server/data`（显示名可省，省略时显示名 = 用户名） |
| 列出账号 | `sudo -u www-data node server/sync-server.mjs --list-users --data ./server/data` |
| 删除账号 | `sudo -u www-data node server/sync-server.mjs --remove-user <用户名> --data ./server/data` |

- `sudo -u www-data` 是必须的：以 root 建号会让文件属主变成 root，服务（以 `www-data` 跑）
  之后追加不进去。
- ⚠️ **`--data` 是相对当前工作目录解析的**，建号时必须和 systemd unit 里那个 `--data`
  指向同一个目录，否则会出现「`--list-users` 看得到这个号，但登录永远 401」。
  显式写上最稳（`--data` 放在子命令后面也认）。
- 用户名限 2–32 位 `[a-z0-9_-]`，登录时规范化为 `trim().toLowerCase()`；落盘前再校验一次
  字符白名单（**防路径穿越**），数据文件名即 `server/data/store/<user>.json`。密码至少 6 位。
- 服务端文件不分发，所以账号库里**存明文 user**（便于 CLI 维护）。文件长这样：

  ```json
  { "decoySalt": "16位hex",
    "users": [ { "user": "明文用户名", "name": "显示名",
                 "salt": "16位hex", "hash": "64位hex", "createdAt": "2026-09-04" } ] }
  ```

  `hash = sha256(salt + ':' + 密码)`（与 `scripts/add-user.mjs` / `src/auth/index.js` 同口径）；
  `decoySalt` 是给「账号不存在」那条路径跑等价哈希用的，**别删** —— 删了响应时间就会
  把账号是否存在泄漏出去。
- 所有写盘都是原子操作（临时文件 + 改名）；`SIGINT` / `SIGTERM` 时先把令牌落盘再退出。

### 无后端（纯静态托管）

**没有后端就没有登录** —— 登录页只会提示「连不上服务器，已切换到本地模式」。
站点其余功能（浏览、浮窗运行、判题、进度记录）**照常全开**，只是数据只留在这台浏览器。

**本地开发要测登录，也得把后端起起来**（dev server 不会自带它）：

```bat
node server/sync-server.mjs --port 8787 --data ./server/data    :: 另开一个终端常驻
set ML_SYNC_API=http://127.0.0.1:8787/api && npm start          :: 再起 dev server
```

不设 `ML_SYNC_API` 时前端按同源 `/api` 走，而 docusaurus dev server 在 3000 端口上并没有
`/api` 这个路由，结果就是登录永远「连不上服务器」。账号先在服务端建好：

```bat
node server/sync-server.mjs --add-user devuser 开发 'devpass12345' --data ./server/data
```

仓库里仍留着旧的那套 [`src/data/accounts.json`](src/data/accounts.json) 与
`scripts/add-user.mjs` 命令，但**前端已经不再 import 它**（账号库不再进 bundle）。
要退回纯静态登录，得把 `src/pages/login.js` 里的 import 加回来 —— 那等于把账号库重新分发给
每一个访客，是本次改造刚消掉的隐患，**不推荐**。真要走这条路，命令与旧口径如下：

| 操作 | 命令 |
| --- | --- |
| 开通 / 重置密码 | `node scripts/add-user.mjs <用户名> <显示名> <密码>`（显示名可省略） |
| 列出账号 | `node scripts/add-user.mjs --list` |
| 查某个用户名开没开通 | `node scripts/add-user.mjs --check <用户名>` |
| 删除账号 | `node scripts/add-user.mjs --remove <用户名>` |
| 旧格式账号库转索引格式 | `node scripts/add-user.mjs --migrate` |
| 换掉用户名索引盐 | `node scripts/add-user.mjs --rotate-salt` |

那份库里**既没有明文密码，也没有明文用户名**（`u = sha256(lookupSalt + ':' + 用户名小写)` 是
用户名索引，`decoySalt` 是账号不存在时用来跑等价哈希的诱饵盐）；明文名单只留在站方本机的
`scripts/accounts-index.json`（**已加 .gitignore，不入库、不进 bundle**）。

⚠️ **这条路改账号必须在本机跑完命令再重新出包** —— 账号是编进 bundle 的，
直接去服务器上改文件不会影响页面上的登录结果。

## 能力矩阵

| 能力 | 未登录（游客空间） | 已登录（账号空间） |
| --- | --- | --- |
| 课程内容浏览、文献页面链接、浮窗运行与即时判题反馈 | ✅ | ✅ |
| 论文 PDF：有归档副本的条目（paper 卡片） | ⬇ 原站下载（跳原始出处） | ⬇ 本地下载（本站 `static/papers/`） |
| 论文 PDF：无归档副本的条目 | ⬇ PDF 下载（原始出处） | ⬇ PDF 下载（原始出处） |
| 练习草稿 / 随手算草稿（浮窗内自动保存） | ✅ | ✅ |
| 学习进度记录（已学完标记、练习通过记录） | ✅ 本地 `:guest` 空间 | ✅ `:<用户名>` 空间 |
| 进度清除 | ✅ 当前空间 | ✅ 当前空间 |

> ⚠️ 账号校验在服务端，所以「已登录」这一列**只在部署了同步服务时成立**；
> 纯静态托管时登录入口不可用，一切按游客处理（课程内容、浮窗运行、判题照样全开）。

## 进度命名空间的实现位置

| 位置 | 职责 |
| --- | --- |
| `src/auth/index.js` | 登录态读写（localStorage `ml-auth`）、自实现 SHA-256（与 node 端 `node:crypto` 算法一致、已做一致性测试）、`userIndex` / `verifyAccount` / `safeEqual`（账号索引与恒定路径校验）、失败节流 `noteFailure` / `failCooldown`、`safeRedirect`（防 open redirect，含 `/\` 规范化绕过拦截） |
| `src/data/accounts.json` | 账号库（`{lookupSalt, decoySalt, users:[{u, salt, hash}]}`，**无明文字段**，构建时打进 bundle；私有部署场景可接受，**不要把生产密码哈希库公开分发**） |
| `scripts/accounts-index.json` | 站方本地明文台账（gitignored，只给 `--list` / `--rotate-salt` 用，**不许进 bundle**） |
| `src/pages/login.js` | 登录页（**不展示账号/密码**，只提示凭据由站方发放；失败只有一句「用户名或密码不对」）；登录成功后跳回 `?redirect=` 指定的站内页面 |
| `scripts/check-build-auth.mjs` | 出包前自检，**两种出包都跑**。它自己认部署形态（扫 `src/` 里还有没有 import `data/accounts.json`）：纯静态 → 账号指纹必须进了 build；云同步 → 反过来，产物里搜到账号 salt/hash 就是硬错误。两种形态都还查「产物里搜不搜得到明文用户名」与「数据面板 chunk 有没有分出来」 |
| `server/sync-server.mjs` | 云同步服务（零第三方依赖）：账号校验、令牌签发、`GET/PUT /api/sync` 的权威合并、按 IP 限流；服务端子命令 `--add-user` / `--list-users` / `--remove-user` |
| `server/data/` | 服务端数据目录：`accounts.json`（账号库）/ `tokens.json`（令牌）/ `store/<user>.json`（每账号数据）。**已加 .gitignore，绝不入库** |
| `src/sync/index.js` | 前端同步模块：拉取 / 推送（防抖 2 秒）、`syncStatus()` 状态、离线静默降级；事件 `ml-sync-changed` |
| `src/pyrunner/enhancer.js` | `progressNS()` / `nsKey()`：进度与练习通过记录按 `ml-progress:<空间>` / `ml-exercises:<空间>` 存储；旧版无命名空间 key 首扫自动迁移到游客空间；文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步 |
| `src/theme/TOCItems/index.js` | 右栏挂件（swizzle wrap）：前置知识面板 + 学习进度条，位于目录上方；与文末进度共用存储 |
| `scripts/references-data.json` + `scripts/gen-references.mjs` | 参考资料条目数据与生成器；PDF 链接以 `@pdf64`（base64）写入条目，避免静态 HTML 源码直接可读（混淆非加密） |
| `scripts/fetch-papers.mjs` + `scripts/papers-local.json` | 论文归档：把条目里的 PDF 抓到 `static/papers/`（**不入库**，见 `.gitignore`），清单只记 URL→文件名/字节数 |

## 论文归档副本（本地下载链路）

```bat
node scripts/fetch-papers.mjs           :: 增量下载（已有跳过 / --force 全量重下 / --check 只体检）
node scripts/gen-references.mjs         :: 把 @local64 + @lsize 写进各章 999-references.md
```

- 清单 `papers-local.json` 入库；体积大的 PDF 不入库，新克隆缺少副本时 `gen-references.mjs` 会**跳过 `@local64`**，站点自然退化成「全部走原始地址」，不会出现死链。
- 现状（2026-09-04 核对）：本机 `static/papers/` 是空的，条目里**没有任何 `@local64`**，
  产物不含归档副本，PDF 按钮一律走原始出处（因此不会出现死链）。要重新开启归档：
  先 `node scripts/fetch-papers.mjs` 抓回 PDF，再 `node scripts/gen-references.mjs` 写回 `@local64`
  （顺序不能反，生成器只在磁盘上真有文件时才写）。`scripts/papers-local.json` 里仍存着
  60+ 条「URL → 文件名」清单，重抓不必重新找源。补源纪律见 AGENTS.md「论文链接纪律」——
  **所有 `@f` 必须是机器验证过、且做过对版核对的链接**（HTTP 200 只证明那里有个 PDF，不证明它是条目要的那篇）。
- 前端门禁在 `enhancer.js` 的 `paintPdfButton()`：已登录 → 本站副本（实线按钮 + `download` 属性）；未登录 → 原始地址（虚线按钮 + 新窗口）。登录态变化时监听 `ml-auth-changed` 实时换脸，不用等路由切换。

## 安全边界（务必知晓）

- 有后端时登录态是一枚**服务端签发的令牌**（存在浏览器 localStorage 的 `ml-auth` 里，30 天有效），
  进度在服务端与本地各有一份。没有后端时退回旧口径：**一切皆本地**，任何人打开 DevTools 都能改写 ——
  这是产品级记录，不是安全边界。
- 账号库不再进 bundle，拿不到 salt+hash 就没法离线暴力破解（相对旧版最大的改善）。
  代价是**服务端文件本身要保护好**：`server/data/` 不入库；备份包别放在 `build/` 下面
  （那是公开静态目录，谁都能下载）；备份文件也不要传到公开网盘。
- 登录令牌拿到手等价于拿到账号。服务端日志**不记密码、不记 token**，但 nginx 的 access log
  会记请求行（URL 里没有 token，token 在 `Authorization` 头里）—— 访问日志同样别公开。
- 论文 PDF 链接在条目中以 base64（`@pdf64` / `@local64`）写入、客户端解码，**这只是让静态 HTML 源码不再一眼可读的混淆，不是加密**。技术用户仍可从 bundle 中还原链接。
- 归档副本 `static/papers/*.pdf` 构建后是**公开静态文件**：登录门禁只是产品级入口（未登录不暴露本站路径），拿到 URL 的人仍可直接下载。**需要保密的文件不要放这里**。
- （下面这条只适用于无后端的纯静态部署）账号库随构建进入 bundle，攻击者拿到 salt+hash 后可离线暴力破解弱密码，
  而且**拿到 bundle 的人仍能离线枚举常见用户名**（用 `lookupSalt` 逐个试算）。
  所以用户名别取 `admin` 这种一猜就中的；想收紧就轮换 `lookupSalt`（`--rotate-salt`）并换掉弱口令。
- 因此：**真正的机密文件不要靠任何前端手段保护**——放在未公开的存储位置，或加服务端鉴权。

## 防账号枚举（2026-09-04 加固）

「能不能从站点上看出有哪些账号」是这套体系的命门。三条泄漏口一起堵（有后端时前两条在服务端实现，
判据不变；第三条因为账号库搬走了，直接从根上没了）：

| 泄漏口 | 以前 | 现在 |
| --- | --- | --- |
| 登录提示 | 「没有这个账号」/「密码不对」两句，试一次就知道名单里有没有 | 只有一句「用户名或密码不对」（**账号不存在与密码错都回 `bad-credentials`**） |
| 响应时间 | 账号不存在直接 return，明显更快 | 不存在时拿诱饵 salt 跑同样一次 SHA-256；两条路径等耗（旧实测比值 0.95） |
| bundle 内容 | `accounts.json` 里就是明文用户名，搜一下得到完整名单 | 有后端：**账号库压根不在 bundle 里**；无后端：只有 `sha256(lookupSalt + ':' + 用户名小写)`，拿用户名反搜不到 |

配套：

- 登录统一延迟 350 ms 再判（顺带拖慢脚本连续试密码）；
- 限流：无后端时是本地的「连续失败 5 次起冷却（30 秒起、翻倍、封顶 15 分钟，状态在 localStorage）」——
  **纯本地防暴力，换台机器或清掉缓存即失效**；有后端时改成**按 IP 记在服务端内存**，清缓存绕不过去。
  服务端口径要记准：**第 1–5 次失败都回 401**，第 5 次失败后进入 30 秒冷却（翻倍、封顶 15 分钟），
  冷却期间的**第 6 次**才回 `429 {"ok":false,"error":"too-many","retryAfter":<秒>}` ——
  「连错 5 次、第 5 次还是 401」是正确行为，不是坏了。冷却状态在进程内存里，**重启服务即清空**。
  两者都别当安全边界，真正的兜底是密码本身要够长；
- 出包前 `node scripts/check-build-auth.mjs` 扫产物。**两种部署形态都跑，判据相反**
  （脚本按 `src/` 里还有没有 import `data/accounts.json` 自动认形态，不用加开关）：
  纯静态 → 账号指纹没进包 = 硬错误；云同步 → 产物里搜到账号 salt/hash = 硬错误。
  两种形态都还查：搜到 ≥7 字符的明文用户名 → 硬错误；短名（如 `admin`）命中 → 警告并打印
  上下文供人工确认（短词容易撞上无关代码里的同名词，直接判死会天天误报）。

## 云同步（2026-09-04 新增）

同步服务是**可选的增强**：部署了它并且登录了，下面这些数据按账号隔离地存到服务端，
换设备自动跟随；没有它，站点照常能学，只是同步不了（但登录也用不了，见上面「无后端」小节）。

### ⚠️ 账号管理命令已经换了

云同步模式下**不要再跑 `node scripts/add-user.mjs`** —— 它写的是 `src/data/accounts.json`，
而前端已经不再 import 那个文件，用它建出来的号在站点上**根本登不进去**（登录只会得到
`bad-credentials`，因为服务端账号库里没这个人）。

| 操作 | 云同步模式（**在服务器上**跑，先 `cd /var/www/math-ladder`） | 纯静态模式（已不推荐） |
| --- | --- | --- |
| 建号 / 改密 | `sudo -u www-data node server/sync-server.mjs --add-user <用户名> <显示名> <密码> --data ./server/data` | `node scripts/add-user.mjs <用户名> <显示名> <密码>` |
| 列出账号 | `sudo -u www-data node server/sync-server.mjs --list-users --data ./server/data` | `node scripts/add-user.mjs --list` |
| 删除账号 | `sudo -u www-data node server/sync-server.mjs --remove-user <用户名> --data ./server/data` | `node scripts/add-user.mjs --remove <用户名>` |
| **平移老账号**（首次上线一次） | `sudo -u www-data node server/sync-server.mjs --import-accounts src/data/accounts.json --names scripts/accounts-index.json --data ./server/data` | 不适用 |

### 首次上线：把纯静态时代的老账号平移过来（2026-09-04 实测）

之前用 `scripts/add-user.mjs` 开通过账号的，凭据还在 `src/data/accounts.json`（salt + 哈希）。
**不迁移的话老账号一个都登不进去**——服务端账号库是空的，登录只会得到 `bad-credentials`。

```bash
# 在项目根目录跑；Windows 上把路径分隔符换成 \
sudo -u www-data node server/sync-server.mjs --import-accounts \
  src/data/accounts.json --names scripts/accounts-index.json --data ./server/data
```

- **老密码全部不用改**：salt 与 hash 原样搬运（两侧哈希口径一致：`sha256(salt + ':' + 密码)`），已实测验证；
- `--names` 指向本地明文台账（`scripts/accounts-index.json`，gitignored）：旧账号库只存索引哈希、
  不存明文用户名，服务端要用台账反推每个哈希对应的用户名；台账丢失的话，查不到名字的账号会被
  **跳过并列出**（不会瞎猜），这些账号只能 `--add-user` 重设；
- 已存在的账号默认跳过，要覆盖加 `--force`；
- 这是**一次性迁移命令**：跑完 `src/data/accounts.json` 与 `scripts/add-user.mjs` 退场
  （纯静态模式下账号系统已不可用），之后建号一律走上面的 `--add-user`；
- 迁移完用 `--list-users` 核对名单，再用老密码登录一次确认能进。

云同步模式改账号**不用重新出包**（账号不在 bundle 里）；纯静态模式改完**必须**重新出包。
`--data` 是相对当前工作目录解析的，建号时务必和 systemd unit 里那个 `--data` 指向同一个目录。

### 同步什么

| 数据 | 内容 |
| --- | --- |
| 学习进度 | 已学完标记 `progress`、练习通过记录 `exercises`、续学位置 `last` |
| 数学笔记本 | 全部本子（含每个单元） |
| 代码仓库 | 全部存档条目 |

时机：本地一有改动，**防抖 2 秒**后推一次；登录后立即拉一次。
单账号数据上限 **4 MB**（超了服务端回 `too-large`，正常使用到不了）。

### 冲突怎么合并（服务端权威）

服务端收到上传后**不是整包覆盖**，而是 `merge(云端, 上传)`，把合并结果作为权威版本存下来并返回，
客户端直接落盘 —— 这样多端同时改不会互相覆盖：

1. **进度 / 练习**：按键取并集；同一键 true 与 false 冲突时 **true 赢**（学过的、通过了的一律不抹掉）。
2. **续学位置**：`at` 大的那条赢；一边为空就用另一边。
3. **笔记本**：以**本子**为粒度 —— 按 `id` 匹配（`id` 不同但 `title` 相同视为同一本，兼容老数据），
   同一本取 `at` 较新的**整个覆盖**；两边各有对方没有的本子**都保留**；上限 20 本，超出按 `at` 从新到旧留。
4. **代码仓库**：按**内容**去重，同内容留 `at` 新的；上限 200 条。
5. 某个字段结构不对（不是对象 / 数组）时**丢弃该字段、保留另一边**，不整包报错。

同一套规则前端本地也实现了一份（离线时先本地合并），**两边口径必须一致**。

### 降级口径（重要）

网络错 / 5xx / 429 / 压根没部署后端，都只是「这次没同步成」：

- 数据**留在浏览器 localStorage 里**，下一次变更或下次登录自动重试；
- 失败后下一次自动尝试**至少间隔 30 秒**（不做重试风暴）；
- 右下角「数据」圆钮显示「有改动没同步」并给「重试」按钮；
- **没有后端时这一行整个不显示** —— 静默降级，不报错、不弹异常、不阻断任何操作；
- 登录时连不上服务器，提示的是「连不上服务器，已切换到本地模式（数据只存这台浏览器）」，
  与「用户名或密码不对」是两句不同的话（后者绝不区分账号是否存在）。

### 服务端数据在哪、怎么备份

```
server/data/
  accounts.json      账号库（服务端私有：明文 user + 密码 salt/hash）
  tokens.json        登录令牌（token → { user, exp }，30 天有效，每次成功请求顺延）
  store/<user>.json  每个账号一份学习数据
```

`server/data/` **已加进 `.gitignore`**（含账号哈希与用户私人数据，绝不入库）。
备份就是打包这一个目录 —— 命令与恢复步骤见 [`deploy/README-部署.md`](deploy/README-部署.md)
的「备份与恢复服务端数据」。写盘是原子操作（临时文件 + 改名），服务重启不丢数据。

> ⚠️ **更新站点时只替换 `build/`。** 整包覆盖 `server/data/` 会把线上账号和所有人的学习数据冲掉。

## 备份、还原与空间搬家（2026-09-04 新增）

**先说清楚：云同步只在「部署了同步服务 + 已登录」时才有。** 纯静态托管、没登录、后端挂了
这三种情况下，登录态、学习进度、笔记本、代码仓库仍然全在浏览器的 localStorage 里，
按空间分开（未登录 `:guest` / 登录后 `:<用户名>`）。所以导出 `.json` 这条离线兜底**必须保留**，
它也是换设备救急的出口。下面几件事的出口都在右下角第三个圆钮「数据」（`src/pyrunner/backup.js`，Alt+D）：

| 场景 | 会碰到什么 | 怎么办 |
| --- | --- | --- |
| 游客学了半天才登录 | 换了抽屉，进度看着像「没了」 | 面板里点「搬到当前账号」（源空间保留，确认没问题再清） |
| 换浏览器 / 换设备 / 清缓存 | 数据全不带走 | 有后端：**在新设备登录同一账号，数据自动拉回来**；没有后端、或想自己留个底：面板里「导出全部空间」→ 得到一份 `.json`，自己收好；到新机器「从备份文件导入」 |

面板能做的四件事：

1. **导出**：全部空间 / 单个空间 → `数学阶梯` 风格的 `math-ladder-<空间>-<时间戳>.json`（含进度、练习记录、续学位置、笔记本、代码仓库）；
2. **导入**：默认**合并**（进度取并集、笔记本按本子合并单元、代码按内容去重，不删现有东西）；「覆盖」会替换同名空间，需二次确认；
3. **空间搬家**：把某个空间的数据合并进当前空间；
4. **快照**：`ml-snapshot:<ns>`，一个空间留一份，误删时可恢复（配额不够时会提示改用导出文件）。

备份文件格式：`{ app:'math-ladder-backup', v:1, at, spaces:{ <空间名>: {progress, exercises, last, notebook, repo} } }`，
导入时按备份里记录的空间名还原（空间名就是 `guest` 或用户名小写）。

## 部署到 Linux

### 带云同步（推荐）

需要 `构建Linux部署包.bat` 默认出的包（zip 里 `build/`、`server/`、`deploy/` 并列，
`server/data/` 账本目录绝不进包），
服务器上**要装 Node 20+**。完整步骤（装 Node → 解压 → 建账号 → 起服务 → 配 nginx → 验收 → 备份）
见 [`deploy/README-部署.md`](deploy/README-部署.md)：

- `deploy/nginx-math-ladder.conf` —— 静态根指向 `build/`，`/api/` 反代到 `127.0.0.1:8787`；
- `deploy/math-ladder-sync.service` —— systemd unit（普通用户运行、`Restart=always`、日志进 journald）。

账号在服务器上用 `sync-server.mjs --add-user` 建，**改账号不用重新出包**。
只改课文或组件时，也只要重新出包替换 `build/`（别碰 `server/data/`）。

### 没有后端（纯静态托管）

产物是纯静态文件，任意静态服务器（nginx / caddy / `python3 -m http.server`）都能托管，
**服务器上不需要 Node、不需要构建**。但**登录用不了**（账号校验在服务端），一切按游客处理。

1. 用 `构建Linux部署包.bat --no-server` 出包（只有 `build/`）；
2. 上传解压，把 `build/` 挂到站点根目录；
3. nginx 配置可用 `deploy/nginx-math-ladder.conf`，但要把 `location /api/ { … }` 那段删掉。

需要重新出包的情况：改课文 / 改组件（以及若你恢复了前端账号库：开通 / 改密 / 删号 / 轮换 `lookupSalt`）。

## 相关文档

- 维护与架构总说明：[AGENTS.md](AGENTS.md)
- 部署手册（含 nginx / systemd 配置与验收步骤）：[deploy/README-部署.md](deploy/README-部署.md)
- 参考资料条目生成：`scripts/references-data.json`（数据）+ `scripts/gen-references.mjs`（生成器）
