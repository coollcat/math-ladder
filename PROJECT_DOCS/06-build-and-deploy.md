# 06 · 构建与部署

## 一句话

一条闸门式构建链：**`validate → check:sync → gen:chapters → docusaurus build → mechanical-audit`**；产物是纯静态文件，服务器只负责发，可选再挂一个零依赖 Node 同步服务。

## 构建管线

```bat
npm run build
  ├─ 1. node scripts/validate.mjs            课程闭环闸门（不过就中止）
  ├─ 2. node scripts/check-chapter-sync.mjs  章节信息同步闸门（不过就中止）
  ├─ 3. node scripts/gen-chapters-data.mjs   重生成 static/graph-chapters/NN.json
  ├─ 4. docusaurus build                     出 build/（Rspack + SWC）
  └─ 5. node mechanical-audit.cjs            机械体检（problems 级阻断，warnings 只告警）
```

**关键：第 3 步只重新拆分图谱课数据，不生成图谱本身。** 改了章名、加了课之后必须**手动**跑 `npm run gen:graph`（它负责 `full-graph-data.js` / `static/prereqs/` / `lesson-count.js`），否则第 2 步会在下一次构建拦下来。`gen:graph` 不在 `build` 里是刻意的——它要写 `src/` 下的源码文件，不该在构建中途改源码树。

| 命令 | 干什么 | 输出 |
| --- | --- | --- |
| `npm run validate` | front matter、id 唯一、prereqs 顺序、方法准入、viz/lab 结构、quiz/exercise 结构、references 一致性 | 终端报告；`✔ N 门课…` |
| `npm run check:sync` | 章首页 ↔ `CHAPTER_INFO` 的 title/short/volume、课数三方对账、`src/` 手写章表回归检查 | `CHAPTER_INFO：78 章 / 1029 门课` |
| `npm run gen:graph` | 扫 `docs/` 生成图谱节点/边/深度 + 章元数据 + 按课 prereq JSON + 课数常量 | `src/components/ml-home/full-graph-data.js`、`static/prereqs/<id>.json`、`lesson-count.js` |
| `npm run gen:chapters` | 把 `full-graph-data.js` 按章拆成 78 个 JSON | `static/graph-chapters/NN.json` |
| `npm run audit` | h2 源/产物比对、Python compile、MDX 塌陷、`input()` / `while True`、viz JSON 校验 | 终端报告（需先有 `build/`） |
| `npm run clear` | 清 `.docusaurus` 缓存 | — |

**机械体检的判据**（`mechanical-audit.cjs`）：每课源文件 `^## ` 行数必须等于 `build/…/index.html` 里的 `<h2` 数量——不相等就是 MDX 塌陷。这是唯一能自动发现「整课塌成纯文本」的手段。它还会一次 Python 进程批量 `compile()` 全部 python/exercise 块；本机没有 python 时自动降级为预警。

## 出包

`构建Linux部署包.bat`（在本机构建、打 zip，服务器上什么都不用装）：

```bat
构建Linux部署包.bat                 :: 默认：体检依赖 → docusaurus build → 自检 → 打 math-ladder-build.zip
构建Linux部署包.bat --no-server     :: 纯静态包（只有 build/，不带 server/ 与 deploy/）
构建Linux部署包.bat --full          :: 构建前先跑 validate（默认跳过以省内存）
构建Linux部署包.bat --skip-install  :: 依赖已完整时跳过安装
构建Linux部署包.bat --force-install :: 强制重装依赖
构建Linux部署包.bat --clear         :: 构建前先 npm run clear
构建Linux部署包.bat --loose         :: 死链检查降为警告（课文还在补写时用）
构建Linux部署包.bat --no-papers     :: 不打进论文 PDF（包从数百 MB 降到几十 MB）
构建Linux部署包.bat --no-auth-check :: 跳过产物自检
构建Linux部署包.bat --no-pause      :: 结尾不暂停（被别的脚本调用时用）
```

环境变量：`NODE_MEM`（Node 堆上限，默认 8192）、`OUT_ZIP`（输出包名）、`NPM_REGISTRY`（默认 npmmirror）。

包内顶层是 `build/ + server/ + deploy/`，**`server/data/`（账号与学习数据账本）绝不进包**——tar 路径靠 `--exclude`、PowerShell 路径靠 robocopy `/XD`，打完还有一道 zip 条目扫描兜底。

出包前的三道自检（`scripts/check-build-auth.mjs`，已串进打包脚本，硬错误中止）：

