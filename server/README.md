# 云同步服务（server/）

零第三方依赖，只用 `node:http / fs / crypto / path`。**后端是可选的增强**：
服务挂了站点照样能学，只是同步不了。默认只监听 `127.0.0.1`，由 nginx 反代 `/api/*`。

## 启动

```bash
node server/sync-server.mjs --port 8787 --data ./server/data   # 默认端口 8787、数据目录 ./server/data
node server/sync-server.mjs --host 0.0.0.0                     # 需要对外直连时才用（不推荐，走 nginx）
node server/sync-server.mjs --help
```

环境变量 `ML_SYNC_PORT` / `ML_SYNC_HOST` / `ML_SYNC_DATA`，命令行参数优先。
`--data` 是相对**当前工作目录**解析的，子命令后面也能带（`--add-user u n p --data ./server/data`）。
服务只往 stdout 打日志（systemd 收进 journald），**不写任何日志文件**。

## 账号管理（走完直接退出，不启服务）

```bash
node server/sync-server.mjs --add-user <用户名> <显示名> <密码>   # 开通 / 重置密码
node server/sync-server.mjs --add-user <用户名> <密码>            # 显示名缺省为用户名
node server/sync-server.mjs --list-users                         # 列出账号与各自数据体积
node server/sync-server.mjs --remove-user <用户名>                # 删账号 + 吊销令牌（数据文件保留）
```

用户名 2–32 位，只允许 `[a-z0-9_-]`（登录时 `trim().toLowerCase()`），密码至少 6 位。
哈希口径与 `scripts/add-user.mjs` 一致：`hash = sha256(salt + ':' + password)`，salt 为 8 字节随机 hex。
账号不存在时也要跑一次诱饵 salt 的等价哈希，所以「没这个账号」与「密码错」耗时一样、返回一样。

## 老账号平移（一次性迁移）

纯静态时代的账号库（`src/data/accounts.json`，只存索引哈希 + salt/hash，不存明文用户名）搬进服务端。
**不迁移的话老账号一个都登不进去**（服务端账号库是空的）：

```bash
node server/sync-server.mjs --import-accounts src/data/accounts.json --names scripts/accounts-index.json --data ./server/data
```

- **salt 与 hash 原样搬运，老密码不用改**（两侧口径一致）；
- `--names` 指向本地明文台账（`scripts/accounts-index.json`，gitignored）：旧库不存明文用户名，
  要用它反推每个索引对应的用户名；台账里查不到的条目会**跳过并列出**，不会瞎猜；
- 已存在的账号默认跳过（覆盖加 `--force`）；
- **一次性命令**，常规建号仍是 `--add-user`。跑完 `--list-users` 核对名单、用老密码登录一次确认。

## 数据文件

```
server/data/accounts.json        账号库 { decoySalt, users:[{user,name,salt,hash,createdAt,updatedAt?}] }
server/data/tokens.json          令牌   { <64位hex>: { user, exp } }
server/data/store/<user>.json    每账号一份 { at, data }，原子写（临时文件 + rename）
```

`server/data/` 已加 `.gitignore`（含账号哈希，不入库）。账号/令牌文件在 POSIX 上权限收紧到 600。

## 接口（`Content-Type: application/json`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/login` | `{user,pass}` → 200 `{ok,token,user,name}`；失败一律 401 `bad-credentials`；冷却中 429 `too-many`+`retryAfter` |
| POST | `/api/logout` | `Authorization: Bearer <token>`；令牌不存在也 200 `{ok:true}` |
| GET | `/api/sync` | 200 `{ok,at,data}`；没数据时 `{ok:true,at:0,data:null}`；令牌无效 401 `unauthorized` |
| PUT | `/api/sync` | `{base,data}` → 200 `{ok,at,data}`（服务端合并后返回权威结果）；超 4 MB 413 `too-large` |

令牌 32 字节随机（64 位 hex），30 天有效，**每次成功请求顺延**，启动时清掉过期的。
合并规则见 `sync-server.mjs` 的 `mergeBundles()`（§3.2 五条）：progress/exercises 并集且 true 赢、
last 取 at 新的、notebook 按本子（先 id 后 title）整本取 at 新的、repo 按 code 去重保留 at 新的、
坏结构只丢该字段不整包报错。**前端 `src/sync/index.js` 必须照抄同一套，否则多端会互相覆盖。**
上限与本服务一致：本子 20、代码条目 200、单账号 4 MB。

## 备份

停服务后整个打包 `server/data/` 即可（`tar czf data-$(date +%F).tgz server/data`）；
不停机也可以，数据文件是原子写的，最多拷到上一版。恢复 = 解包回去再启动。

## 排障

- `/api` 全部 404 → nginx 的 `proxy_pass` 带了尾斜杠会剥掉 `/api` 前缀；本服务路由**带** `/api`，
  nginx 应写 `proxy_pass http://127.0.0.1:8787;`（不带尾斜杠）。
- 端口占用 → 换 `--port`。
- 限流两套：登录连续失败 5 次起冷却（30 秒起翻倍、封顶 15 分钟）；
  另有通用保护，每 IP 每分钟 120 次 `/api` 请求。