1. 账号部分——按 `src/` 里还有没有 import `data/accounts.json` 自动认部署形态，两种形态判据**相反**：纯静态 → 账号指纹必须进包；云同步 → 产物里搜到账号数据就是泄漏。
2. 产物里搜不到 ≥7 字符的明文用户名（短名命中只警告并打印上下文）。
3. 数据面板的 chunk 分出来了（否则页面不报错，只是「点了没反应」）。

## 两种部署形态

| | 纯静态 | 静态 + 云同步（推荐） |
| --- | --- | --- |
| 服务器要不要 Node | 不要 | 要（20+，只跑同步服务） |
| 学习数据 | 只存在访客浏览器里，换设备要手动导出 `.json` | 登录后自动上云 |
| 登录 | **不可用**（校验只在服务端） | 可用 |
| 包内容 | `build/`（`--no-server`） | `build/ + server/ + deploy/`（默认） |
| 备份责任 | 无 | **必须定期备份 `server/data/`**，它是唯一账本 |

目标平台：x86_64 Linux / glibc ≥ 2.31（Ubuntu 20.04+ / Debian 11+）。产物是纯静态文件，与服务器 glibc 无关，任意静态服务器（nginx / caddy / `python -m http.server`）都能托管。

部署步骤（装依赖 → 解压 → 建账号 → systemd → nginx → 验收 → 备份）全在 [deploy/README-部署.md](../deploy/README-部署.md)。目录约定三处必须一致：站点根 `/var/www/math-ladder`、静态产物 `/var/www/math-ladder/build`（nginx 的 `root`）、同步服务 `127.0.0.1:8787`。

```bash
# 最小验收（详见部署手册第 6 节）
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1/          # 200 text/html
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1/api/login \
  -H 'Content-Type: application/json' -d '{"user":"nobody","pass":"wrong"}'         # 401 = 后端活着
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1/assets/nope.js  # 404，不能是 200+html
```

**更新站点只替换 `build/`**，绝不要用整包覆盖 `server/data/`——那会把线上账号和所有人的学习数据冲掉。备份就打包 `server/data/` 这一个目录，且**别放在 `build/` 下面**（那是公开静态目录）。

## 常见故障

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| 构建爆堆（`JavaScript heap out of memory`） | Node 堆不够 | 出包脚本里调 `NODE_MEM=16384`；或先 `npm run clear` |
| 构建被安全策略拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`） | 批量删除 >50 文件触发守卫 | 脚本已内置两道保险（覆盖 `NODE_OPTIONS`、旧 `build` 改名挪走而非删除） |
| `npm ci` 被中途杀掉后每次构建都 `Cannot find module` | 留下半截 `node_modules` | 脚本先做完整性体检，只在真缺件时才装；必要时 `--force-install` |
| `docusaurus build` 报死链 | `onBrokenLinks` 默认 `throw` | 补链接；课文还在补写时用 `--loose` 出包（设 `ML_ON_BROKEN_LINKS=warn`） |
| `mechanical-audit` 报 `h2 source≠build` | MDX 塌陷（行内 `\{`/`\}` 或多行 `$$`） | 改 `\lbrace`/`\rbrace`（注意补空格，否则变未定义命令），显示公式一律单行 |
| 出包后登录「连不上服务器」 | nginx 的 `/api/` 段没生效，或 `proxy_pass` 尾斜杠口径错 | 手册第 10 节有直连/走 nginx 的对照排查 |
| 走 nginx 404、直连后端 401 | 前缀问题 | 配置用的是 `proxy_pass http://127.0.0.1:8787;`（不带尾斜杠，原样透传 `/api/login`） |
| 首页 404 但 `/api` 正常 | nginx `root` 指到了上层目录 | `root` 必须指到 `.../build` 这一层 |
| 静态资源 404 而首页正常 | 浏览器缓存了旧 `index.html`，或 `try_files` 把资源也回落了 | 强刷；确认 `location ^~ /assets/` 没被覆盖 |
| `systemctl` 起不来（`203/EXEC`） | unit 里 `ExecStart` 的 node 路径不对 | `command -v node` 查完改 unit，再 `daemon-reload` |
| 服务日志 `EACCES`/`EROFS` | `server/data/` 属主不对 | `chown -R www-data:www-data server/`（CentOS 换 `nginx` 用户） |

Windows 侧的环境坑（PS5.1 的 BOM/GBK、系统代理劫持 localhost、管道重编码、CRLF 正则）见 [AGENTS.md](../AGENTS.md) 的「Windows 环境已知坑」表。
